// Services/FriendRequestService.cs

using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.FriendDtos;
using ProjectHub.API.Hubs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;
using System.Collections.Concurrent;

namespace ProjectHub.API.Services;

public class FriendRequestService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<FriendRequestService> _logger;
    private readonly NotificationService _notificationService;
    private readonly IHubContext<ChatHub> _hubContext;

    // 🆕 In-memory блокировка по ключу (sender, receiver).
    // Защита от race condition при одновременной отправке заявки
    // в обе стороны. Дополнительно к уникальному индексу в БД.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _requestLocks = new();

    public FriendRequestService(
        AppDbContext dbContext,
        ILogger<FriendRequestService> logger,
        NotificationService notificationService,
        IHubContext<ChatHub> hubContext)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
        _hubContext = hubContext;
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
    public async Task<FriendRequestResponseDto> SendFriendRequestAsync(
        Guid senderId, string targetEmail, string? message = null)
    {
        // ── 1. Ранняя валидация: находим targetUser, чтобы знать id для lock-ключа ──
        var targetUser = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == targetEmail)
            ?? throw new KeyNotFoundException("Пользователь с таким email не найден");

        if (targetUser.Id == senderId)
            throw new InvalidOperationException("Нельзя отправить заявку самому себе");

        // ── 2. Атомарная проверка под семафором ──
        // Ключ нормализуем: (min, max) — чтобы A→B и B→A использовали один lock.
        var lockKey = BuildLockKey(senderId, targetUser.Id);
        var semaphore = _requestLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));

        await semaphore.WaitAsync();
        try
        {
            return await SendFriendRequestCoreAsync(senderId, targetUser, message);
        }
        finally
        {
            semaphore.Release();

            if (semaphore.CurrentCount == 1)
                _requestLocks.TryRemove(lockKey, out _);
        }
    }

    // Ядро отправки — выполняется под семафором.
    private async Task<FriendRequestResponseDto> SendFriendRequestCoreAsync(
        Guid senderId, User targetUser, string? message)
    {
        // ── Уже в друзьях? ──
        var isFriend = await _dbContext.Friends
            .AnyAsync(f => f.UserId == senderId
                           && f.FriendId == targetUser.Id
                           && f.Status == FriendStatus.Accepted);

        if (isFriend)
            throw new InvalidOperationException("Этот пользователь уже в друзьях");

        // ── Есть ли pending-заявка в любую сторону? ──
        // 🐛 ФИКС: правильные скобки, чтобы статус применялся к обоим направлениям.
        var existingRequest = await _dbContext.FriendRequests
            .FirstOrDefaultAsync(fr =>
                ((fr.SenderId == senderId && fr.ReceiverId == targetUser.Id) ||
                 (fr.SenderId == targetUser.Id && fr.ReceiverId == senderId))
                && fr.Status == FriendRequestStatus.Pending);

        if (existingRequest != null)
        {
            // Уточним сообщение: если заявка от targetUser — это «вам уже отправили».
            if (existingRequest.SenderId == targetUser.Id)
                throw new InvalidOperationException(
                    "Этот пользователь уже отправил вам заявку — проверьте входящие");

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

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Race: пока мы думали — кто-то уже вставил заявку.
            _logger.LogWarning(
                "Дублирующая заявка в друзья: sender={SenderId}, receiver={ReceiverId}",
                senderId, targetUser.Id);

            _dbContext.Entry(request).State = EntityState.Detached;

            throw new InvalidOperationException("Заявка уже отправлена");
        }

        _logger.LogInformation(
            $"Заявка в друзья отправлена от {senderId} к {targetUser.Id}");

        // ── Уведомление получателю ──
        var sender = await _dbContext.Users.FindAsync(senderId);
        await _notificationService.CreateNotificationAsync(
            targetUser.Id,
            "👋 Новая заявка в друзья",
            $"Пользователь {sender?.Name} хочет добавить вас в друзья",
            NotificationType.FriendRequest,
            "/friends/requests",
            request.Id
        );

        // ── Подтягиваем навигацию для DTO ──
        request.Sender = sender!;
        request.Receiver = targetUser;

        var dto = MapToResponse(request);

        // 🆕 ── SignalR: FriendRequestCreated в user:{receiverId} ──
        await EmitToUserAsync(targetUser.Id, "FriendRequestCreated", dto);

        return dto;
    }

    // 📌 Отменить заявку
    public async Task CancelFriendRequestAsync(Guid requestId, Guid userId)
    {
        var request = await _dbContext.FriendRequests
            .Include(fr => fr.Sender)
            .Include(fr => fr.Receiver)
            .FirstOrDefaultAsync(fr => fr.Id == requestId && fr.SenderId == userId);

        if (request == null)
            throw new KeyNotFoundException("Заявка не найдена или вы не являетесь отправителем");

        if (request.Status != FriendRequestStatus.Pending)
            throw new InvalidOperationException("Заявка уже обработана");

        var receiverId = request.ReceiverId;

        // 📌 1. Удаляем уведомления, связанные с этой заявкой
        await _notificationService.DeleteNotificationsByRelatedIdAsync(requestId);

        // 📌 2. Удаляем саму заявку
        _dbContext.FriendRequests.Remove(request);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            $"🗑️ Заявка {requestId} отменена и удалена пользователем {userId}");

        // 🆕 ── SignalR: FriendRequestCanceled в user:{receiverId} ──
        // У получателя карточка заявки уходит из списка.
        await EmitToUserAsync(receiverId, "FriendRequestCanceled", new
        {
            RequestId = requestId,
        });
    }

    // 📌 Принять или отклонить заявку
    public async Task<FriendRequestResponseDto> ProcessFriendRequestAsync(
        Guid requestId, Guid userId, bool approve)
    {
        var request = await _dbContext.FriendRequests
            .Include(fr => fr.Sender)
            .Include(fr => fr.Receiver)
            .FirstOrDefaultAsync(fr => fr.Id == requestId && fr.ReceiverId == userId)
            ?? throw new KeyNotFoundException("Заявка не найдена");

        if (request.Status != FriendRequestStatus.Pending)
            throw new InvalidOperationException("Заявка уже обработана");

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
            // 📌 Защита от гонки: если во время accept кто-то параллельно
            //    уже создал одну из Friend-записей.
            var existingFriend1 = await _dbContext.Friends
                .AnyAsync(f => f.UserId == senderId && f.FriendId == receiverId);

            var existingFriend2 = await _dbContext.Friends
                .AnyAsync(f => f.UserId == receiverId && f.FriendId == senderId);

            var now = DateTime.UtcNow;

            if (!existingFriend1)
            {
                _dbContext.Friends.Add(new Friend
                {
                    Id = Guid.NewGuid(),
                    UserId = senderId,
                    FriendId = receiverId,
                    Status = FriendStatus.Accepted,
                    CreatedAt = now
                });
            }

            if (!existingFriend2)
            {
                _dbContext.Friends.Add(new Friend
                {
                    Id = Guid.NewGuid(),
                    UserId = receiverId,
                    FriendId = senderId,
                    Status = FriendStatus.Accepted,
                    CreatedAt = now
                });
            }

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

            _logger.LogInformation(
                $"❌ Заявка {requestId} отклонена, уведомление отправлено отправителю");
        }

        // 📌 Удаляем саму заявку
        _dbContext.FriendRequests.Remove(request);
        await _dbContext.SaveChangesAsync();

        var response = new FriendRequestResponseDto
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

        // 🆕 ── SignalR: FriendRequestProcessed ──
        // Эмитим обоим участникам:
        //   • sender — чтобы узнать, что заявку обработали;
        //   • receiver — чтобы карточка ушла, если она открыта в другой вкладке.
        var processedPayload = new
        {
            RequestId = requestId,
            Status = response.Status,
            SenderId = senderId,
            ReceiverId = receiverId,
        };

        await EmitToUserAsync(senderId, "FriendRequestProcessed", processedPayload);
        await EmitToUserAsync(receiverId, "FriendRequestProcessed", processedPayload);

        // 🆕 ── SignalR: FriendAdded (если приняли) ──
        // Чтобы у обоих обновился список друзей / статус «уже в друзьях».
        if (approve)
        {
            var friendAddedPayload = new
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                SenderName = senderName,
                SenderEmail = senderEmail,
                ReceiverName = receiverName,
                ReceiverEmail = receiverEmail,
            };

            await EmitToUserAsync(senderId, "FriendAdded", friendAddedPayload);
            await EmitToUserAsync(receiverId, "FriendAdded", friendAddedPayload);
        }

        return response;
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

    // ═══════════════════════════════════════════════════════════
    //  ВСПОМОГАТЕЛЬНЫЕ
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Нормализованный ключ блокировки: (min, max) — чтобы A→B и B→A
    /// использовали один и тот же семафор и не гонялись за одну пару.
    /// </summary>
    private static string BuildLockKey(Guid a, Guid b)
    {
        var min = a.CompareTo(b) <= 0 ? a : b;
        var max = a.CompareTo(b) <= 0 ? b : a;
        return $"{min}:{max}";
    }

    /// <summary>
    /// Проверяет, что DbUpdateException вызван нарушением unique constraint.
    /// Покрывает Postgres (23505), SQL Server (2601/2627), SQLite (2067).
    /// </summary>
    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("unique", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("23505")   // PostgreSQL
            || msg.Contains("2601")    // SQL Server
            || msg.Contains("2627")    // SQL Server
            || msg.Contains("2067");   // SQLite
    }

    /// <summary>
    /// Отправляет событие в группу user:{userId}.
    /// Обёрнуто в try/catch — SignalR не должен ломать основной поток.
    /// </summary>
    private async Task EmitToUserAsync(Guid userId, string eventName, object payload)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "SignalR: не удалось отправить {EventName} в user:{UserId}",
                eventName, userId);
        }
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