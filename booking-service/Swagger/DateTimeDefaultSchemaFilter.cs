using System;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

public class DateTimeDefaultSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema.Properties == null) return;

        // Chỉ áp dụng cho CreateBookingRequest
        if (context.Type == typeof(BookingService.DTOs.CreateBookingRequest))
        {
            var isoDate = DateTime.Today.ToString("yyyy-MM-ddT00:00:00Z");

            if (schema.Properties.ContainsKey("startTime"))
                schema.Properties["startTime"].Example = new Microsoft.OpenApi.Any.OpenApiString(isoDate);

            if (schema.Properties.ContainsKey("endTime"))
                schema.Properties["endTime"].Example = new Microsoft.OpenApi.Any.OpenApiString(isoDate);
        }
    }
}
