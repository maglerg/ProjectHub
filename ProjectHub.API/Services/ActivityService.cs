using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class ActivityService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<ActivityService> _logger;

        public ActivityService(AppDbContext db, ILogger<ActivityService> logger)
        {
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// Записать событие в историю проекта.
        /// НЕ вызывает SaveChangesAsync — используем тот же контекст,
        /// чтобы событие сохранилось вместе с основным действием.
        /// </summary>
        public async Task LogAsync(
            Guid projectId,
            Guid userId,
            ActivityType type,
            string? summary = null,
            string? link = null,
            Guid? relatedEntityId = null)
        {
            try
            {
                _db.ProjectActivities.Add(new ProjectActivity
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    UserId = userId,
                    Type = type,
                    Summary = Truncate(summary, 500),
                    Link = Truncate(link, 500),
                    RelatedEntityId = relatedEntityId,
                    CreatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Не удалось записать событие истории");
            }

            await Task.CompletedTask;
        }

        private static string? Truncate(string? s, int max)
        {
            if (string.IsNullOrEmpty(s)) return s;
            return s.Length <= max ? s : s.Substring(0, max);
        }
    }
}