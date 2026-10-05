// Services/DeadlineNotificationWorker.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models.Enums;

namespace ProjectHub.API.Services;

/// <summary>
/// Фоновый воркер: раз в N часов проходит по активным проектам,
/// находит задачи с приближающимся дедлайном (DueDate или Project.Deadline)
/// и создаёт уведомления TaskDeadlineSoon исполнителям.
///
/// Идемпотентность: если по задаче уже отправлялось уведомление
/// TaskDeadlineSoon за последние 20 часов — пропускаем.
/// </summary>
public class DeadlineNotificationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DeadlineNotificationWorker> _logger;
    private readonly IConfiguration _configuration;

    /// <summary>Окно дедупликации: 20 часов (чтобы 4-часовые прогоны не дублировались).</summary>
    private static readonly TimeSpan DeduplicationWindow = TimeSpan.FromHours(20);

    public DeadlineNotificationWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<DeadlineNotificationWorker> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = _configuration.GetValue<bool?>(
            "NotificationSettings:DeadlineCheckEnabled") ?? true;

        if (!enabled)
        {
            _logger.LogInformation(
                "DeadlineNotificationWorker отключён в конфигурации");
            return;
        }

        var intervalMinutes = _configuration.GetValue<int?>(
            "NotificationSettings:DeadlineCheckIntervalMinutes") ?? 360;

        if (intervalMinutes < 5)
            intervalMinutes = 5;

        _logger.LogInformation(
            "DeadlineNotificationWorker запущен. Интервал: {Interval} мин",
            intervalMinutes);

        // Небольшая задержка перед первым прогоном — даём приложению
        // полностью поднять БД и DI.
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Никогда не роняем хост из-за фоновой ошибки.
                _logger.LogError(ex,
                    "DeadlineNotificationWorker: ошибка в прогоне");
            }

            try
            {
                await Task.Delay(
                    TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("DeadlineNotificationWorker остановлен");
    }

    /// <summary>Один прогон: собрать задачи и разослать уведомления.</summary>
    internal async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider
            .GetRequiredService<NotificationService>();

        var now = DateTime.UtcNow;

        // Верхняя граница «скоро» — берём максимальный порог из всех настроек
        // пользователей + запас, чтобы не грузить лишние задачи.
        var maxDaysBefore = await db.UserNotificationSettings
            .Where(s => s.Enabled && s.TaskDeadlines)
            .MaxAsync(s => (int?)s.DeadlineDaysBefore, ct) ?? 7;

        maxDaysBefore = Math.Clamp(maxDaysBefore, 1, 30);
        var horizon = now.AddDays(maxDaysBefore);

        // 1. Кандидаты — задачи:
        //    • в активных проектах,
        //    • не завершённые,
        //    • с эффективным дедлайном в окне [now, horizon].
        var candidateTasks = await db.ProjectTasks
            .Include(t => t.Project)
            .Include(t => t.Column)
            .Include(t => t.Assignees)
            .Where(t => !t.Project.IsArchived)
            .Where(t => t.CompletedAt == null)
            .Where(t => t.Column != null
                        && t.Column.SystemKey != TaskService.KeyCompleted)
            .Where(t =>
                // дедлайн задачи в окне
                (t.DueDate != null
                    && t.DueDate >= now
                    && t.DueDate <= horizon)
                // ИЛИ дедлайн проекта в окне (для задач без своего DueDate)
                || (t.DueDate == null
                    && t.Project.Deadline >= now
                    && t.Project.Deadline <= horizon))
            .ToListAsync(ct);

        if (candidateTasks.Count == 0)
        {
            _logger.LogDebug(
                "DeadlineNotificationWorker: задач с приближающимся дедлайном нет");
            return;
        }

        _logger.LogInformation(
            "DeadlineNotificationWorker: найдено {Count} задач-кандидатов",
            candidateTasks.Count);

        // 2. Кэш настроек пользователей, чтобы не бить БД в цикле.
        var userIds = candidateTasks
            .SelectMany(t => t.Assignees.Select(a => a.UserId)
                .Append(t.CreatedById))
            .Distinct()
            .ToList();

        var settingsByUser = await db.UserNotificationSettings
            .Where(s => userIds.Contains(s.UserId))
            .ToDictionaryAsync(s => s.UserId, ct);

        // 3. ID задач, по которым уже отправляли уведомление за окно дедупликации.
        var dedupThreshold = now - DeduplicationWindow;
        var taskIds = candidateTasks.Select(t => t.Id).ToList();

        var recentlyNotifiedTaskIds = await db.Notifications
            .Where(n => n.Type == NotificationType.TaskDeadlineSoon
                        && n.RelatedId != null
                        && taskIds.Contains(n.RelatedId.Value)
                        && n.CreatedAt > dedupThreshold)
            .Select(n => n.RelatedId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var recentlyNotifiedSet = recentlyNotifiedTaskIds.ToHashSet();

        int sentCount = 0;

        foreach (var task in candidateTasks)
        {
            if (ct.IsCancellationRequested) break;

            if (recentlyNotifiedSet.Contains(task.Id))
                continue;

            // Эффективный дедлайн и дни до него
            var due = task.DueDate ?? task.Project.Deadline;
            var daysLeft = (int)Math.Ceiling((due - now).TotalDays);
            if (daysLeft < 0) daysLeft = 0;

            // Получатели: assignees; если их нет — создатель
            var recipientIds = task.Assignees
                .Select(a => a.UserId)
                .Distinct()
                .ToList();

            if (recipientIds.Count == 0)
                recipientIds.Add(task.CreatedById);

            foreach (var recipientId in recipientIds)
            {
                // Настройки получателя — если есть и отключены, сервис сам отфильтрует,
                // но мы не будем зря дёргать CreateNotificationAsync.
                if (settingsByUser.TryGetValue(recipientId, out var s))
                {
                    if (!s.Enabled || !s.TaskDeadlines)
                        continue;

                    if (s.DoNotDisturbUntil.HasValue
                        && s.DoNotDisturbUntil.Value > now)
                        continue;

                    // Порог конкретного пользователя: если до дедлайна ещё
                    // больше, чем он хочет — не шлём.
                    if (daysLeft > s.DeadlineDaysBefore)
                        continue;
                }

                var title = "⏰ Приближается дедлайн задачи";
                var message = daysLeft <= 0
                    ? $"Задача «{task.Title}» должна была быть завершена. Проект: {task.Project.Name}"
                    : daysLeft == 1
                        ? $"Задача «{task.Title}» должна быть завершена завтра. Проект: {task.Project.Name}"
                        : $"Задача «{task.Title}» должна быть завершена через {daysLeft} дн. Проект: {task.Project.Name}";

                await notifications.CreateNotificationAsync(
                    recipientId,
                    title,
                    message,
                    NotificationType.TaskDeadlineSoon,
                    link: $"/projects/{task.Project.PublicCode}/tasks/{task.Id}",
                    relatedId: task.Id
                );

                sentCount++;
            }
        }

        if (sentCount > 0)
        {
            _logger.LogInformation(
                "DeadlineNotificationWorker: отправлено {Count} уведомлений",
                sentCount);
        }
    }
}