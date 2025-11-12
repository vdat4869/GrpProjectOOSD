using MongoDB.Driver;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ReportService.Infrastructure;

public interface IMongoDbService
{
    IMongoCollection<T> GetCollection<T>(string collectionName);
    Task LogAsync<T>(string collectionName, T logEntry);
}

public class MongoDbService : IMongoDbService
{
    private readonly IMongoDatabase? _database;
    private readonly ILogger<MongoDbService> _logger;

    public MongoDbService(IConfiguration configuration, ILogger<MongoDbService> logger)
    {
        _logger = logger;
        var connectionString = configuration.GetConnectionString("MongoDB") 
            ?? "mongodb://mongoadmin:mongopass123@mongodb:27017/report_logs?authSource=admin";
        
        try
        {
            var client = new MongoClient(connectionString);
            var databaseName = new MongoUrl(connectionString).DatabaseName ?? "report_logs";
            _database = client.GetDatabase(databaseName);
            _logger.LogInformation("Connected to MongoDB database: {DatabaseName}", databaseName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to MongoDB. Service will continue without logging to MongoDB.");
            // Set to null and handle in methods
            _database = null!;
        }
    }

    public IMongoCollection<T> GetCollection<T>(string collectionName)
    {
        if (_database == null)
            throw new InvalidOperationException("MongoDB is not available");
        return _database.GetCollection<T>(collectionName);
    }

    public async Task LogAsync<T>(string collectionName, T logEntry)
    {
        try
        {
            if (_database == null)
            {
                _logger.LogDebug("MongoDB not available, skipping log entry");
                return;
            }
            
            var collection = GetCollection<T>(collectionName);
            await collection.InsertOneAsync(logEntry);
            _logger.LogDebug("Logged to MongoDB collection: {CollectionName}", collectionName);
        }
        catch (InvalidOperationException)
        {
            // MongoDB not available, just skip
            _logger.LogDebug("MongoDB not available, skipping log entry");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error logging to MongoDB collection: {CollectionName}. Continuing without logging.", collectionName);
            // Don't throw - allow service to continue even if logging fails
        }
    }
}

// Log models
public class ReportLog
{
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Action { get; set; } = string.Empty;
    public int? CoOwnerId { get; set; }
    public int? VehicleGroupId { get; set; }
    public string? Details { get; set; }
}

