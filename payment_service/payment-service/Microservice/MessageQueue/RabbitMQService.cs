using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PaymentService.Microservice.MessageQueue
{
    public class RabbitMQService : IHostedService, IDisposable
    {
        private readonly ILogger<RabbitMQService> _logger;
        private readonly IConfiguration _configuration;
        private IConnection _connection;
        private IModel _channel;
        private readonly string _hostName;
        private readonly int _port;
        private readonly string _userName;
        private readonly string _password;

        public RabbitMQService(ILogger<RabbitMQService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            _hostName = _configuration["RabbitMQ:HostName"] ?? "localhost";
            _port = int.Parse(_configuration["RabbitMQ:Port"] ?? "5672");
            _userName = _configuration["RabbitMQ:UserName"] ?? "admin";
            _password = _configuration["RabbitMQ:Password"] ?? "admin123";
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                var factory = new ConnectionFactory
                {
                    HostName = _hostName,
                    Port = _port,
                    UserName = _userName,
                    Password = _password,
                    VirtualHost = "/"
                };

                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();

                // Declare exchanges and queues
                _channel.ExchangeDeclare("payment.exchange", ExchangeType.Topic, true);
                _channel.ExchangeDeclare("notification.exchange", ExchangeType.Topic, true);

                // Payment queues
                _channel.QueueDeclare("payment.created", true, false, false);
                _channel.QueueDeclare("payment.completed", true, false, false);
                _channel.QueueDeclare("payment.failed", true, false, false);
                _channel.QueueDeclare("payment.refunded", true, false, false);

                // Notification queues
                _channel.QueueDeclare("notification.payment", true, false, false);
                _channel.QueueDeclare("notification.wallet", true, false, false);

                // Bind queues to exchanges
                _channel.QueueBind("payment.created", "payment.exchange", "payment.created");
                _channel.QueueBind("payment.completed", "payment.exchange", "payment.completed");
                _channel.QueueBind("payment.failed", "payment.exchange", "payment.failed");
                _channel.QueueBind("payment.refunded", "payment.exchange", "payment.refunded");

                _channel.QueueBind("notification.payment", "notification.exchange", "payment.*");
                _channel.QueueBind("notification.wallet", "notification.exchange", "wallet.*");

                _logger.LogInformation("RabbitMQ service started successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start RabbitMQ service");
                throw;
            }
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            _channel?.Close();
            _connection?.Close();
            _logger.LogInformation("RabbitMQ service stopped");
        }

        public void PublishMessage<T>(string exchange, string routingKey, T message)
        {
            try
            {
                var json = JsonSerializer.Serialize(message);
                var body = Encoding.UTF8.GetBytes(json);

                var properties = _channel.CreateBasicProperties();
                properties.Persistent = true;
                properties.MessageId = Guid.NewGuid().ToString();
                properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

                _channel.BasicPublish(exchange, routingKey, properties, body);
                _logger.LogInformation($"Published message to {exchange} with routing key {routingKey}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to publish message to {exchange}");
                throw;
            }
        }

        public void SubscribeToQueue<T>(string queueName, Func<T, Task> handler)
        {
            var consumer = new EventingBasicConsumer(_channel);
            consumer.Received += async (model, ea) =>
            {
                try
                {
                    var body = ea.Body.ToArray();
                    var message = JsonSerializer.Deserialize<T>(Encoding.UTF8.GetString(body));
                    
                    if (message != null)
                    {
                        await handler(message);
                        _channel.BasicAck(ea.DeliveryTag, false);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing message from queue {queueName}");
                    _channel.BasicNack(ea.DeliveryTag, false, true);
                }
            };

            _channel.BasicConsume(queueName, false, consumer);
            _logger.LogInformation($"Subscribed to queue {queueName}");
        }

        public void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
        }
    }
}
