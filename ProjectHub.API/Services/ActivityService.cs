// Services/ActivityService.cs

using Microsoft.AspNetCore.SignalR;                       // 🆕
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.ProjectDtos;                    // 🆕
using ProjectHub.API.Hubs;                                // 🆕
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class ActivityService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<ActivityService> _logger;
        private readonly IHubContext<ChatHub> _hubContext;   // 🆕

        public ActivityService(
            AppDbContext db,
            ILogger<ActivityService> logger,
            IHubContext<ChatHub> hubContext)                 // 🆕
        {
            _db = db;
            _logger = logger;
            _hubContext = hubContext;                        // 🆕
        }

        /// <summary>
        /// Записать событие в историю проекта.
        /// НЕ вызывает SaveChangesAsync — используем тот же контекст,
        /// чтобы событие сохранилось вместе с основным действием.
        ///
        /// ВАЖНО: возвращает созданный ProjectActivity, чтобы вызывающий
        /// сервис мог заэмитить его в SignalR ПОСЛЕ SaveChangesAsync.
        /// </summary>
        public Task<ProjectActivity?> LogAsync(
            Guid projectId,
            Guid userId,
            ActivityType type,
            string? summary = null,
            string? link = null,
            Guid? relatedEntityId = null)
        {
            try
            {
                var activity = new ProjectActivity
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    UserId = userId,
                    Type = type,
                    Summary = Truncate(summary, 500),
                    Link = Truncate(link, 500),
                    RelatedEntityId = relatedEntityId,
                    CreatedAt = DateTime.UtcNow
                };

                _db.ProjectActivities.Add(activity);

                return Task.FromResult<ProjectActivity?>(activity);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Не удалось записать событие истории");
                return Task.FromResult<ProjectActivity?>(null);
            }
        }

        // ═══════════════════════════════════════════════════════════
        //  🆕 SIGNALR: эмит события в группу project:{publicCode}
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Эмитит событие истории в SignalR.
        /// Вызывается ПОСЛЕ SaveChangesAsync — когда activity уже в БД.
        /// </summary>
        public async Task EmitActivityAsync(
            ProjectActivity? activity,
            string projectCode)
        {
            if (activity == null) return;
            if (string.IsNullOrWhiteSpace(projectCode)) return;

            try
            {
                // Догружаем User'а для DTO
                var user = await _db.Users
                    .Where(u => u.Id == activity.UserId)
                    .Select(u => new
                    {
                        u.Name,
                        u.Email,
                        Specialization = u.Specialization.ToString()
                    })
                    .FirstOrDefaultAsync();

                var dto = new ProjectActivityDto
                {
                    Id = activity.Id,
                    Type = activity.Type.ToString(),
                    Summary = activity.Summary,
                    Link = activity.Link,
                    RelatedEntityId = activity.RelatedEntityId,
                    CreatedAt = activity.CreatedAt,
                    UserName = user?.Name ?? "Пользователь",
                    UserEmail = user?.Email ?? string.Empty,
                    UserSpecialization = user?.Specialization
                };

                await _hubContext.Clients
                    .Group($"project:{projectCode}")
                    .SendAsync("ActivityAdded", dto);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "ActivityService: не удалось эмитить событие {ActivityId} в project:{ProjectCode}",
                    activity.Id, projectCode);
            }
        }

        private static string? Truncate(string? s, int max)
        {
            if (string.IsNullOrEmpty(s)) return s;
            return s.Length <= max ? s : s.Substring(0, max);
        }
    }
}