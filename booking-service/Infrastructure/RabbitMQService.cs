using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BookingService.Infrastructure;

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
public class BookingCompletedEvent
{
    public int BookingId { get; set; }
    public int CoOwnerId { get; set; }
    public int VehicleId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public double Distance { get; set; }
    public double Cost { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime CheckOutTime { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class BookingCreatedEvent
{
    public int BookingId { get; set; }
    public int CoOwnerId { get; set; }
    public int VehicleId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

