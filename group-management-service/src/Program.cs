using GroupManagementService.Data;  
using GroupManagementService.Repositories;  
using GroupManagementService.Services;  
using Microsoft.EntityFrameworkCore;  

namespace GroupManagementService
{
    public class Program
    {
        // Hàm Main: điểm khởi đầu của ứng dụng
        public static void Main(string[] args)
        {
            // Tạo WebApplicationBuilder để cấu hình ứng dụng
            var builder = WebApplication.CreateBuilder(args);

            // Cấu hình Entity Framework sử dụng database trong bộ nhớ (InMemory) với tên "GroupDb"
            // Database này sẽ mất dữ liệu khi ứng dụng khởi động lại
            builder.Services.AddDbContext<AppDbContext>(opt => opt.UseInMemoryDatabase("GroupDb"));
            
            // Đăng ký IGroupRepository với GroupRepository sử dụng dependency injection
            // Scoped: tạo một instance cho mỗi HTTP request
            builder.Services.AddScoped<IGroupRepository, GroupRepository>();
            
            // Đăng ký IVoteRepository với VoteRepository sử dụng dependency injection
            builder.Services.AddScoped<IVoteRepository, VoteRepository>();
            
            // Đăng ký GroupService sử dụng dependency injection
            builder.Services.AddScoped<GroupService>();
            
            // Đăng ký VotingService sử dụng dependency injection
            builder.Services.AddScoped<VotingService>();

            // Đăng ký Fund và Usage services/repositories
            builder.Services.AddScoped<IFundRepository, FundRepository>();
            builder.Services.AddScoped<FundService>();
            builder.Services.AddScoped<IUsageRepository, UsageRepository>();
            builder.Services.AddScoped<UsageService>();
            
            // Thêm controllers và cấu hình JSON serializer
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // Bỏ qua các reference cycle trong JSON để tránh lỗi serialization
                    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                    // Format JSON output cho dễ đọc (thêm indentation)
                    options.JsonSerializerOptions.WriteIndented = true;
                });
            
            // Thêm API Explorer để hỗ trợ Swagger/OpenAPI
            builder.Services.AddEndpointsApiExplorer();
            
            // Thêm Swagger generator với cấu hình chi tiết
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
                {
                    Title = "Group Management API",
                    Version = "v1",
                    Description = "API để quản lý nhóm và bỏ phiếu"
                });
            });

            // Build ứng dụng từ builder
            var app = builder.Build();
            
            // Cấu hình Swagger middleware với route template tùy chỉnh
            // Đảm bảo Swagger JSON được phục vụ đúng endpoint
            app.UseSwagger(c =>
            {
                c.RouteTemplate = "swagger/{documentName}/swagger.json";
            });
            
            // Cấu hình Swagger UI với endpoint và prefix
            // Endpoint: URL của Swagger JSON specification
            // RoutePrefix: đường dẫn để truy cập Swagger UI (mặc định là "swagger")
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Group Management API V1");
                c.RoutePrefix = "swagger";
            });
            
            // Map các controller routes vào ứng dụng
            app.MapControllers();
            
            // Chạy ứng dụng (lắng nghe các HTTP request)
            app.Run();
        }
    }
}
