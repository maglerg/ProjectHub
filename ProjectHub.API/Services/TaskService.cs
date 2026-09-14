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
        private readonly NotificationService _notificationService;

        // Системные ключи колонок
        public const string KeyNotStarted = "NotStarted";
        public const string KeyInProgress = "InProgress";
        public const string KeyCompleted = "Completed";

        public TaskService(
    AppDbContext db,
    ILogger<TaskService> logger,
    NotificationService notificationService)
        {
            _db = db;
            _logger = logger;
            _notificationService = notificationService;
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

            return await BuildTaskDtoAsync(task.Id, userId);
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

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        // ─────────────────────────────────────────────────────────
        //  Снять себя с задачи
        // ─────────────────────────────────────────────────────────
        public async Task<TaskDto> LeaveTaskAsync(string projectCode, Guid taskId, Guid userId, RemoveAssigneeDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;

            // Определяем, кого снимаем
            Guid targetUserId;

            if (string.IsNullOrWhiteSpace(dto?.Email))
            {
                // Снять себя
                targetUserId = userId;
            }
            else
            {
                // Снять конкретного человека — только owner
                if (!isOwner)
                    throw new UnauthorizedAccessException(
                        "Снимать других исполнителей может только владелец проекта");

                var targetUser = await _db.Users
                    .FirstOrDefaultAsync(u => u.Email == dto.Email)
                    ?? throw new KeyNotFoundException("Пользователь с таким email не найден");

                targetUserId = targetUser.Id;
            }

            var assignee = task.Assignees.FirstOrDefault(a => a.UserId == targetUserId);
            if (assignee == null)
                return await BuildTaskDtoAsync(task.Id, userId); // уже не назначен — ничего не делаем

            _db.TaskAssignees.Remove(assignee);
            task.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
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

            return await BuildTaskDtoAsync(task.Id, userId);
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
        public async Task DeleteTaskAsync(string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (project.OwnerId != userId)
                throw new UnauthorizedAccessException(
                    "Удалять задачи может только владелец проекта");

            var task = await _db.ProjectTasks
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            _db.ProjectTasks.Remove(task);
            await _db.SaveChangesAsync();

            _logger.LogInformation(
                $"Задача {taskId} удалена из проекта {projectCode} пользователем {userId}");
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

        private async Task<TaskDto> BuildTaskDtoAsync(Guid taskId, Guid userId)
        {
            var task = await _db.ProjectTasks
                .Include(t => t.Column)
                .Include(t => t.CreatedBy)
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .Include(t => t.Project)
                .FirstAsync(t => t.Id == taskId);

            var dto = MapTask(task);
            dto.CanEdit = task.Project.OwnerId == userId
                          || task.Assignees.Any(a => a.UserId == userId);
            return dto;
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
        public async Task<TaskDto> GetTaskByIdAsync(string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Column)
                .Include(t => t.CreatedBy)
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            // 📌 Пользователь открыл задачу — уведомления о комментариях к ней можно удалить
            await _notificationService.DeleteTaskCommentNotificationsAsync(userId, taskId);

            var dto = MapTask(task);
            dto.IsOwner = project.OwnerId == userId;
            dto.CanEdit = project.OwnerId == userId
                          || task.Assignees.Any(a => a.UserId == userId);
            return dto;
        }

        // ─────────────────────────────────────────────────────────
        //  Обновить задачу (title, description, columnId)
        //  Права: assignee ИЛИ owner
        // ─────────────────────────────────────────────────────────
        public async Task<TaskDto> UpdateTaskAsync(string projectCode, Guid taskId, Guid userId, UpdateTaskDto dto)
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
                    "Редактировать задачу может только исполнитель или владелец проекта");

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Название задачи не может быть пустым");

            // Меняем колонку, если указана и отличается
            if (dto.ColumnId != Guid.Empty && dto.ColumnId != task.ColumnId)
            {
                var column = await _db.TaskColumns
                    .FirstOrDefaultAsync(c => c.Id == dto.ColumnId && c.ProjectId == project.Id)
                    ?? throw new InvalidOperationException("Колонка не найдена в этом проекте");

                task.ColumnId = column.Id;

                if (string.Equals(column.SystemKey, KeyCompleted, StringComparison.OrdinalIgnoreCase))
                    task.CompletedAt = DateTime.UtcNow;
                else
                    task.CompletedAt = null;
            }

            task.Title = dto.Title.Trim();
            task.Description = dto.Description;
            task.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }
        //  Получить комментарии задачи
        // ─────────────────────────────────────────────────────────
        public async Task<List<TaskCommentDto>> GetCommentsAsync(
            string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            // Проверяем, что задача принадлежит проекту
            var taskExists = await _db.ProjectTasks
                .AnyAsync(t => t.Id == taskId && t.ProjectId == project.Id);

            if (!taskExists)
                throw new KeyNotFoundException("Задача не найдена");

            var comments = await _db.TaskComments
                .Where(c => c.TaskId == taskId)
                .Include(c => c.Author)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            return comments.Select(MapComment).ToList();
        }

        // ─────────────────────────────────────────────────────────
        //  Добавить комментарий к задаче
        //  Права: любой участник проекта
        //  После добавления — уведомление всем assignee (кроме автора)
        // ─────────────────────────────────────────────────────────
        public async Task<TaskCommentDto> AddCommentAsync(
            string projectCode, Guid taskId, Guid userId, CreateTaskCommentDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (string.IsNullOrWhiteSpace(dto.Text))
                throw new InvalidOperationException("Комментарий не может быть пустым");

            var text = dto.Text.Trim();
            if (text.Length > 2000)
                throw new InvalidOperationException("Комментарий слишком длинный (макс. 2000 символов)");

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var author = await _db.Users.FindAsync(userId)
                ?? throw new KeyNotFoundException("Пользователь не найден");

            var comment = new TaskComment
            {
                Id = Guid.NewGuid(),
                TaskId = taskId,
                AuthorId = userId,
                Text = text,
                CreatedAt = DateTime.UtcNow
            };

            _db.TaskComments.Add(comment);
            await _db.SaveChangesAsync();

            // 📨 Уведомления всем assignee, кроме автора
            var preview = text.Length > 60 ? text.Substring(0, 60) + "…" : text;

            foreach (var assignee in task.Assignees)
            {
                if (assignee.UserId == userId) continue;

                await _notificationService.CreateNotificationAsync(
                    assignee.UserId,
                    "💬 Новый комментарий к задаче",
                    $"{author.Name}: {preview}",
                    NotificationType.NewTaskComment,
                    $"/projects/{project.PublicCode}/tasks/{taskId}",
                    taskId  
                );
            }

            comment.Author = author;
            return MapComment(comment);
        }

        // ─────────────────────────────────────────────────────────
        //  Маппер
        // ─────────────────────────────────────────────────────────
        private static TaskCommentDto MapComment(TaskComment c) => new()
        {
            Id = c.Id,
            Text = c.Text,
            AuthorEmail = c.Author?.Email ?? string.Empty,
            AuthorName = c.Author?.Name ?? string.Empty,
            AuthorSpecialization = c.Author?.Specialization.ToString(),
            CreatedAt = c.CreatedAt
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