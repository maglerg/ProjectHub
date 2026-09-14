using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class TaskService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<TaskService> _logger;

        // Системные ключи колонок
        public const string KeyNotStarted = "NotStarted";
        public const string KeyInProgress = "InProgress";
        public const string KeyCompleted = "Completed";

        public TaskService(AppDbContext db, ILogger<TaskService> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────
        //  Доска: колонки + задачи
        // ─────────────────────────────────────────────────────────
        public async Task<List<TaskColumnDto>> GetBoardByCodeAsync(string projectCode, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var columns = await _db.TaskColumns
                .Where(c => c.ProjectId == project.Id)
                .OrderBy(c => c.Order)
                .Include(c => c.Tasks).ThenInclude(t => t.CreatedBy)
                .Include(c => c.Tasks).ThenInclude(t => t.Assignees).ThenInclude(a => a.User)
                .ToListAsync();

            return columns.Select(MapColumn).ToList();
        }

        // ─────────────────────────────────────────────────────────
        //  Создать задачу
        // ─────────────────────────────────────────────────────────
        public async Task<TaskDto> CreateTaskAsync(string projectCode, Guid userId, CreateTaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Название задачи не может быть пустым");

            Guid columnId;
            if (dto.ColumnId.HasValue)
            {
                var col = await _db.TaskColumns
                    .FirstOrDefaultAsync(c => c.Id == dto.ColumnId.Value && c.ProjectId == project.Id)
                    ?? throw new InvalidOperationException("Колонка не найдена в этом проекте");
                columnId = col.Id;
            }
            else
            {
                var firstCol = await _db.TaskColumns
                    .Where(c => c.ProjectId == project.Id)
                    .OrderBy(c => c.Order)
                    .FirstOrDefaultAsync()
                    ?? throw new InvalidOperationException("В проекте нет колонок задач");

                columnId = firstCol.Id;
            }

            var task = new ProjectTask
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                ColumnId = columnId,
                Title = dto.Title.Trim(),
                Description = dto.Description,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.ProjectTasks.Add(task);
            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id);
        }

        // ─────────────────────────────────────────────────────────
        //  Взять задачу (назначить себя исполнителем)
        // ─────────────────────────────────────────────────────────
        public async Task<TaskDto> TakeTaskAsync(string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            if (!task.Assignees.Any(a => a.UserId == userId))
            {
                _db.TaskAssignees.Add(new TaskAssignee
                {
                    Id = Guid.NewGuid(),
                    TaskId = task.Id,
                    UserId = userId,
                    AssignedAt = DateTime.UtcNow
                });

                task.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return await BuildTaskDtoAsync(task.Id);
        }

        // ─────────────────────────────────────────────────────────
        //  Снять себя с задачи
        // ─────────────────────────────────────────────────────────
        public async Task<TaskDto> LeaveTaskAsync(string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var assignee = task.Assignees.FirstOrDefault(a => a.UserId == userId);
            if (assignee != null)
            {
                _db.TaskAssignees.Remove(assignee);
                task.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return await BuildTaskDtoAsync(task.Id);
        }

        // ─────────────────────────────────────────────────────────
        //  Переместить задачу в другую колонку
        //  Права: исполнитель ИЛИ владелец проекта
        // ─────────────────────────────────────────────────────────
        public async Task<TaskDto> MoveTaskAsync(string projectCode, Guid taskId, Guid userId, MoveTaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Перемещать задачу может только исполнитель или владелец проекта");

            var column = await _db.TaskColumns
                .FirstOrDefaultAsync(c => c.Id == dto.ColumnId && c.ProjectId == project.Id)
                ?? throw new InvalidOperationException("Колонка не найдена в этом проекте");

            task.ColumnId = column.Id;
            task.UpdatedAt = DateTime.UtcNow;

            // Фиксируем дату завершения при переносе в "Завершено"
            if (string.Equals(column.SystemKey, KeyCompleted, StringComparison.OrdinalIgnoreCase))
                task.CompletedAt = DateTime.UtcNow;
            else
                task.CompletedAt = null;

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id);
        }

        // ─────────────────────────────────────────────────────────
        //  Вспомогательные
        // ─────────────────────────────────────────────────────────
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

        private async Task<TaskDto> BuildTaskDtoAsync(Guid taskId)
        {
            var task = await _db.ProjectTasks
                .Include(t => t.Column)
                .Include(t => t.CreatedBy)
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .FirstAsync(t => t.Id == taskId);

            return MapTask(task);
        }

        private static TaskColumnDto MapColumn(TaskColumn c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            Order = c.Order,
            SystemKey = c.SystemKey,
            Tasks = c.Tasks
                .OrderBy(t => t.CreatedAt)
                .Select(MapTask)
                .ToList()
        };

        private static TaskDto MapTask(ProjectTask t) => new()
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            ColumnId = t.ColumnId,
            ColumnName = t.Column?.Name ?? string.Empty,
            CreatedByEmail = t.CreatedBy?.Email ?? string.Empty,
            CreatedByName = t.CreatedBy?.Name ?? string.Empty,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            CompletedAt = t.CompletedAt,
            Assignees = t.Assignees.Select(a => new TaskAssigneeDto
            {
                Email = a.User?.Email ?? string.Empty,
                Name = a.User?.Name ?? string.Empty,
                Specialization = a.User?.Specialization.ToString(),
                AssignedAt = a.AssignedAt
            }).ToList()
        };
    }
}