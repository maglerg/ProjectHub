// Services/NotificationService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
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