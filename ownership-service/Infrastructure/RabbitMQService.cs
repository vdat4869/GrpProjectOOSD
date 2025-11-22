using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace OwnershipService.Infrastructure;

public interface IRabbitMQService
{
    void PublishEvent<T>(string queueName, T eventData);
    void SubscribeEvent<T>(string queueName, Action<T> handler);
}

public class RabbitMQService : IRabbitMQService, IDisposable
{
    private readonly IConnection? _connection;
    private readonly IModel? _channel;
    private readonly ILogger<RabbitMQService> _logger;
    private readonly List<EventingBasicConsumer> _consumers = new();

    public RabbitMQService(IConfiguration configuration, ILogger<RabbitMQService> logger)
    {
        _logger = logger;
        var hostName = configuration["RabbitMQ:HostName"] ?? "localhost";
        var userName = configuration["RabbitMQ:UserName"] ?? "rabbitmq";
        var password = configuration["RabbitMQ:Password"] ?? "rabbitmq123";

        var factory = new ConnectionFactory
        {
            HostName = hostName,
            UserName = userName,
            Password = password,
            Port = 5672,
            VirtualHost = "/"
        };

        try
        {
            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();
            _logger.LogInformation("Connected to RabbitMQ at {HostName}", hostName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to RabbitMQ. Service will continue but events will not be published/subscribed.");
            // Don't throw - allow service to continue without RabbitMQ
        }
    }

    public void PublishEvent<T>(string queueName, T eventData)
    {
        try
        {
            if (_channel == null || _connection == null || !_connection.IsOpen)
            {
                _logger.LogWarning("RabbitMQ not connected. Event not published to queue: {QueueName}", queueName);
                return;
            }

            _channel.QueueDeclare(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

            var message = JsonSerializer.Serialize(eventData);
            var body = Encoding.UTF8.GetBytes(message);

            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;

            _channel.BasicPublish(exchange: "", routingKey: queueName, basicProperties: properties, body: body);
            _logger.LogInformation("Published event to queue: {QueueName}", queueName);
        }
        catch (Exception ex)
        {
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
public class VehicleGroupUpdatedEvent
{
    public Guid VehicleGroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class OwnershipUpdatedEvent
{
    public Guid OwnershipId { get; set; }
    public Guid CoOwnerId { get; set; }
    public Guid VehicleGroupId { get; set; }
    public decimal OwnershipPercentage { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class VotingStatusChangedEvent
{
    public Guid ProposalId { get; set; }
    public Guid VehicleGroupId { get; set; }
    public string ProposalType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

