// Services/ProjectTagsService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.ProjectTagDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class ProjectTagsService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<ProjectTagsService> _logger;
        private readonly ActivityService _activity;

        private const int MaxTagsPerProject = 15;

        public ProjectTagsService(
            AppDbContext db,
            ILogger<ProjectTagsService> logger,
            ActivityService activity)
        {
            _db = db;
            _logger = logger;
            _activity = activity;
        }

        // ═══════════════════════════════════════════════════════════
        //  СПИСОК ВСЕХ ТЕГОВ (для автокомплита / глобального поиска)
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Все теги, отсортированные по популярности (кол-во проектов).
        /// </summary>
        public async Task<List<ProjectTagDto>> GetAllTagsAsync(
            string? search = null, int take = 100)
        {
            var query = _db.ProjectTags.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t => t.Name.ToLower().Contains(s));
            }

            var tags = await query
                .Include(t => t.ProjectLinks)
                .OrderByDescending(t => t.ProjectLinks.Count)
                .ThenBy(t => t.Name)
                .Take(take)
                .ToListAsync();

            return tags.Select(MapTag).ToList();
        }

        // ═══════════════════════════════════════════════════════════
        //  ТЕГИ КОНКРЕТНОГО ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

        public async Task<List<ProjectTagDto>> GetProjectTagsAsync(
            string projectCode, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var tags = await _db.ProjectTagLinks
                .Where(l => l.ProjectId == project.Id)
                .Include(l => l.Tag)
                    .ThenInclude(t => t.ProjectLinks)
                .Select(l => l.Tag)
                .OrderBy(t => t.Name)
                .ToListAsync();

            return tags.Select(MapTag).ToList();
        }

        // ═══════════════════════════════════════════════════════════
        //  СОЗДАНИЕ ТЕГА
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Создать тег. Если тег с таким именем уже есть — переиспользуем его.
        /// Создавать может любой аутентифицированный пользователь (тег глобальный).
        /// </summary>
        public async Task<ProjectTagDto> CreateTagAsync(
            Guid userId, CreateProjectTagDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new InvalidOperationException("Название тега обязательно");

            var name = dto.Name.Trim();
            if (name.Length > 50)
                throw new InvalidOperationException("Название тега не длиннее 50 символов");

            // Проверка на существование (регистронезависимо)
            var existing = await _db.ProjectTags
                .Include(t => t.ProjectLinks)
                .FirstOrDefaultAsync(t => t.Name.ToLower() == name.ToLower());

            if (existing != null)
            {
                _logger.LogInformation(
                    $"Тег \"{name}\" уже существует, переиспользуем {existing.Id}");
                return MapTag(existing);
            }

            var tag = new ProjectTag
            {
                Id = Guid.NewGuid(),
                Name = name,
                Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim(),
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.ProjectTags.Add(tag);
            await _db.SaveChangesAsync();

            _logger.LogInformation($"Создан тег {tag.Id}: {tag.Name}");

            return MapTag(tag);
        }

        // ═══════════════════════════════════════════════════════════
        //  ОБНОВЛЕНИЕ / УДАЛЕНИЕ ТЕГА
        // ═══════════════════════════════════════════════════════════

        public async Task<ProjectTagDto> UpdateTagAsync(
            Guid tagId, Guid userId, UpdateProjectTagDto dto)
        {
            var tag = await _db.ProjectTags
                .Include(t => t.ProjectLinks)
                .FirstOrDefaultAsync(t => t.Id == tagId)
                ?? throw new KeyNotFoundException("Тег не найден");

            // Менять цвет может создатель тега
            if (tag.CreatedById != userId)
                throw new UnauthorizedAccessException(
                    "Изменять тег может только его создатель");

            tag.Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim();

            await _db.SaveChangesAsync();

            return MapTag(tag);
        }

        /// <summary>
        /// Удалить тег глобально. Только создатель.
        /// Все связи с проектами удалятся каскадно.
        /// </summary>
        public async Task DeleteTagAsync(Guid tagId, Guid userId)
        {
            var tag = await _db.ProjectTags
                .Include(t => t.ProjectLinks)
                .FirstOrDefaultAsync(t => t.Id == tagId)
                ?? throw new KeyNotFoundException("Тег не найден");

            if (tag.CreatedById != userId)
                throw new UnauthorizedAccessException(
                    "Удалять тег может только его создатель");

            _logger.LogInformation(
                $"Удаление тега {tag.Name} ({tag.Id}), отвязано от {tag.ProjectLinks.Count} проектов");

            _db.ProjectTags.Remove(tag);
            await _db.SaveChangesAsync();
        }

        // ═══════════════════════════════════════════════════════════
        //  УПРАВЛЕНИЕ ТЕГАМИ ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Установить набор тегов на проект (заменяет текущий).
        /// Только Owner/Admin проекта.
        /// </summary>
        public async Task<List<ProjectTagDto>> SetProjectTagsAsync(
            string projectCode, Guid userId, SetProjectTagsDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectManageAccessAsync(project.Id, userId);
            EnsureProjectNotArchived(project);

            var tagIds = (dto.TagIds ?? new List<Guid>()).Distinct().ToList();

            if (tagIds.Count > MaxTagsPerProject)
                throw new InvalidOperationException(
                    $"К проекту можно привязать не более {MaxTagsPerProject} тегов");

            // Проверяем, что все теги существуют
            if (tagIds.Count > 0)
            {
                var validIds = await _db.ProjectTags
                    .Where(t => tagIds.Contains(t.Id))
                    .Select(t => t.Id)
                    .ToListAsync();

                if (validIds.Count != tagIds.Count)
                    throw new InvalidOperationException(
                        "Некоторые теги не найдены");

                tagIds = validIds;
            }

            // Определяем diff для истории
            var oldIds = await _db.ProjectTagLinks
                .Where(l => l.ProjectId == project.Id)
                .Select(l => l.TagId)
                .ToListAsync();

            var oldSet = oldIds.ToHashSet();
            var newSet = tagIds.ToHashSet();

            var addedIds = newSet.Except(oldSet).ToList();
            var removedIds = oldSet.Except(newSet).ToList();

            // Удаляем старые связи
            var oldLinks = await _db.ProjectTagLinks
                .Where(l => l.ProjectId == project.Id)
                .ToListAsync();

            _db.ProjectTagLinks.RemoveRange(oldLinks);

            // Добавляем новые
            foreach (var tid in tagIds)
            {
                _db.ProjectTagLinks.Add(new ProjectTagLink
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    TagId = tid,
                    AddedById = userId,
                    AddedAt = DateTime.UtcNow
                });
            }

            // Логируем в историю
            if (addedIds.Any() || removedIds.Any())
            {
                var addedNames = addedIds.Any()
                    ? await _db.ProjectTags
                        .Where(t => addedIds.Contains(t.Id))
                        .Select(t => t.Name)
                        .ToListAsync()
                    : new List<string>();

                var removedNames = removedIds.Any()
                    ? await _db.ProjectTags
                        .Where(t => removedIds.Contains(t.Id))
                        .Select(t => t.Name)
                        .ToListAsync()
                    : new List<string>();

                var parts = new List<string>();
                if (addedNames.Any())
                    parts.Add($"добавлены: {string.Join(", ", addedNames)}");
                if (removedNames.Any())
                    parts.Add($"сняты: {string.Join(", ", removedNames)}");

                await _activity.LogAsync(
                    project.Id,
                    userId,
                    addedIds.Any()
                        ? ActivityType.TagAdded
                        : ActivityType.TagRemoved,
                    summary: $"Теги проекта — {string.Join("; ", parts)}",
                    link: $"/projects/{project.PublicCode}",
                    relatedEntityId: project.Id
                );
            }

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                $"Обновлены теги проекта {projectCode}: {tagIds.Count} шт.");

            return await GetProjectTagsAsync(projectCode, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ПОИСК ПРОЕКТОВ ПО ТЕГАМ
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Поиск публичных проектов, у которых есть ВСЕ переданные теги.
        /// </summary>
        public async Task<List<Guid>> SearchPublicProjectIdsByTagsAsync(
            List<Guid> tagIds, int take = 100)
        {
            if (tagIds == null || tagIds.Count == 0)
                return new List<Guid>();

            tagIds = tagIds.Distinct().ToList();

            var query = _db.Projects
                .Where(p => !p.IsArchived
                            && p.Visibility == ProjectVisibility.Public)
                .AsQueryable();

            // Проект должен содержать ВСЕ указанные теги
            foreach (var tagId in tagIds)
            {
                query = query.Where(p =>
                    p.TagLinks.Any(l => l.TagId == tagId));
            }

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(take)
                .Select(p => p.Id)
                .ToListAsync();
        }

        // ═══════════════════════════════════════════════════════════
        //  ВСПОМОГАТЕЛЬНЫЕ (приватные)
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Найти проект по публичному коду или бросить KeyNotFoundException.
        /// </summary>
        private async Task<Project> GetProjectByCodeOrThrowAsync(string code)
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (project == null)
                throw new KeyNotFoundException("Проект с таким кодом не найден");

            return project;
        }

        /// <summary>
        /// Проверить, что пользователь — участник проекта (owner/member).
        /// </summary>
        private async Task EnsureProjectAccessAsync(Guid projectId, Guid userId)
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
                throw new KeyNotFoundException("Проект не найден");

            var isOwner = project.OwnerId == userId;
            var isMember = await _db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!isOwner && !isMember)
                throw new UnauthorizedAccessException("Нет доступа к этому проекту");
        }

        /// <summary>
        /// Проверить, что пользователь может управлять проектом
        /// (владелец или админ).
        /// </summary>
        private async Task EnsureProjectManageAccessAsync(Guid projectId, Guid userId)
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
                throw new KeyNotFoundException("Проект не найден");

            if (project.OwnerId == userId)
                return;

            var isAdmin = await _db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId
                                && pm.UserId == userId
                                && pm.Role == ProjectMemberRole.Admin);

            if (!isAdmin)
                throw new UnauthorizedAccessException(
                    "Управлять тегами проекта может только владелец или администратор");
        }

        /// <summary>
        /// Проверить, что проект не в архиве.
        /// </summary>
        private static void EnsureProjectNotArchived(Project project)
        {
            if (project.IsArchived)
                throw new InvalidOperationException(
                    "Проект находится в архиве, действие недоступно");
        }

        /// <summary>
        /// Маппинг ProjectTag -> ProjectTagDto.
        /// </summary>
        private static ProjectTagDto MapTag(ProjectTag tag) => new()
        {
            Id = tag.Id,
            Name = tag.Name,
            Color = tag.Color,
            ProjectsCount = tag.ProjectLinks?.Count ?? 0,
            CreatedAt = tag.CreatedAt
        };
    }
}