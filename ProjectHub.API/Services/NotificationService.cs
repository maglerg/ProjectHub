// Services/NotificationService.cs

using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.NotificationDtos;
using ProjectHub.API.Hubs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class NotificationService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<NotificationService> _logger;
    private readonly IHubContext<ChatHub> _hubContext;

    public NotificationService(
        AppDbContext dbContext,
        ILogger<NotificationService> logger,
        IHubContext<ChatHub> hubContext)
    {
        _dbContext = dbContext;
        _logger = logger;
        _hubContext = hubContext;
    }

    // ═══════════════════════════════════════════════════════════
    //  СОЗДАНИЕ УВЕДОМЛЕНИЙ
    // ═══════════════════════════════════════════════════════════

    // 📌 Создать уведомление
    public async Task<NotificationDto> CreateNotificationAsync(
        Guid userId,
        string title,
        string? message,
        NotificationType type,
        string? link = null,
        Guid? relatedId = null)
    {
        // 🆕 Проверка настроек: разрешено ли это уведомление?
        if (!await IsAllowedAsync(userId, type))
        {
            _logger.LogDebug(
                "Уведомление типа {Type} подавлено настройками для {UserId}",
                type, userId);

            // Возвращаем «пустой» DTO, чтобы вызывающий код не падал.
            // Эмита не будет — мы вышли до EmitNotificationReceivedAsync.
            return new NotificationDto
            {
                Id = Guid.Empty,
                Title = title,
                Message = message,
                Type = type.ToString(),
                IsRead = true,
                Link = link,
                CreatedAt = DateTime.UtcNow,
                RelatedId = relatedId,
            };
        }

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

        var dto = MapToDto(notification);

        // ── SignalR: мгновенно доставляем уведомление получателю ──
        await EmitNotificationReceivedAsync(userId, dto);

        return dto;
    }

    // 📌 Upsert уведомления о непрочитанных сообщениях в чате
    public async Task<NotificationDto> UpsertChatNotificationAsync(
        Guid userId,
        Guid chatId,
        string senderName,
        int unreadCount,
        string link)
    {
        // 🆕 Проверка настроек: если чаты отключены — ничего не создаём и не эмитим
        if (!await IsAllowedAsync(userId, NotificationType.NewMessage))
        {
            _logger.LogDebug(
                "Уведомление о чате подавлено настройками для {UserId}", userId);

            return new NotificationDto
            {
                Id = Guid.Empty,
                Title = "💬 Новые сообщения",
                Message = unreadCount == 1
                    ? $"{senderName}: новое сообщение"
                    : $"У вас {unreadCount} непрочитанных сообщений",
                Type = NotificationType.NewMessage.ToString(),
                IsRead = true,
                Link = link,
                CreatedAt = DateTime.UtcNow,
                RelatedId = chatId,
            };
        }

        // Ищем существующее уведомление по этому чату
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
            // Обновляем существующее — не создаём новое
            existing.Title = title;
            existing.Message = message;
            existing.IsRead = false;
            existing.CreatedAt = DateTime.UtcNow;
            existing.Link = link;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"Обновлено уведомление о чате {chatId} у пользователя {userId}: " +
                $"{unreadCount} непрочитанных");

            var dtoExisting = MapToDto(existing);

            await EmitNotificationReceivedAsync(userId, dtoExisting);

            return dtoExisting;
        }

        // Создаём новое
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

        var dtoNew = MapToDto(notification);

        await EmitNotificationReceivedAsync(userId, dtoNew);

        return dtoNew;
    }

    // ═══════════════════════════════════════════════════════════
    //  ЧТЕНИЕ УВЕДОМЛЕНИЙ
    // ═══════════════════════════════════════════════════════════

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

                await EmitNotificationReadAsync(userId, notificationId.Value);
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

            await EmitAllNotificationsReadAsync(userId);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  УДАЛЕНИЕ УВЕДОМЛЕНИЙ
    // ═══════════════════════════════════════════════════════════

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

            await EmitNotificationDeletedAsync(userId, chatId);
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

            await EmitNotificationDeletedAsync(userId, taskId);
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

            await EmitNotificationDeletedAsync(userId, votingId);
        }
    }

    // 📌 Удалить уведомления по RelatedId (для всех пользователей)
    public async Task DeleteNotificationsByRelatedIdAsync(Guid relatedId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.RelatedId == relatedId)
            .ToListAsync();

        if (notifications.Any())
        {
            var affectedUserIds = notifications
                .Select(n => n.UserId)
                .Distinct()
                .ToList();

            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"🗑️ Удалено {notifications.Count} уведомлений с RelatedId={relatedId}");

            foreach (var uid in affectedUserIds)
            {
                await EmitNotificationDeletedAsync(uid, relatedId);
            }
        }
    }

    // 📌 Очистить уведомления по проекту (для обработанных заявок)
    public async Task CleanupNotificationsForProjectAsync(Guid projectId)
    {
        var processedApplicationIds = await _dbContext.Applications
            .Where(a => a.ProjectId == projectId && a.Status != ApplicationStatus.Pending)
            .Select(a => a.Id)
            .ToListAsync();

        if (!processedApplicationIds.Any())
            return;

        var notificationsToDelete = await _dbContext.Notifications
            .Where(n => processedApplicationIds.Contains(n.RelatedId ?? Guid.Empty))
            .ToListAsync();

        if (notificationsToDelete.Any())
        {
            var affectedUserIds = notificationsToDelete
                .Select(n => n.UserId)
                .Distinct()
                .ToList();

            _dbContext.Notifications.RemoveRange(notificationsToDelete);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"🗑️ Удалено {notificationsToDelete.Count} уведомлений для обработанных заявок в проекте {projectId}");

            foreach (var uid in affectedUserIds)
            {
                await EmitNotificationDeletedAsync(uid, projectId);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  🆕 НАСТРОЙКИ УВЕДОМЛЕНИЙ
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Проверяет, разрешено ли данное уведомление для пользователя
    /// с учётом мастера, группы и DND.
    /// </summary>
    public async Task<bool> IsAllowedAsync(Guid userId, NotificationType type)
    {
        var settings = await GetOrCreateSettingsEntityAsync(userId);

        // 1. Мастер-переключатель
        if (!settings.Enabled)
            return false;

        // 2. Не беспокоить
        if (settings.DoNotDisturbUntil.HasValue
            && settings.DoNotDisturbUntil.Value > DateTime.UtcNow)
        {
            return false;
        }

        // 3. In-app канал (пока всегда true, на будущее)
        if (!settings.InAppEnabled)
            return false;

        // 4. Группа
        var group = type.GetGroup();

        return group switch
        {
            NotificationGroup.System => true,          // системные не блокируем
            NotificationGroup.Master => true,
            NotificationGroup.NewMessages => settings.NewMessages,
            NotificationGroup.FriendRequests => settings.FriendRequests,
            NotificationGroup.ProjectInvitations => settings.ProjectInvitations,
            NotificationGroup.ProjectChanges => settings.ProjectChanges,
            NotificationGroup.TaskComments => settings.TaskComments,
            NotificationGroup.Votings => settings.Votings,
            NotificationGroup.TaskDeadlines => settings.TaskDeadlines,
            NotificationGroup.Applications => settings.Applications,
            _ => true,
        };
    }

    /// <summary>Получить настройки (DTO) текущего пользователя.</summary>
    public async Task<NotificationSettingsDto> GetSettingsAsync(Guid userId)
    {
        var s = await GetOrCreateSettingsEntityAsync(userId);
        return MapSettingsToDto(s);
    }

    /// <summary>Обновить настройки. Обновляются только переданные поля.</summary>
    public async Task<NotificationSettingsDto> UpdateSettingsAsync(
        Guid userId, UpdateNotificationSettingsDto dto)
    {
        var s = await GetOrCreateSettingsEntityAsync(userId);

        if (dto.Enabled.HasValue) s.Enabled = dto.Enabled.Value;
        if (dto.NewMessages.HasValue) s.NewMessages = dto.NewMessages.Value;
        if (dto.FriendRequests.HasValue) s.FriendRequests = dto.FriendRequests.Value;
        if (dto.ProjectInvitations.HasValue) s.ProjectInvitations = dto.ProjectInvitations.Value;
        if (dto.ProjectChanges.HasValue) s.ProjectChanges = dto.ProjectChanges.Value;
        if (dto.TaskComments.HasValue) s.TaskComments = dto.TaskComments.Value;
        if (dto.Votings.HasValue) s.Votings = dto.Votings.Value;
        if (dto.TaskDeadlines.HasValue) s.TaskDeadlines = dto.TaskDeadlines.Value;
        if (dto.Applications.HasValue) s.Applications = dto.Applications.Value;
        if (dto.InAppEnabled.HasValue) s.InAppEnabled = dto.InAppEnabled.Value;
        if (dto.EmailEnabled.HasValue) s.EmailEnabled = dto.EmailEnabled.Value;

        if (dto.DeadlineDaysBefore.HasValue)
        {
            s.DeadlineDaysBefore = Math.Clamp(dto.DeadlineDaysBefore.Value, 1, 30);
        }

        s.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        var result = MapSettingsToDto(s);

        // 🆕 Сообщаем всем вкладкам пользователя, что настройки изменились
        await EmitSettingsChangedAsync(userId, result);

        return result;
    }

    /// <summary>
    /// Установить / снять «Не беспокоить».
    /// duration: off | hour | untilMorning | day | week
    /// </summary>
    public async Task<NotificationSettingsDto> SetDoNotDisturbAsync(
        Guid userId, string duration)
    {
        var s = await GetOrCreateSettingsEntityAsync(userId);

        var now = DateTime.UtcNow;

        s.DoNotDisturbUntil = duration?.ToLowerInvariant() switch
        {
            "off" or null or "" => null,

            "hour" => now.AddHours(1),

            // «до утра» — до 09:00 следующего дня по UTC.
            "untilmorning" => GetUntilMorningUtc(now),

            "day" => now.AddDays(1),
            "week" => now.AddDays(7),

            _ => throw new InvalidOperationException(
                "Некорректная длительность. Допустимо: off, hour, untilMorning, day, week"),
        };

        s.UpdatedAt = now;
        await _dbContext.SaveChangesAsync();

        var result = MapSettingsToDto(s);
        await EmitSettingsChangedAsync(userId, result);

        return result;
    }

    // ═══════════════════════════════════════════════════════════
    //  ХЕЛПЕРЫ НАСТРОЕК
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Возвращает существующие настройки, либо создаёт с дефолтами.
    /// Защищено от гонки через unique index на UserId.
    /// </summary>
    private async Task<UserNotificationSettings> GetOrCreateSettingsEntityAsync(Guid userId)
    {
        var settings = await _dbContext.UserNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings != null)
            return settings;

        settings = new UserNotificationSettings
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Enabled = true,
            NewMessages = true,
            FriendRequests = true,
            ProjectInvitations = true,
            ProjectChanges = true,
            TaskComments = true,
            Votings = true,
            TaskDeadlines = true,
            Applications = true,
            DeadlineDaysBefore = 3,
            InAppEnabled = true,
            EmailEnabled = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _dbContext.UserNotificationSettings.Add(settings);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Гонка: кто-то параллельно создал. Перечитываем.
            _dbContext.Entry(settings).State = EntityState.Detached;

            settings = await _dbContext.UserNotificationSettings
                .FirstAsync(s => s.UserId == userId);
        }

        return settings;
    }

    /// <summary>Ближайшие 09:00 UTC (условное «утро»).</summary>
    private static DateTime GetUntilMorningUtc(DateTime nowUtc)
    {
        var morning = nowUtc.Date.AddHours(9);
        if (morning <= nowUtc)
            morning = morning.AddDays(1);
        return morning;
    }

    private static NotificationSettingsDto MapSettingsToDto(UserNotificationSettings s)
    {
        var now = DateTime.UtcNow;

        return new NotificationSettingsDto
        {
            Enabled = s.Enabled,
            NewMessages = s.NewMessages,
            FriendRequests = s.FriendRequests,
            ProjectInvitations = s.ProjectInvitations,
            ProjectChanges = s.ProjectChanges,
            TaskComments = s.TaskComments,
            Votings = s.Votings,
            TaskDeadlines = s.TaskDeadlines,
            Applications = s.Applications,
            DeadlineDaysBefore = s.DeadlineDaysBefore,
            DoNotDisturbUntil = s.DoNotDisturbUntil,
            IsDoNotDisturbActive =
                s.DoNotDisturbUntil.HasValue && s.DoNotDisturbUntil.Value > now,
            InAppEnabled = s.InAppEnabled,
            EmailEnabled = s.EmailEnabled,
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  SIGNALR — ХЕЛПЕРЫ ЭМИТА
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Эмитит NotificationReceived конкретному пользователю.
    /// Обёрнуто в try/catch — если SignalR недоступен, не ломаем основной поток.
    /// </summary>
    private async Task EmitNotificationReceivedAsync(Guid userId, NotificationDto dto)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync("NotificationReceived", dto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR: не удалось отправить NotificationReceived");
        }
    }

    /// <summary>Эмитит NotificationRead — уведомление прочитано.</summary>
    private async Task EmitNotificationReadAsync(Guid userId, Guid notificationId)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync("NotificationRead", notificationId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR: не удалось отправить NotificationRead");
        }
    }

    /// <summary>Эмитит AllNotificationsRead — все уведомления прочитаны.</summary>
    private async Task EmitAllNotificationsReadAsync(Guid userId)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync("AllNotificationsRead");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR: не удалось отправить AllNotificationsRead");
        }
    }

    /// <summary>
    /// Эмитит NotificationDeleted — уведомление удалено.
    /// Фронт может по этому событию обновить список/бейдж.
    /// </summary>
    private async Task EmitNotificationDeletedAsync(Guid userId, Guid relatedId)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync("NotificationDeleted", relatedId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR: не удалось отправить NotificationDeleted");
        }
    }

    /// <summary>Эмитит NotificationSettingsChanged в user:{userId}.</summary>
    private async Task EmitSettingsChangedAsync(Guid userId, NotificationSettingsDto dto)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync("NotificationSettingsChanged", dto);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "SignalR: не удалось отправить NotificationSettingsChanged");
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