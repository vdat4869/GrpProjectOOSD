using System;
using System.ComponentModel.DataAnnotations;

namespace BookingService.DTOs
{
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
    public class EndTimeGreaterThanStartTimeAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var obj = validationContext.ObjectInstance;
            var startTimeProperty = obj.GetType().GetProperty("StartTime");
            var endTimeProperty = obj.GetType().GetProperty("EndTime");

            if (startTimeProperty == null || endTimeProperty == null)
            {
                return ValidationResult.Success;
            }

            var startTimeObj = startTimeProperty.GetValue(obj);
            var endTimeObj = endTimeProperty.GetValue(obj);

            if (startTimeObj is not DateTime startTime || endTimeObj is not DateTime endTime)
            {
                // Nếu không lấy được DateTime hợp lệ, coi như hợp lệ
                return ValidationResult.Success;
            }

            if (endTime <= startTime)
            {
                return new ValidationResult("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");
            }

            return ValidationResult.Success;
        }
    }
}
