// Services/NotificationService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.NotificationDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class NotificationService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext dbContext, ILogger<NotificationService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    // 📌 Создать уведомление
    public async Task<NotificationDto> CreateNotificationAsync(
        Guid userId,
        string title,
        string? message,
        NotificationType type,
        string? link = null,
        Guid? relatedId = null)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            IsRead = false,
            Link = link,
            RelatedId = relatedId,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Notifications.AddAsync(notification);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Уведомление создано для пользователя {userId}: {title}");

        return MapToDto(notification);
    }
    public async Task<NotificationDto> UpsertChatNotificationAsync(
    Guid userId,
    Guid chatId,
    string senderName,
    int unreadCount,
    string link)
    {
        // Ищем существующее непрочитанное уведомление по этому чату
        var existing = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.UserId == userId
                                       && n.RelatedId == chatId
                                       && n.Type == NotificationType.NewMessage);

        var title = "💬 Новые сообщения";
        var message = unreadCount == 1
            ? $"{senderName}: новое сообщение"
            : $"У вас {unreadCount} непрочитанных сообщений";

        if (existing != null)
        {
            // 🆕 Обновляем существующее — не создаём новое
            existing.Title = title;
            existing.Message = message;
            existing.IsRead = false;   // если было прочитано, снова становится непрочитанным
            existing.CreatedAt = DateTime.UtcNow;
            existing.Link = link;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"Обновлено уведомление о чате {chatId} у пользователя {userId}: " +
                $"{unreadCount} непрочитанных");

            return MapToDto(existing);
        }

        // 🆕 Создаём новое
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Message = message,
            Type = NotificationType.NewMessage,
            IsRead = false,
            Link = link,
            RelatedId = chatId,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Notifications.AddAsync(notification);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            $"Создано уведомление о чате {chatId} у пользователя {userId}: " +
            $"{unreadCount} непрочитанных");

        return MapToDto(notification);
    }
    // 📌 Получить все уведомления пользователя
    public async Task<List<NotificationDto>> GetUserNotificationsAsync(Guid userId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notifications.Select(MapToDto).ToList();
    }

    // 📌 Получить непрочитанные уведомления
    public async Task<List<NotificationDto>> GetUnreadNotificationsAsync(Guid userId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();

        return notifications.Select(MapToDto).ToList();
    }

    // 📌 Получить количество непрочитанных
    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _dbContext.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    // 📌 Отметить как прочитанное
    public async Task MarkAsReadAsync(Guid userId, Guid? notificationId = null)
    {
        if (notificationId.HasValue)
        {
            var notification = await _dbContext.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId.Value && n.UserId == userId);

            if (notification != null)
            {
                notification.IsRead = true;
                await _dbContext.SaveChangesAsync();
            }
        }
        else
        {
            var notifications = await _dbContext.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in notifications)
            {
                n.IsRead = true;
            }

            await _dbContext.SaveChangesAsync();
        }
    }
    // 📌 Удалить уведомления о новых сообщениях для конкретного чата и пользователя
    public async Task DeleteChatMessageNotificationsAsync(Guid userId, Guid chatId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId
                        && n.RelatedId == chatId
                        && n.Type == NotificationType.NewMessage)
            .ToListAsync();

        if (notifications.Any())
        {
            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation(
                $"🗑️ Удалено {notifications.Count} уведомлений о сообщениях для чата {chatId} у пользователя {userId}");
        }
    }
    // 📌 Удалить уведомления о комментариях к конкретной задаче у пользователя
    public async Task DeleteTaskCommentNotificationsAsync(Guid userId, Guid taskId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId
                        && n.RelatedId == taskId
                        && n.Type == NotificationType.NewTaskComment)
            .ToListAsync();

        if (notifications.Any())
        {
            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation(
                $"🗑️ Удалено {notifications.Count} уведомлений о комментариях к задаче {taskId} у пользователя {userId}");
        }
    }
    // 📌 Удалить уведомление о новом голосовании для конкретного пользователя
    public async Task DeleteVotingNotificationAsync(Guid userId, Guid votingId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId
                        && n.RelatedId == votingId
                        && n.Type == NotificationType.NewVoting)
            .ToListAsync();

        if (notifications.Any())
        {
            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation(
                $"🗑️ Удалено {notifications.Count} уведомлений о голосовании {votingId} у пользователя {userId}");
        }
    }
    // 📌 Удалить уведомления по RelatedId (уже есть, но проверим)
    public async Task DeleteNotificationsByRelatedIdAsync(Guid relatedId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.RelatedId == relatedId)
            .ToListAsync();

        if (notifications.Any())
        {
            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation($"🗑️ Удалено {notifications.Count} уведомлений с RelatedId={relatedId}");
        }
    }

    // 📌 Очистить уведомления по проекту (для обработанных заявок)
    public async Task CleanupNotificationsForProjectAsync(Guid projectId)
    {
        // Находим все заявки проекта, которые уже обработаны (не Pending)
        var processedApplicationIds = await _dbContext.Applications
            .Where(a => a.ProjectId == projectId && a.Status != ApplicationStatus.Pending)
            .Select(a => a.Id)
            .ToListAsync();

        if (!processedApplicationIds.Any())
            return;

        // Находим уведомления, связанные с этими заявками
        var notificationsToDelete = await _dbContext.Notifications
            .Where(n => processedApplicationIds.Contains(n.RelatedId ?? Guid.Empty))
            .ToListAsync();

        if (notificationsToDelete.Any())
        {
            _dbContext.Notifications.RemoveRange(notificationsToDelete);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation($"🗑️ Удалено {notificationsToDelete.Count} уведомлений для обработанных заявок в проекте {projectId}");
        }
    }
    private NotificationDto MapToDto(Notification notification)
    {
        return new NotificationDto
        {
            Id = notification.Id,
            Title = notification.Title,
            Message = notification.Message,
            Type = notification.Type.ToString(),
            IsRead = notification.IsRead,
            Link = notification.Link,
            CreatedAt = notification.CreatedAt,
            RelatedId = notification.RelatedId
        };
    }
}