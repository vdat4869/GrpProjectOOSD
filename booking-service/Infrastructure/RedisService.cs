using StackExchange.Redis;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BookingService.Infrastructure;

public interface IRedisService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null);
    Task RemoveAsync(string key);
    Task<bool> ExistsAsync(string key);
}

public class RedisService : IRedisService
{
    private readonly IDatabase? _database;
    private readonly ILogger<RedisService> _logger;

    public RedisService(IConfiguration configuration, ILogger<RedisService> logger)
    {
        _logger = logger;
        var connectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        
        try
        {
            var connection = ConnectionMultiplexer.Connect(connectionString);
            _database = connection.GetDatabase();
            _logger.LogInformation("Connected to Redis at {ConnectionString}", connectionString);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to Redis. Service will continue without caching.");
            // Don't throw - allow service to continue without Redis
        }
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            if (_database == null)
                return default;
                
            var value = await _database.StringGetAsync(key);
            if (!value.HasValue)
                return default;

            return JsonSerializer.Deserialize<T>(value!);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting key: {Key}. Returning default.", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        try
        {
            if (_database == null)
                return;
                
            var json = JsonSerializer.Serialize(value);
            await _database.StringSetAsync(key, json, expiration);
            _logger.LogDebug("Set key: {Key} with expiration: {Expiration}", key, expiration);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error setting key: {Key}. Continuing without caching.", key);
            // Don't throw - allow service to continue even if caching fails
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            if (_database == null)
                return;
                
            await _database.KeyDeleteAsync(key);
            _logger.LogDebug("Removed key: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error removing key: {Key}. Continuing.", key);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            if (_database == null)
                return false;
                
            return await _database.KeyExistsAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error checking key existence: {Key}. Returning false.", key);
            return false;
        }
    }
}

