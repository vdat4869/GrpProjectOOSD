using Microsoft.AspNetCore.SignalR;
using PaymentService.Models;

namespace PaymentService.Hubs
{
    public class PaymentHub : Hub
    {
        public async Task JoinGroup(string groupId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Group_{groupId}");
        }

        public async Task LeaveGroup(string groupId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Group_{groupId}");
        }

        public async Task PaymentStatusUpdated(string groupId, Guid paymentId, PaymentStatus status)
        {
            await Clients.Group($"Group_{groupId}").SendAsync("PaymentStatusUpdated", paymentId, status);
        }

        public async Task CostShareCreated(string groupId, Guid costShareId)
        {
            await Clients.Group($"Group_{groupId}").SendAsync("CostShareCreated", costShareId);
        }

        public async Task PaymentCompleted(string groupId, Guid paymentId, decimal amount)
        {
            await Clients.Group($"Group_{groupId}").SendAsync("PaymentCompleted", paymentId, amount);
        }
    }
}
