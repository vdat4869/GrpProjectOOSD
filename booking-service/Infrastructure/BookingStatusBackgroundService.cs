using BookingService.Data;
using BookingService.Repositories;
using BookingService.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace BookingService.Infrastructure
{
    public class BookingStatusBackgroundService : BackgroundService
    {
        private readonly ILogger<BookingStatusBackgroundService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IRabbitMQService _rabbitMQService;

        public BookingStatusBackgroundService(IServiceScopeFactory scopeFactory,
                                              IRabbitMQService rabbitMQService,
                                              ILogger<BookingStatusBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _rabbitMQService = rabbitMQService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");

                    using (var scope = _scopeFactory.CreateScope())
                    {
                        var bookingRepository = scope.ServiceProvider.GetRequiredService<IBookingRepository>();

                        var allBookings = await bookingRepository.GetAllAsync();

                        foreach (var booking in allBookings)
                        {
                            var hoursBeforeStart = (booking.StartTime - now).TotalHours;

                            // Pending → Confirmed nếu ≤ 4h trước startTime  
                            if (booking.Status == "Pending" && hoursBeforeStart <= 4 && hoursBeforeStart > 0)
                            {
                                booking.Status = "Confirmed";
                                _logger.LogInformation("Booking {BookingId} auto-confirmed", booking.Id);
                                _rabbitMQService.PublishEvent("booking.auto-confirmed", new { BookingId = booking.Id });
                            }

                            // Confirmed → InProgress khi check-in gần giờ (±5 phút)  
                            if (booking.Status == "Confirmed" && !booking.CheckInTime.HasValue)
                            {
                                if (now >= booking.StartTime.AddMinutes(-5) && now <= booking.StartTime.AddMinutes(5))
                                {
                                    booking.Status = "InProgress";
                                    booking.CheckInTime = now;
                                    _logger.LogInformation("Booking {BookingId} auto-checkin (InProgress)", booking.Id);
                                    _rabbitMQService.PublishEvent("booking.auto-checkin", new { BookingId = booking.Id });
                                }
                            }

                            // InProgress → Cảnh báo nếu quá giờ EndTime nhưng chưa checkout
                            // KHÔNG tự động checkout vì cần thông tin distance, cost từ user
                            if (booking.Status == "InProgress" && !booking.CheckOutTime.HasValue && now > booking.EndTime.AddMinutes(5))
                            {
                                _logger.LogWarning("Booking {BookingId} is overdue (EndTime: {EndTime}, Now: {Now}) but not checked out yet. User must manually checkout with distance and cost information.", 
                                    booking.Id, booking.EndTime, now);
                                // Có thể gửi notification nhưng không tự động checkout
                                _rabbitMQService.PublishEvent("booking.overdue", new { 
                                    BookingId = booking.Id, 
                                    EndTime = booking.EndTime,
                                    OverdueMinutes = (now - booking.EndTime).TotalMinutes
                                });
                            }

                            // Pending hoặc Confirmed → NoShow nếu quá StartTime mà chưa check-in  
                            if ((booking.Status == "Pending" || booking.Status == "Confirmed") && !booking.CheckInTime.HasValue && now > booking.StartTime.AddMinutes(5))
                            {
                                booking.Status = "NoShow";
                                _logger.LogInformation("Booking {BookingId} auto-noshow", booking.Id);
                                _rabbitMQService.PublishEvent("booking.auto-noshow", new { BookingId = booking.Id });
                            }
                        }

                        if (allBookings.Any())
                            await bookingRepository.SaveChangesAsync();
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in BookingStatusBackgroundService");
                }

                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
            }
        }
    }

}
