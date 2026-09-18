using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.ProjectDtos;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class ProjectHistoryService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<ProjectHistoryService> _logger;

        public ProjectHistoryService(AppDbContext db, ILogger<ProjectHistoryService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<ProjectActivityPageDto> GetProjectActivityAsync(
            string projectCode,
            Guid userId,
            ActivityType? type = null,
            Guid? relatedEntityId = null,
            int skip = 0,
            int take = 50)
        {
            if (take <= 0) take = 50;
            if (take > 200) take = 200;

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == projectCode)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            var isOwner = project.OwnerId == userId;
            var isMember = await _db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId);

            if (!isOwner && !isMember)
                throw new UnauthorizedAccessException("Нет доступа к этому проекту");

            var query = _db.ProjectActivities
                .Where(a => a.ProjectId == project.Id)
                .Include(a => a.User)
                .AsQueryable();

            if (type.HasValue)
                query = query.Where(a => a.Type == type.Value);

            if (relatedEntityId.HasValue)
                query = query.Where(a => a.RelatedEntityId == relatedEntityId.Value);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(a => new ProjectActivityDto
                {
                    Id = a.Id,
                    Type = a.Type.ToString(),
                    Summary = a.Summary,
                    Link = a.Link,
                    RelatedEntityId = a.RelatedEntityId,
                    CreatedAt = a.CreatedAt,
                    UserName = a.User.Name,
                    UserEmail = a.User.Email,
                    UserSpecialization = a.User.Specialization.ToString()
                })
                .ToListAsync();

            return new ProjectActivityPageDto
            {
                Total = total,
                Skip = skip,
                Take = take,
                Items = items
            };
        }
    }
}