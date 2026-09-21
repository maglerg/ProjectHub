using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.NoteDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class NoteService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<NoteService> _logger;

        private const int MaxTitleLength = 200;
        private const int MaxContentLength = 5000;

        public NoteService(AppDbContext db, ILogger<NoteService> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════
        //  СПИСОК
        // ═══════════════════════════════════════════════════════

        /// <summary>
        /// Список заметок пользователя.
        ///   • filter = All   — все заметки
        ///   • filter = Free  — только свободные
        ///   • filter = Project + projectCode — заметки конкретного проекта
        /// </summary>
        public async Task<List<NoteDto>> GetUserNotesAsync(
            Guid userId,
            NoteFilter filter = NoteFilter.All,
            string? projectCode = null,
            string? search = null)
        {
            var query = _db.Notes
                .Where(n => n.AuthorId == userId)
                .Include(n => n.Project)
                .AsQueryable();

            if (filter == NoteFilter.Free)
            {
                query = query.Where(n => n.ProjectId == null);
            }
            else if (filter == NoteFilter.Project)
            {
                if (string.IsNullOrWhiteSpace(projectCode))
                    throw new InvalidOperationException(
                        "Для фильтра Project нужен projectCode");

                var project = await GetProjectByCodeOrThrowAsync(projectCode);

                // Проверяем, что пользователь состоит в проекте — иначе нет смысла
                // показывать ему проектные заметки в этом контексте.
                await EnsureProjectAccessAsync(project.Id, userId);

                query = query.Where(n => n.ProjectId == project.Id);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(n =>
                    (n.Title != null && n.Title.ToLower().Contains(s)) ||
                    n.Content.ToLower().Contains(s));
            }

            var notes = await query
    .OrderByDescending(n => n.IsPinned)   // сначала закреплённые
    .ThenByDescending(n => n.UpdatedAt)   // потом по дате обновления
    .ToListAsync();

            // Проверяем доступность проектов одним запросом
            var projectIds = notes
                .Where(n => n.ProjectId.HasValue)
                .Select(n => n.ProjectId!.Value)
                .Distinct()
                .ToList();

            var accessibleProjectIds = await GetAccessibleProjectIdsAsync(
                userId, projectIds);

            return notes
                .Select(n => MapNote(n, accessibleProjectIds.Contains(n.ProjectId ?? Guid.Empty)))
                .ToList();
        }

        // ═══════════════════════════════════════════════════════
        //  ОДНА ЗАМЕТКА
        // ═══════════════════════════════════════════════════════

        public async Task<NoteDto> GetNoteAsync(Guid noteId, Guid userId)
        {
            var note = await _db.Notes
                .Include(n => n.Project)
                .FirstOrDefaultAsync(n => n.Id == noteId && n.AuthorId == userId)
                ?? throw new KeyNotFoundException("Заметка не найдена");

            var hasAccess = false;
            if (note.ProjectId.HasValue)
            {
                var ids = await GetAccessibleProjectIdsAsync(
                    userId, new List<Guid> { note.ProjectId.Value });
                hasAccess = ids.Contains(note.ProjectId.Value);
            }

            return MapNote(note, hasAccess);
        }

        // ═══════════════════════════════════════════════════════
        //  СОЗДАНИЕ
        // ═══════════════════════════════════════════════════════

        public async Task<NoteDto> CreateNoteAsync(Guid userId, CreateNoteDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new InvalidOperationException("Текст заметки не может быть пустым");

            if (dto.Content.Length > MaxContentLength)
                throw new InvalidOperationException(
                    $"Текст заметки не длиннее {MaxContentLength} символов");

            if (!string.IsNullOrWhiteSpace(dto.Title) && dto.Title.Length > MaxTitleLength)
                throw new InvalidOperationException(
                    $"Заголовок не длиннее {MaxTitleLength} символов");

            Guid? projectId = null;

            if (!string.IsNullOrWhiteSpace(dto.ProjectCode))
            {
                var project = await GetProjectByCodeOrThrowAsync(dto.ProjectCode);
                await EnsureProjectAccessAsync(project.Id, userId);
                projectId = project.Id;
            }

            var note = new Note
            {
                Id = Guid.NewGuid(),
                AuthorId = userId,
                ProjectId = projectId,
                Title = string.IsNullOrWhiteSpace(dto.Title) ? null : dto.Title.Trim(),
                Content = dto.Content.Trim(),
                Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim(),
                IsPinned = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Notes.Add(note);
            await _db.SaveChangesAsync();

            // Подтягиваем проект для DTO (если задан)
            if (projectId.HasValue)
            {
                await _db.Entry(note).Reference(n => n.Project).LoadAsync();
            }

            return MapNote(note, hasProjectAccess: projectId.HasValue);
        }

        // ═══════════════════════════════════════════════════════
        //  ОБНОВЛЕНИЕ
        // ═══════════════════════════════════════════════════════

        public async Task<NoteDto> UpdateNoteAsync(Guid noteId, Guid userId, UpdateNoteDto dto)
        {
            var note = await _db.Notes
                .Include(n => n.Project)
                .FirstOrDefaultAsync(n => n.Id == noteId && n.AuthorId == userId)
                ?? throw new KeyNotFoundException("Заметка не найдена");

            if (string.IsNullOrWhiteSpace(dto.Content))
                throw new InvalidOperationException("Текст заметки не может быть пустым");

            if (dto.Content.Length > MaxContentLength)
                throw new InvalidOperationException(
                    $"Текст заметки не длиннее {MaxContentLength} символов");

            if (!string.IsNullOrWhiteSpace(dto.Title) && dto.Title.Length > MaxTitleLength)
                throw new InvalidOperationException(
                    $"Заголовок не длиннее {MaxTitleLength} символов");

            note.Title = string.IsNullOrWhiteSpace(dto.Title) ? null : dto.Title.Trim();
            note.Content = dto.Content.Trim();
            note.Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim();
            note.IsPinned = dto.IsPinned;
            note.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var hasAccess = false;
            if (note.ProjectId.HasValue)
            {
                var ids = await GetAccessibleProjectIdsAsync(
                    userId, new List<Guid> { note.ProjectId.Value });
                hasAccess = ids.Contains(note.ProjectId.Value);
            }

            return MapNote(note, hasAccess);
        }

        // ═══════════════════════════════════════════════════════
        //  ПРИВЯЗКА / ОТВЯЗКА
        // ═══════════════════════════════════════════════════════

        public async Task<NoteDto> AttachToProjectAsync(
            Guid noteId, Guid userId, AttachNoteDto dto)
        {
            var note = await _db.Notes
                .FirstOrDefaultAsync(n => n.Id == noteId && n.AuthorId == userId)
                ?? throw new KeyNotFoundException("Заметка не найдена");

            if (string.IsNullOrWhiteSpace(dto.ProjectCode))
            {
                // Отвязать
                note.ProjectId = null;
                note.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return MapNote(note, hasProjectAccess: false);
            }

            var project = await GetProjectByCodeOrThrowAsync(dto.ProjectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            note.ProjectId = project.Id;
            note.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            note.Project = project;
            return MapNote(note, hasProjectAccess: true);
        }

        // ═══════════════════════════════════════════════════════
        //  УДАЛЕНИЕ
        // ═══════════════════════════════════════════════════════

        public async Task DeleteNoteAsync(Guid noteId, Guid userId)
        {
            var note = await _db.Notes
                .FirstOrDefaultAsync(n => n.Id == noteId && n.AuthorId == userId)
                ?? throw new KeyNotFoundException("Заметка не найдена");

            _db.Notes.Remove(note);
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                $"Заметка {noteId} удалена пользователем {userId}");
        }

        // ═══════════════════════════════════════════════════════
        //  ВСПОМОГАТЕЛЬНЫЕ
        // ═══════════════════════════════════════════════════════

        private async Task<Project> GetProjectByCodeOrThrowAsync(string code)
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (project == null)
                throw new KeyNotFoundException("Проект с таким кодом не найден");

            return project;
        }

        private async Task EnsureProjectAccessAsync(Guid projectId, Guid userId)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
            if (project == null)
                throw new KeyNotFoundException("Проект не найден");

            var isOwner = project.OwnerId == userId;
            var isMember = await _db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (!isOwner && !isMember)
                throw new UnauthorizedAccessException("Нет доступа к этому проекту");
        }

        /// <summary>
        /// Возвращает набор ProjectId из переданных, к которым у пользователя есть доступ.
        /// </summary>
        private async Task<HashSet<Guid>> GetAccessibleProjectIdsAsync(
            Guid userId, List<Guid> projectIds)
        {
            if (projectIds == null || projectIds.Count == 0)
                return new HashSet<Guid>();

            var ownedIds = await _db.Projects
                .Where(p => projectIds.Contains(p.Id) && p.OwnerId == userId)
                .Select(p => p.Id)
                .ToListAsync();

            var memberIds = await _db.ProjectMembers
                .Where(pm => projectIds.Contains(pm.ProjectId) && pm.UserId == userId)
                .Select(pm => pm.ProjectId)
                .ToListAsync();

            return ownedIds.Concat(memberIds).ToHashSet();
        }

        private static NoteDto MapNote(Note note, bool hasProjectAccess) => new()
        {
            Id = note.Id,
            Title = note.Title,
            Content = note.Content,
            Color = note.Color,
            IsPinned = note.IsPinned,

            ProjectId = note.ProjectId,
            ProjectCode = note.Project?.PublicCode,
            ProjectName = note.Project?.Name,

            ProjectAccessible = hasProjectAccess,

            CreatedAt = note.CreatedAt,
            UpdatedAt = note.UpdatedAt
        };
    }
}