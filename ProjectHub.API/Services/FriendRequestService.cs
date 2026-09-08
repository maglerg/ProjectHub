// Services/FriendRequestService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class FriendRequestService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<FriendRequestService> _logger;
    private readonly NotificationService _notificationService;

    public FriendRequestService(
        AppDbContext dbContext,
        ILogger<FriendRequestService> logger,
        NotificationService notificationService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
    }

    // 📌 Получить статус дружбы/заявки
    public async Task<FriendRequestStatusDto> GetFriendStatusAsync(Guid userId, string targetEmail)
    {
        var targetUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == targetEmail);

        if (targetUser == null)
        {
            return new FriendRequestStatusDto { Status = "None", IsFriend = false };
        }

        // Проверяем, уже в друзьях
        var isFriend = await _dbContext.Friends
            .AnyAsync(f => f.UserId == userId && f.FriendId == targetUser.Id && f.Status == FriendStatus.Accepted);

        if (isFriend)
        {
            return new FriendRequestStatusDto { Status = "Friend", IsFriend = true };
        }

        // Проверяем, есть ли отправленная заявка
        var sentRequest = await _dbContext.FriendRequests
            .FirstOrDefaultAsync(fr => fr.SenderId == userId && fr.ReceiverId == targetUser.Id && fr.Status == FriendRequestStatus.Pending);

        if (sentRequest != null)
        {
            return new FriendRequestStatusDto
            {
                Status = "Pending",
                IsFriend = false,
                RequestId = sentRequest.Id
            };
        }

        // Проверяем, есть ли входящая заявка
        var receivedRequest = await _dbContext.FriendRequests
            .FirstOrDefaultAsync(fr => fr.SenderId == targetUser.Id && fr.ReceiverId == userId && fr.Status == FriendRequestStatus.Pending);

        if (receivedRequest != null)
        {
            return new FriendRequestStatusDto
            {
                Status = "Received",
                IsFriend = false,
                RequestId = receivedRequest.Id
            };
        }

        return new FriendRequestStatusDto { Status = "None", IsFriend = false };
    }

    // 📌 Отправить заявку в друзья
    public async Task<FriendRequestResponseDto> SendFriendRequestAsync(Guid senderId, string targetEmail, string? message = null)
    {
        var targetUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == targetEmail);

        if (targetUser == null)
        {
            throw new KeyNotFoundException("Пользователь с таким email не найден");
        }

        if (targetUser.Id == senderId)
        {
            throw new InvalidOperationException("Нельзя отправить заявку самому себе");
        }

        // Проверяем, уже в друзьях
        var isFriend = await _dbContext.Friends
            .AnyAsync(f => f.UserId == senderId && f.FriendId == targetUser.Id && f.Status == FriendStatus.Accepted);

        if (isFriend)
        {
            throw new InvalidOperationException("Этот пользователь уже в друзьях");
        }

        // Проверяем, есть ли уже заявка
        var existingRequest = await _dbContext.FriendRequests
            .FirstOrDefaultAsync(fr => (fr.SenderId == senderId && fr.ReceiverId == targetUser.Id) ||
                                       (fr.SenderId == targetUser.Id && fr.ReceiverId == senderId) &&
                                       fr.Status == FriendRequestStatus.Pending);

        if (existingRequest != null)
        {
            throw new InvalidOperationException("Заявка уже отправлена");
        }

        var request = new FriendRequest
        {
            Id = Guid.NewGuid(),
            SenderId = senderId,
            ReceiverId = targetUser.Id,
            Status = FriendRequestStatus.Pending,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.FriendRequests.AddAsync(request);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Заявка в друзья отправлена от {senderId} к {targetUser.Id}");

        // 📨 Уведомление получателю
        var sender = await _dbContext.Users.FindAsync(senderId);
        await _notificationService.CreateNotificationAsync(
            targetUser.Id,
            "👋 Новая заявка в друзья",
            $"Пользователь {sender?.Name} хочет добавить вас в друзья",
            NotificationType.FriendRequest,
            $"/friends/requests",
            request.Id
        );

        return MapToResponse(request);
    }

    // 📌 Отменить заявку
    public async Task CancelFriendRequestAsync(Guid requestId, Guid userId)
    {
        var request = await _dbContext.FriendRequests
            .Include(fr => fr.Sender)
            .Include(fr => fr.Receiver)
            .FirstOrDefaultAsync(fr => fr.Id == requestId && fr.SenderId == userId);

        if (request == null)
        {
            throw new KeyNotFoundException("Заявка не найдена или вы не являетесь отправителем");
        }

        if (request.Status != FriendRequestStatus.Pending)
        {
            throw new InvalidOperationException("Заявка уже обработана");
        }

        // 📌 1. Удаляем уведомления, связанные с этой заявкой
        await _notificationService.DeleteNotificationsByRelatedIdAsync(requestId);

        // 📌 2. Удаляем саму заявку
        _dbContext.FriendRequests.Remove(request);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"🗑️ Заявка {requestId} отменена и удалена пользователем {userId}");
    }

    // 📌 Принять или отклонить заявку
    public async Task<FriendRequestResponseDto> ProcessFriendRequestAsync(Guid requestId, Guid userId, bool approve)
    {
        var request = await _dbContext.FriendRequests
            .Include(fr => fr.Sender)
            .Include(fr => fr.Receiver)
            .FirstOrDefaultAsync(fr => fr.Id == requestId && fr.ReceiverId == userId);

        if (request == null)
        {
            throw new KeyNotFoundException("Заявка не найдена");
        }

        if (request.Status != FriendRequestStatus.Pending)
        {
            throw new InvalidOperationException("Заявка уже обработана");
        }

        // 📌 Сохраняем данные для уведомлений (до удаления)
        var senderId = request.SenderId;
        var receiverId = request.ReceiverId;
        var senderName = request.Sender?.Name ?? "Пользователь";
        var receiverName = request.Receiver?.Name ?? "Пользователь";
        var senderEmail = request.Sender?.Email ?? "";
        var receiverEmail = request.Receiver?.Email ?? "";
        var createdAt = request.CreatedAt;

        if (approve)
        {
            // ✅ ПРИНИМАЕМ — добавляем в друзья
            var friend1 = new Friend
            {
                Id = Guid.NewGuid(),
                UserId = senderId,
                FriendId = receiverId,
                Status = FriendStatus.Accepted,
                CreatedAt = DateTime.UtcNow
            };

            var friend2 = new Friend
            {
                Id = Guid.NewGuid(),
                UserId = receiverId,
                FriendId = senderId,
                Status = FriendStatus.Accepted,
                CreatedAt = DateTime.UtcNow
            };

            await _dbContext.Friends.AddRangeAsync(friend1, friend2);

            // 📨 Уведомление отправителю (ОДОБРЕНО)
            await _notificationService.CreateNotificationAsync(
                senderId,
                "✅ Заявка в друзья принята",
                $"Пользователь {receiverName} принял вашу заявку в друзья",
                NotificationType.FriendRequestAccepted,
                $"/users/{Uri.EscapeDataString(receiverEmail)}",
                requestId
            );
        }
        else
        {
            await _notificationService.CreateNotificationAsync(
                senderId,
                "❌ Заявка в друзья отклонена",
                $"Пользователь {receiverName} отклонил вашу заявку в друзья",
                NotificationType.FriendRequestRejected,
                $"/users/{Uri.EscapeDataString(receiverEmail)}",
                requestId
            );

            _logger.LogInformation($"❌ Заявка {requestId} отклонена, уведомление отправлено отправителю");
        }


        // 📌 Удаляем саму заявку
        _dbContext.FriendRequests.Remove(request);
        await _dbContext.SaveChangesAsync();

        
        return new FriendRequestResponseDto
        {
            Id = requestId,
            SenderId = senderId,
            SenderName = senderName,
            SenderEmail = senderEmail,
            ReceiverId = receiverId,
            ReceiverName = receiverName,
            ReceiverEmail = receiverEmail,
            Status = approve ? "Accepted" : "Rejected",
            CreatedAt = createdAt,
            ProcessedAt = DateTime.UtcNow
        };
    }

    // 📌 Получить входящие заявки
    public async Task<List<FriendRequestResponseDto>> GetIncomingRequestsAsync(Guid userId)
    {
        var requests = await _dbContext.FriendRequests
            .Include(fr => fr.Sender)
            .Include(fr => fr.Receiver)
            .Where(fr => fr.ReceiverId == userId && fr.Status == FriendRequestStatus.Pending)
            .OrderByDescending(fr => fr.CreatedAt)
            .ToListAsync();

        return requests.Select(MapToResponse).ToList();
    }

    private FriendRequestResponseDto MapToResponse(FriendRequest request)
    {
        return new FriendRequestResponseDto
        {
            Id = request.Id,
            SenderId = request.SenderId,
            SenderName = request.Sender?.Name ?? string.Empty,
            SenderEmail = request.Sender?.Email ?? string.Empty,
            ReceiverId = request.ReceiverId,
            ReceiverName = request.Receiver?.Name ?? string.Empty,
            ReceiverEmail = request.Receiver?.Email ?? string.Empty,
            Status = request.Status.ToString(),
            CreatedAt = request.CreatedAt,
            ProcessedAt = request.ProcessedAt
        };
    }
}