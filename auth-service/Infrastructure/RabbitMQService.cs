using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AuthService.Infrastructure;

/// <summary>
/// Interface cho RabbitMQ Service
/// Định nghĩa các phương thức publish và subscribe events
/// </summary>
public interface IRabbitMQService
{
    /// <summary>Publish event lên queue</summary>
    void PublishEvent<T>(string queueName, T eventData);
    
    /// <summary>Subscribe event từ queue</summary>
    void SubscribeEvent<T>(string queueName, Action<T> handler);
}

/// <summary>
/// Service xử lý RabbitMQ
/// Publish và subscribe events để giao tiếp với các service khác
/// </summary>
public class RabbitMQService : IRabbitMQService, IDisposable
{
    // RabbitMQ connection (có thể null nếu không kết nối được)
    private readonly IConnection? _connection;
    
    // RabbitMQ channel (có thể null nếu không kết nối được)
    private readonly IModel? _channel;
    
    // Logger để ghi log
    private readonly ILogger<RabbitMQService> _logger;
    
    // Danh sách consumers để dispose khi service bị dispose
    private readonly List<EventingBasicConsumer> _consumers = new();

    /// <summary>
    /// Constructor - Kết nối đến RabbitMQ server
    /// Nếu không kết nối được, service vẫn hoạt động nhưng không publish/subscribe events
    /// </summary>
    public RabbitMQService(IConfiguration configuration, ILogger<RabbitMQService> logger)
    {
        _logger = logger;
        
        // Đọc cấu hình RabbitMQ từ configuration
        var hostName = configuration["RabbitMQ:HostName"] ?? "localhost";
        var userName = configuration["RabbitMQ:UserName"] ?? "rabbitmq";
        var password = configuration["RabbitMQ:Password"] ?? "rabbitmq123";

        // Tạo connection factory
        var factory = new ConnectionFactory
        {
            HostName = hostName,
            UserName = userName,
            Password = password,
            Port = 5672, // Port mặc định của RabbitMQ
            VirtualHost = "/" // Virtual host mặc định
        };

        try
        {
            // Tạo connection và channel
            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();
            _logger.LogInformation("Connected to RabbitMQ at {HostName}", hostName);
        }
        catch (Exception ex)
        {
            // Log lỗi nhưng không throw exception
            // Service vẫn có thể hoạt động bình thường mà không có RabbitMQ
            _logger.LogWarning(ex, "Failed to connect to RabbitMQ. Service will continue but events will not be published/subscribed.");
            // Don't throw - allow service to continue without RabbitMQ
        }
    }

    /// <summary>
    /// Publish event lên RabbitMQ queue
    /// Event sẽ được serialize thành JSON và gửi lên queue
    /// </summary>
    /// <typeparam name="T">Kiểu của event data</typeparam>
    /// <param name="queueName">Tên queue</param>
    /// <param name="eventData">Dữ liệu event cần publish</param>
    public void PublishEvent<T>(string queueName, T eventData)
    {
        try
        {
            // Kiểm tra connection có sẵn không
            if (_channel == null || _connection == null || !_connection.IsOpen)
            {
                _logger.LogWarning("RabbitMQ not connected. Event not published to queue: {QueueName}", queueName);
                return;
            }

            // Khai báo queue (nếu chưa tồn tại)
            // durable = true: queue sẽ tồn tại sau khi RabbitMQ restart
            _channel.QueueDeclare(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

            // Serialize event data thành JSON
            var message = JsonSerializer.Serialize(eventData);
            var body = Encoding.UTF8.GetBytes(message);

            // Tạo properties với persistent = true
            // Message sẽ được lưu vào disk để không bị mất khi RabbitMQ restart
            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;

            // Publish message lên queue
            _channel.BasicPublish(exchange: "", routingKey: queueName, basicProperties: properties, body: body);
            _logger.LogInformation("Published event to queue: {QueueName}", queueName);
        }
        catch (Exception ex)
        {
            // Log lỗi nhưng không throw exception
            // Service vẫn có thể hoạt động bình thường nếu publish event thất bại
            _logger.LogWarning(ex, "Error publishing event to queue: {QueueName}. Continuing without publishing.", queueName);
            // Don't throw - allow service to continue even if event publishing fails
        }
    }

    public void SubscribeEvent<T>(string queueName, Action<T> handler)
    {
        try
        {
            if (_channel == null || _connection == null || !_connection.IsOpen)
            {
                _logger.LogWarning("RabbitMQ not connected. Cannot subscribe to queue: {QueueName}", queueName);
                return;
            }

            _channel.QueueDeclare(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

            var consumer = new EventingBasicConsumer(_channel);
            consumer.Received += (model, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var message = Encoding.UTF8.GetString(body);
                    var eventData = JsonSerializer.Deserialize<T>(message);

                    if (eventData != null)
                    {
                        handler(eventData);
                        _channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
                        _logger.LogInformation("Processed event from queue: {QueueName}", queueName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing event from queue: {QueueName}", queueName);
                    try
                    {
                        _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                    }
                    catch
                    {
                        // Ignore if channel is closed
                    }
                }
            };

            _channel.BasicConsume(queue: queueName, autoAck: false, consumer: consumer);
            _consumers.Add(consumer);
            _logger.LogInformation("Subscribed to queue: {QueueName}", queueName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error subscribing to queue: {QueueName}. Service will continue without subscription.", queueName);
            // Don't throw - allow service to continue even if subscription fails
        }
    }

    public void Dispose()
    {
        try
        {
            _channel?.Close();
            _connection?.Close();
        }
        catch
        {
            // Ignore errors during disposal
        }
        finally
        {
            _channel?.Dispose();
            _connection?.Dispose();
        }
    }
}

// Event models
public class UserCreatedEvent
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public List<string> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

