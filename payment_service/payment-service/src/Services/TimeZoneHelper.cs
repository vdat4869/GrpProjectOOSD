using System;

namespace PaymentService.Services
{
    /// <summary>
    /// Helper để chuyển đổi thời gian UTC sang múi giờ Việt Nam (UTC+7)
    /// </summary>
    public static class TimeZoneHelper
    {
        private static readonly TimeZoneInfo VietnamTimeZone = GetVietnamTimeZone();

        private static TimeZoneInfo GetVietnamTimeZone()
        {
            try
            {
                // Thử tìm timezone trên Windows
                return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            }
            catch
            {
                try
                {
                    // Thử tìm timezone trên Linux/Mac
                    return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
                }
                catch
                {
                    // Fallback: tạo custom timezone UTC+7
                    return TimeZoneInfo.CreateCustomTimeZone("Vietnam", TimeSpan.FromHours(7), "Vietnam", "Vietnam");
                }
            }
        }

        /// <summary>
        /// Chuyển đổi UTC DateTime sang giờ Việt Nam
        /// </summary>
        public static DateTime ToVietnamTime(DateTime utcDateTime)
        {
            if (utcDateTime.Kind == DateTimeKind.Unspecified)
            {
                // Nếu không có timezone info, giả định là UTC
                utcDateTime = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            }
            
            return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime.ToUniversalTime(), VietnamTimeZone);
        }

        /// <summary>
        /// Chuyển đổi giờ Việt Nam sang UTC
        /// </summary>
        public static DateTime FromVietnamTime(DateTime vietnamDateTime)
        {
            if (vietnamDateTime.Kind == DateTimeKind.Unspecified)
            {
                // Giả định là giờ Việt Nam
                var utcOffset = TimeSpan.FromHours(7);
                var utcTime = vietnamDateTime - utcOffset;
                return DateTime.SpecifyKind(utcTime, DateTimeKind.Utc);
            }
            
            return TimeZoneInfo.ConvertTimeToUtc(vietnamDateTime, VietnamTimeZone);
        }

        /// <summary>
        /// Lấy thời gian hiện tại theo giờ Việt Nam
        /// </summary>
        public static DateTime Now => ToVietnamTime(DateTime.UtcNow);
    }
}

