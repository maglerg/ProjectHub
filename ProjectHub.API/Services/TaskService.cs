using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.TaskDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services
{
    public class TaskService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<TaskService> _logger;
        private readonly NotificationService _notificationService;
        private readonly FileStorageService _fileStorage;
        private readonly IConfiguration _configuration;
        private readonly ActivityService _activity;

        // Системные ключи колонок
        public const string KeyNotStarted = "NotStarted";
        public const string KeyInProgress = "InProgress";
        public const string KeyCompleted = "Completed";

        private const int MaxSubtasksPerTask = 50;
        private const int MaxTagsPerTask = 10;

        private static readonly string[] AllowedExtensions =
        {
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".txt", ".md", ".csv",
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
            ".zip", ".rar", ".7z",
            ".json", ".xml", ".yaml", ".yml"
        };

        public TaskService(
            AppDbContext db,
            ILogger<TaskService> logger,
            NotificationService notificationService,
            FileStorageService fileStorage,
            IConfiguration configuration,
            ActivityService activity)
        {
            _db = db;
            _logger = logger;
            _notificationService = notificationService;
            _fileStorage = fileStorage;
            _configuration = configuration;
            _activity = activity;
        }

        // ═══════════════════════════════════════════════════════════
        //  ДОСКА
        // ═══════════════════════════════════════════════════════════

        public async Task<List<TaskColumnDto>> GetBoardByCodeAsync(string projectCode, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var columns = await _db.TaskColumns
                .Where(c => c.ProjectId == project.Id)
                .OrderBy(c => c.Order)
                .Include(c => c.Tasks).ThenInclude(t => t.CreatedBy)
                .Include(c => c.Tasks).ThenInclude(t => t.Assignees).ThenInclude(a => a.User)
                .Include(c => c.Tasks).ThenInclude(t => t.Attachments)
                .Include(c => c.Tasks).ThenInclude(t => t.Subtasks)
                .Include(c => c.Tasks).ThenInclude(t => t.Project)
                .Include(c => c.Tasks).ThenInclude(t => t.TagLinks).ThenInclude(l => l.Tag)
                .ToListAsync();

            return columns.Select(c => MapColumn(c, project.OwnerId, userId)).ToList();
        }

        // ═══════════════════════════════════════════════════════════
        //  ПРОГРЕСС ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

        public async Task<ProjectProgressDto> GetProjectProgressAsync(
            string projectCode, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var tasks = await _db.ProjectTasks
                .Where(t => t.ProjectId == project.Id)
                .Include(t => t.Column)
                .ToListAsync();

            if (tasks.Count == 0)
            {
                return new ProjectProgressDto
                {
                    ProgressPercent = 0,
                    TotalTasks = 0,
                    CompletedTasks = 0,
                    InProgressTasks = 0,
                    NotStartedTasks = 0
                };
            }

            var total = tasks.Count;

            var completed = tasks.Count(t => IsKey(t.Column, KeyCompleted));
            var inProgress = tasks.Count(t => IsKey(t.Column, KeyInProgress));
            var notStarted = total - completed - inProgress;

            var sumWeight = tasks.Sum(t => t.Column?.ProgressWeight ?? 0);
            var progress = sumWeight / total * 100.0;

            return new ProjectProgressDto
            {
                ProgressPercent = Math.Round(progress, 1),
                TotalTasks = total,
                CompletedTasks = completed,
                InProgressTasks = inProgress,
                NotStartedTasks = notStarted
            };
        }

        // ═══════════════════════════════════════════════════════════
        //  СОЗДАНИЕ ЗАДАЧИ
        // ═══════════════════════════════════════════════════════════

        public async Task<TaskDto> CreateTaskAsync(string projectCode, Guid userId, CreateTaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Название задачи не может быть пустым");

            ValidateStartDate(project, dto.StartDate, dto.DueDate);
            ValidateDueDate(project, dto.StartDate, dto.DueDate);

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
                Priority = dto.Priority,
                StartDate = dto.StartDate,
                DueDate = dto.DueDate,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow
            };

            _db.ProjectTasks.Add(task);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.TaskCreated,
                summary: $"Создана задача: {task.Title}",
                link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                relatedEntityId: task.Id
            );

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ВЗЯТЬ / СНЯТЬ ЗАДАЧУ
        // ═══════════════════════════════════════════════════════════

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

                await _activity.LogAsync(
                    project.Id,
                    userId,
                    ActivityType.TaskTaken,
                    summary: $"Взял(а) задачу: {task.Title}",
                    link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                    relatedEntityId: task.Id
                );

                await _db.SaveChangesAsync();
            }

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        public async Task<TaskDto> LeaveTaskAsync(string projectCode, Guid taskId, Guid userId, RemoveAssigneeDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;

            Guid targetUserId;

            if (string.IsNullOrWhiteSpace(dto?.Email))
            {
                targetUserId = userId;
            }
            else
            {
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
                return await BuildTaskDtoAsync(task.Id, userId);

            var removedUser = assignee.User?.Name ?? dto?.Email ?? "пользователь";

            _db.TaskAssignees.Remove(assignee);
            task.UpdatedAt = DateTime.UtcNow;

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.TaskLeft,
                summary: $"Снял(а) с задачи «{task.Title}»: {removedUser}",
                link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                relatedEntityId: task.Id
            );

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ПЕРЕМЕЩЕНИЕ ЗАДАЧИ
        // ═══════════════════════════════════════════════════════════

        public async Task<TaskDto> MoveTaskAsync(string projectCode, Guid taskId, Guid userId, MoveTaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .Include(t => t.Subtasks)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Перемещать задачу может только исполнитель или владелец проекта");

            var targetColumn = await _db.TaskColumns
                .FirstOrDefaultAsync(c => c.Id == dto.ColumnId && c.ProjectId == project.Id)
                ?? throw new InvalidOperationException("Колонка не найдена в этом проекте");

            // ── Проверки для задач с подзадачами ──
            if (task.Subtasks.Any())
            {
                var anyCompleted = task.Subtasks.Any(s => s.IsCompleted);
                var allCompleted = task.Subtasks.All(s => s.IsCompleted);

                if (IsKey(targetColumn, KeyNotStarted) && anyCompleted)
                    throw new InvalidOperationException(
                        "Нельзя вернуть в \"Не начато\": есть выполненные подзадачи. " +
                        "Сначала снимите с них галочки.");

                if (IsKey(targetColumn, KeyCompleted) && !allCompleted)
                    throw new InvalidOperationException(
                        "Нельзя завершить задачу: не все подзадачи выполнены.");
            }

            var oldColumn = await _db.TaskColumns
                .FirstOrDefaultAsync(c => c.Id == task.ColumnId);
            var oldColumnName = oldColumn?.Name ?? "—";

            task.ColumnId = targetColumn.Id;
            task.UpdatedAt = DateTime.UtcNow;

            var isCompleted = IsKey(targetColumn, KeyCompleted);

            if (isCompleted)
            {
                task.CompletedAt = DateTime.UtcNow;

                await _activity.LogAsync(
                    project.Id,
                    userId,
                    ActivityType.TaskCompleted,
                    summary: $"Завершена задача: {task.Title}",
                    link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                    relatedEntityId: task.Id
                );
            }
            else
            {
                task.CompletedAt = null;

                await _activity.LogAsync(
                    project.Id,
                    userId,
                    ActivityType.TaskMoved,
                    summary: $"Задача «{task.Title}» перемещена: {oldColumnName} → {targetColumn.Name}",
                    link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                    relatedEntityId: task.Id
                );
            }

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  УДАЛЕНИЕ / ОБНОВЛЕНИЕ ЗАДАЧИ
        // ═══════════════════════════════════════════════════════════

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

            var title = task.Title;

            _db.ProjectTasks.Remove(task);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.TaskDeleted,
                summary: $"Удалена задача: {title}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

            _logger.LogInformation(
                $"Задача {taskId} удалена из проекта {projectCode} пользователем {userId}");
        }

        public async Task<TaskDto> UpdateTaskAsync(string projectCode, Guid taskId, Guid userId, UpdateTaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .Include(t => t.Subtasks)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Редактировать задачу может только исполнитель или владелец проекта");

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Название задачи не может быть пустым");

            ValidateStartDate(project, dto.StartDate, dto.DueDate);
            ValidateDueDate(project, dto.StartDate, dto.DueDate);

            var oldPriority = task.Priority;
            var oldDue = task.DueDate;

            var movedToCompleted = false;

            if (dto.ColumnId != Guid.Empty && dto.ColumnId != task.ColumnId)
            {
                var column = await _db.TaskColumns
                    .FirstOrDefaultAsync(c => c.Id == dto.ColumnId && c.ProjectId == project.Id)
                    ?? throw new InvalidOperationException("Колонка не найдена в этом проекте");

                // ── Проверки для задач с подзадачами ──
                if (task.Subtasks.Any())
                {
                    var anyCompleted = task.Subtasks.Any(s => s.IsCompleted);
                    var allCompleted = task.Subtasks.All(s => s.IsCompleted);

                    if (IsKey(column, KeyNotStarted) && anyCompleted)
                        throw new InvalidOperationException(
                            "Нельзя вернуть в \"Не начато\": есть выполненные подзадачи.");

                    if (IsKey(column, KeyCompleted) && !allCompleted)
                        throw new InvalidOperationException(
                            "Нельзя завершить задачу: не все подзадачи выполнены.");
                }

                task.ColumnId = column.Id;

                if (IsKey(column, KeyCompleted))
                {
                    task.CompletedAt = DateTime.UtcNow;
                    movedToCompleted = true;
                }
                else
                {
                    task.CompletedAt = null;
                }
            }

            task.Title = dto.Title.Trim();
            task.Description = dto.Description;
            task.Priority = dto.Priority;
            task.StartDate = dto.StartDate;
            task.DueDate = dto.DueDate;
            task.UpdatedAt = DateTime.UtcNow;

            // Логируем: завершение, смену приоритета, смену дедлайна или общее обновление
            if (movedToCompleted)
            {
                await _activity.LogAsync(
                    project.Id,
                    userId,
                    ActivityType.TaskCompleted,
                    summary: $"Завершена задача: {task.Title}",
                    link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                    relatedEntityId: task.Id
                );
            }
            else
            {
                if (oldPriority != dto.Priority)
                {
                    await _activity.LogAsync(
                        project.Id,
                        userId,
                        ActivityType.TaskPriorityChanged,
                        summary: $"Приоритет задачи «{task.Title}»: {oldPriority} → {dto.Priority}",
                        link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                        relatedEntityId: task.Id
                    );
                }

                if (oldDue != dto.DueDate)
                {
                    await _activity.LogAsync(
                        project.Id,
                        userId,
                        ActivityType.TaskDueDateChanged,
                        summary: $"Дедлайн задачи «{task.Title}» изменён",
                        link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                        relatedEntityId: task.Id
                    );
                }

                await _activity.LogAsync(
                    project.Id,
                    userId,
                    ActivityType.TaskUpdated,
                    summary: $"Обновлена задача: {task.Title}",
                    link: $"/projects/{project.PublicCode}/tasks/{task.Id}",
                    relatedEntityId: task.Id
                );
            }

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ПОЛУЧЕНИЕ ЗАДАЧИ
        // ═══════════════════════════════════════════════════════════

        public async Task<TaskDto> GetTaskByIdAsync(string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Column)
                .Include(t => t.CreatedBy)
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .Include(t => t.Attachments).ThenInclude(a => a.UploadedBy)
                .Include(t => t.Subtasks)
                .Include(t => t.Project)
                .Include(t => t.TagLinks).ThenInclude(l => l.Tag)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            await _notificationService.DeleteTaskCommentNotificationsAsync(userId, taskId);

            var dto = MapTask(task);

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            dto.IsOwner = isOwner;
            dto.CanEdit = isOwner || isAssignee;
            dto.CanUploadAttachments = dto.CanEdit;
            dto.ProjectDeadline = project.Deadline;

            dto.Attachments = task.Attachments
                .OrderBy(a => a.UploadedAt)
                .Select(a => MapAttachment(
                    a,
                    canDelete: isOwner || isAssignee || a.UploadedById == userId))
                .ToList();

            dto.Subtasks = task.Subtasks
                .OrderBy(s => s.Order)
                .Select(MapSubtask)
                .ToList();
            dto.HasSubtasks = task.Subtasks.Any();
            dto.TotalSubtasksCount = task.Subtasks.Count;
            dto.CompletedSubtasksCount = task.Subtasks.Count(s => s.IsCompleted);

            return dto;
        }

        // ═══════════════════════════════════════════════════════════
        //  КОММЕНТАРИИ
        // ═══════════════════════════════════════════════════════════

        public async Task<List<TaskCommentDto>> GetCommentsAsync(
            string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

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

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.CommentAdded,
                summary: $"Комментарий к задаче «{task.Title}»",
                link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

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

        // ═══════════════════════════════════════════════════════════
        //  ВЛОЖЕНИЯ
        // ═══════════════════════════════════════════════════════════

        public async Task<TaskAttachmentDto> UploadAttachmentAsync(
            string projectCode, Guid taskId, Guid userId,
            IFormFile file)
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
                    "Прикреплять файлы может только исполнитель или владелец проекта");

            if (file == null || file.Length == 0)
                throw new InvalidOperationException("Файл пуст");

            var maxSize = _configuration.GetValue<long?>("FileStorage:MaxFileSizeBytes")
                          ?? 20 * 1024 * 1024;
            if (file.Length > maxSize)
                throw new InvalidOperationException(
                    $"Файл слишком большой (макс. {maxSize / 1024 / 1024} МБ)");

            var maxCount = _configuration.GetValue<int?>("FileStorage:MaxAttachmentsPerTask")
                           ?? 10;
            var existingCount = await _db.TaskAttachments.CountAsync(a => a.TaskId == taskId);
            if (existingCount >= maxCount)
                throw new InvalidOperationException(
                    $"К задаче можно прикрепить не более {maxCount} файлов");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
                throw new InvalidOperationException(
                    $"Тип файла {extension} не разрешён");

            var storedFileName = await _fileStorage.SaveAsync(file.OpenReadStream(), extension);

            var attachment = new TaskAttachment
            {
                Id = Guid.NewGuid(),
                TaskId = taskId,
                UploadedById = userId,
                FileName = Path.GetFileName(file.FileName),
                StoredFileName = storedFileName,
                ContentType = string.IsNullOrWhiteSpace(file.ContentType)
                    ? "application/octet-stream"
                    : file.ContentType,
                SizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow
            };

            _db.TaskAttachments.Add(attachment);
            task.UpdatedAt = DateTime.UtcNow;

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.AttachmentAdded,
                summary: $"Файл к задаче «{task.Title}»: {attachment.FileName}",
                link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

            var uploader = await _db.Users.FindAsync(userId);
            attachment.UploadedBy = uploader!;

            return MapAttachment(attachment, canDelete: true);
        }

        public async Task<List<TaskAttachmentDto>> GetAttachmentsAsync(
            string projectCode, Guid taskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            var attachments = await _db.TaskAttachments
                .Where(a => a.TaskId == taskId)
                .Include(a => a.UploadedBy)
                .OrderBy(a => a.UploadedAt)
                .ToListAsync();

            return attachments.Select(a =>
            {
                var canDelete = isOwner || isAssignee || a.UploadedById == userId;
                return MapAttachment(a, canDelete);
            }).ToList();
        }

        public async Task<(Stream stream, string fileName, string contentType)> DownloadAttachmentAsync(
            string projectCode, Guid taskId, Guid attachmentId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var attachment = await _db.TaskAttachments
                .Include(a => a.Task)
                .FirstOrDefaultAsync(a => a.Id == attachmentId
                                          && a.TaskId == taskId
                                          && a.Task.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Вложение не найдено");

            var stream = _fileStorage.OpenRead(attachment.StoredFileName);
            return (stream, attachment.FileName, attachment.ContentType);
        }

        public async Task DeleteAttachmentAsync(
            string projectCode, Guid taskId, Guid attachmentId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var attachment = await _db.TaskAttachments
                .FirstOrDefaultAsync(a => a.Id == attachmentId && a.TaskId == taskId)
                ?? throw new KeyNotFoundException("Вложение не найдено");

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);
            var isUploader = attachment.UploadedById == userId;

            if (!isOwner && !isAssignee && !isUploader)
                throw new UnauthorizedAccessException(
                    "Удалять вложения может только исполнитель, автор загрузки или владелец");

            var fileName = attachment.FileName;
            var storedFileName = attachment.StoredFileName;

            _db.TaskAttachments.Remove(attachment);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.AttachmentDeleted,
                summary: $"Удалён файл из задачи «{task.Title}»: {fileName}",
                link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

            try { _fileStorage.Delete(storedFileName); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Не удалось удалить файл с диска {File}", storedFileName);
            }
        }

        // ═══════════════════════════════════════════════════════════
        //  ПОДЗАДАЧИ (чек-лист)
        // ═══════════════════════════════════════════════════════════

        public async Task<TaskSubtaskDto> AddSubtaskAsync(
            string projectCode, Guid taskId, Guid userId, CreateSubtaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Название подзадачи не может быть пустым");

            var task = await GetTaskWithSubtasksAsync(project.Id, taskId);

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);
            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Редактировать подзадачи может только исполнитель или владелец проекта");

            if (task.Subtasks.Count >= MaxSubtasksPerTask)
                throw new InvalidOperationException(
                    $"К задаче можно добавить не более {MaxSubtasksPerTask} подзадач");

            var nextOrder = task.Subtasks.Any()
                ? task.Subtasks.Max(s => s.Order) + 1
                : 0;

            var subtask = new TaskSubtask
            {
                Id = Guid.NewGuid(),
                TaskId = taskId,
                Title = dto.Title.Trim(),
                IsCompleted = false,
                Order = nextOrder,
                CreatedAt = DateTime.UtcNow
            };

            _db.TaskSubtasks.Add(subtask);

            // Если задача в "Завершено" — возвращаем в "В процессе"
            var column = await _db.TaskColumns
                .FirstOrDefaultAsync(c => c.Id == task.ColumnId);

            if (IsKey(column, KeyCompleted))
            {
                var inProgressColumn = await _db.TaskColumns
                    .FirstOrDefaultAsync(c => c.ProjectId == project.Id
                                              && c.SystemKey == KeyInProgress);

                if (inProgressColumn != null)
                {
                    task.ColumnId = inProgressColumn.Id;
                    task.CompletedAt = null;
                    task.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.SubtaskAdded,
                summary: $"Подзадача к «{task.Title}»: {subtask.Title}",
                link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

            return MapSubtask(subtask);
        }

        public async Task<TaskSubtaskDto> UpdateSubtaskAsync(
            string projectCode, Guid taskId, Guid subtaskId, Guid userId, UpdateSubtaskDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new InvalidOperationException("Название подзадачи не может быть пустым");

            var task = await GetTaskWithSubtasksAsync(project.Id, taskId);

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);
            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Редактировать подзадачи может только исполнитель или владелец проекта");

            var subtask = task.Subtasks.FirstOrDefault(s => s.Id == subtaskId)
                ?? throw new KeyNotFoundException("Подзадача не найдена");

            subtask.Title = dto.Title.Trim();

            await _db.SaveChangesAsync();

            return MapSubtask(subtask);
        }

        public async Task<TaskDto> ToggleSubtaskAsync(
            string projectCode, Guid taskId, Guid subtaskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await GetTaskWithSubtasksAsync(project.Id, taskId);

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);
            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Отмечать подзадачи может только исполнитель или владелец проекта");

            var subtask = task.Subtasks.FirstOrDefault(s => s.Id == subtaskId)
                ?? throw new KeyNotFoundException("Подзадача не найдена");

            subtask.IsCompleted = !subtask.IsCompleted;
            subtask.CompletedAt = subtask.IsCompleted ? DateTime.UtcNow : null;

            var column = await _db.TaskColumns
                .FirstOrDefaultAsync(c => c.Id == task.ColumnId);

            if (IsKey(column, KeyCompleted))
            {
                var inProgress = await _db.TaskColumns
                    .FirstOrDefaultAsync(c => c.ProjectId == project.Id
                                              && c.SystemKey == KeyInProgress);
                if (inProgress != null)
                {
                    task.ColumnId = inProgress.Id;
                    task.CompletedAt = null;
                    task.UpdatedAt = DateTime.UtcNow;
                }
            }
            else if (IsKey(column, KeyNotStarted))
            {
                var anyCompleted = task.Subtasks.Any(s => s.IsCompleted);
                if (anyCompleted)
                {
                    var inProgress = await _db.TaskColumns
                        .FirstOrDefaultAsync(c => c.ProjectId == project.Id
                                                  && c.SystemKey == KeyInProgress);
                    if (inProgress != null)
                    {
                        task.ColumnId = inProgress.Id;
                        task.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            await _activity.LogAsync(
                project.Id,
                userId,
                subtask.IsCompleted
                    ? ActivityType.SubtaskCompleted
                    : ActivityType.SubtaskUncompleted,
                summary: subtask.IsCompleted
                    ? $"Выполнена подзадача «{subtask.Title}» в задаче «{task.Title}»"
                    : $"Снята галочка с подзадачи «{subtask.Title}» в задаче «{task.Title}»",
                link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        public async Task<TaskDto> DeleteSubtaskAsync(
            string projectCode, Guid taskId, Guid subtaskId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await GetTaskWithSubtasksAsync(project.Id, taskId);

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);
            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Удалять подзадачи может только исполнитель или владелец проекта");

            var subtask = task.Subtasks.FirstOrDefault(s => s.Id == subtaskId)
                ?? throw new KeyNotFoundException("Подзадача не найдена");

            var subtaskTitle = subtask.Title;

            _db.TaskSubtasks.Remove(subtask);
            task.UpdatedAt = DateTime.UtcNow;

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.SubtaskDeleted,
                summary: $"Удалена подзадача «{subtaskTitle}» из задачи «{task.Title}»",
                link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                relatedEntityId: taskId
            );

            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ТЕГИ ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

        public async Task<List<TaskTagDto>> GetProjectTagsAsync(
            string projectCode, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var tags = await _db.TaskTags
                .Where(t => t.ProjectId == project.Id)
                .Include(t => t.TaskLinks)
                .OrderBy(t => t.Name)
                .ToListAsync();

            return tags.Select(MapTag).ToList();
        }

        public async Task<TaskTagDto> CreateTagAsync(
            string projectCode, Guid userId, CreateTagDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new InvalidOperationException("Название тега не может быть пустым");

            var name = dto.Name.Trim();
            if (name.Length > 50)
                throw new InvalidOperationException("Название тега не длиннее 50 символов");

            var exists = await _db.TaskTags
                .AnyAsync(t => t.ProjectId == project.Id && t.Name == name);

            if (exists)
                throw new InvalidOperationException(
                    $"Тег \"{name}\" уже существует в этом проекте");

            var tag = new TaskTag
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Name = name,
                Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.TaskTags.Add(tag);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.TagCreated,
                summary: $"Создан тег проекта: {tag.Name}",
                link: $"/projects/{project.PublicCode}",
                relatedEntityId: tag.Id
            );

            await _db.SaveChangesAsync();

            return MapTag(tag);
        }

        public async Task DeleteTagAsync(
            string projectCode, Guid tagId, Guid userId)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            if (project.OwnerId != userId)
                throw new UnauthorizedAccessException(
                    "Удалять теги может только владелец проекта");

            var tag = await _db.TaskTags
                .FirstOrDefaultAsync(t => t.Id == tagId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Тег не найден");

            var tagName = tag.Name;

            _db.TaskTags.Remove(tag);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.TagDeleted,
                summary: $"Удалён тег проекта: {tagName}",
                link: $"/projects/{project.PublicCode}",
                relatedEntityId: tagId
            );

            await _db.SaveChangesAsync();
        }

        public async Task<TaskDto> SetTaskTagsAsync(
            string projectCode, Guid taskId, Guid userId, SetTaskTagsDto dto)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            var task = await _db.ProjectTasks
                .Include(t => t.Assignees)
                .Include(t => t.TagLinks)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == project.Id)
                ?? throw new KeyNotFoundException("Задача не найдена");

            var isOwner = project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            if (!isOwner && !isAssignee)
                throw new UnauthorizedAccessException(
                    "Управлять тегами задачи может только исполнитель или владелец проекта");

            var tagIds = (dto.TagIds ?? new List<Guid>()).Distinct().ToList();

            if (tagIds.Count > MaxTagsPerTask)
                throw new InvalidOperationException(
                    $"К задаче можно привязать не более {MaxTagsPerTask} тегов");

            if (tagIds.Count > 0)
            {
                var validIds = await _db.TaskTags
                    .Where(t => t.ProjectId == project.Id && tagIds.Contains(t.Id))
                    .Select(t => t.Id)
                    .ToListAsync();

                if (validIds.Count != tagIds.Count)
                    throw new InvalidOperationException(
                        "Некоторые теги не найдены в этом проекте");

                tagIds = validIds;
            }

            // Определяем diff для истории
            var oldIds = task.TagLinks.Select(l => l.TagId).ToHashSet();
            var newIds = tagIds.ToHashSet();

            var addedIds = newIds.Except(oldIds).ToList();
            var removedIds = oldIds.Except(newIds).ToList();

            if (addedIds.Any() || removedIds.Any())
            {
                var addedNames = addedIds.Any()
                    ? await _db.TaskTags
                        .Where(t => addedIds.Contains(t.Id))
                        .Select(t => t.Name)
                        .ToListAsync()
                    : new List<string>();

                var removedNames = removedIds.Any()
                    ? await _db.TaskTags
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
                    addedIds.Any() ? ActivityType.TagAdded : ActivityType.TagRemoved,
                    summary: $"Теги задачи «{task.Title}» — {string.Join("; ", parts)}",
                    link: $"/projects/{project.PublicCode}/tasks/{taskId}",
                    relatedEntityId: taskId
                );
            }

            // Удаляем старые связи
            _db.TaskTagLinks.RemoveRange(task.TagLinks);

            // Добавляем новые
            foreach (var tid in tagIds)
            {
                _db.TaskTagLinks.Add(new TaskTagLink
                {
                    Id = Guid.NewGuid(),
                    TaskId = task.Id,
                    TagId = tid,
                    AddedAt = DateTime.UtcNow
                });
            }

            task.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return await BuildTaskDtoAsync(task.Id, userId);
        }

        public async Task<List<TaskDto>> SearchTasksByTagsAsync(
            string projectCode, Guid userId, List<Guid> tagIds)
        {
            var project = await GetProjectByCodeOrThrowAsync(projectCode);
            await EnsureProjectAccessAsync(project.Id, userId);

            tagIds = (tagIds ?? new List<Guid>()).Distinct().ToList();

            if (tagIds.Count == 0)
                return new List<TaskDto>();

            var query = _db.ProjectTasks
                .Where(t => t.ProjectId == project.Id)
                .Include(t => t.Column)
                .Include(t => t.CreatedBy)
                .Include(t => t.Assignees).ThenInclude(a => a.User)
                .Include(t => t.TagLinks).ThenInclude(l => l.Tag)
                .Include(t => t.Subtasks)
                .Include(t => t.Attachments)
                .Include(t => t.Project)
                .AsQueryable();

            // Задача должна содержать ВСЕ переданные теги
            foreach (var tagId in tagIds)
            {
                query = query.Where(t => t.TagLinks.Any(l => l.TagId == tagId));
            }

            var tasks = await query
                .OrderByDescending(t => t.UpdatedAt ?? t.CreatedAt)
                .ToListAsync();

            return tasks.Select(t => MapTaskForBoard(t, project.OwnerId, userId)).ToList();
        }

        // ═══════════════════════════════════════════════════════════
        //  ВСПОМОГАТЕЛЬНЫЕ
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Эффективный дедлайн задачи:
        ///   • если пользователь задал DueDate — используем его;
        ///   • иначе — дедлайн проекта.
        /// Вычисляется на лету, не сохраняется в БД.
        /// </summary>
        private static DateTime? GetEffectiveDueDate(ProjectTask task)
        {
            if (task.DueDate.HasValue)
                return task.DueDate;

            return task.Project?.Deadline;
        }

        /// <summary>
        /// Проверяет, что дата начала не позже дедлайна задачи и дедлайна проекта.
        /// </summary>
        private static void ValidateStartDate(
            Project project, DateTime? startDate, DateTime? dueDate)
        {
            if (!startDate.HasValue) return;

            if (startDate.Value > project.Deadline)
                throw new InvalidOperationException(
                    $"Дата начала задачи не может быть позже дедлайна проекта " +
                    $"({project.Deadline:dd.MM.yyyy HH:mm}).");

            if (dueDate.HasValue && startDate.Value > dueDate.Value)
                throw new InvalidOperationException(
                    "Дата начала задачи не может быть позже её дедлайна.");
        }

        /// <summary>
        /// Проверяет, что дедлайн задачи не позже дедлайна проекта
        /// и не раньше даты начала.
        /// </summary>
        private static void ValidateDueDate(
            Project project, DateTime? startDate, DateTime? dueDate)
        {
            if (!dueDate.HasValue) return;

            if (dueDate.Value > project.Deadline)
                throw new InvalidOperationException(
                    $"Дедлайн задачи не может быть позже дедлайна проекта " +
                    $"({project.Deadline:dd.MM.yyyy HH:mm}).");

            if (startDate.HasValue && dueDate.Value < startDate.Value)
                throw new InvalidOperationException(
                    "Дедлайн задачи не может быть раньше её даты начала.");
        }

        /// <summary>
        /// Эффективный приоритет: вычисляется на лету, не сохраняется в БД.
        ///   • задача завершена → None
        ///   • нет эффективного дедлайна → сохранённый Priority
        ///   • дедлайн просрочен или ≤ 3 дней → Critical
        ///   • ≤ 7 дней → не ниже High
        ///   • иначе → сохранённый Priority
        /// </summary>
        private static TaskPriority GetEffectivePriority(ProjectTask task)
        {
            if (task.CompletedAt.HasValue)
                return TaskPriority.None;

            var effectiveDue = GetEffectiveDueDate(task);

            if (!effectiveDue.HasValue)
                return task.Priority;

            var daysLeft = (effectiveDue.Value - DateTime.UtcNow).TotalDays;

            if (daysLeft <= 3)
                return TaskPriority.Critical;

            if (daysLeft <= 7)
                return task.Priority < TaskPriority.High ? TaskPriority.High : task.Priority;

            return task.Priority;
        }

        private async Task<Project> GetProjectByCodeOrThrowAsync(string code)
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (project == null)
                throw new KeyNotFoundException("Проект с таким кодом не найден");

            return project;
        }

        private async Task<ProjectTask> GetTaskWithSubtasksAsync(
            Guid projectId, Guid taskId)
        {
            var task = await _db.ProjectTasks
                .Include(t => t.Subtasks)
                .Include(t => t.Assignees)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId)
                ?? throw new KeyNotFoundException("Задача не найдена");

            return task;
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
                .Include(t => t.Attachments).ThenInclude(a => a.UploadedBy)
                .Include(t => t.Subtasks)
                .Include(t => t.TagLinks).ThenInclude(l => l.Tag)
                .FirstAsync(t => t.Id == taskId);

            var dto = MapTask(task);

            var isOwner = task.Project.OwnerId == userId;
            var isAssignee = task.Assignees.Any(a => a.UserId == userId);

            dto.IsOwner = isOwner;
            dto.CanEdit = isOwner || isAssignee;
            dto.CanUploadAttachments = dto.CanEdit;
            dto.ProjectDeadline = task.Project.Deadline;

            dto.Attachments = task.Attachments
                .OrderBy(a => a.UploadedAt)
                .Select(a => MapAttachment(
                    a,
                    canDelete: isOwner || isAssignee || a.UploadedById == userId))
                .ToList();

            dto.Subtasks = task.Subtasks
                .OrderBy(s => s.Order)
                .Select(MapSubtask)
                .ToList();
            dto.HasSubtasks = task.Subtasks.Any();
            dto.TotalSubtasksCount = task.Subtasks.Count;
            dto.CompletedSubtasksCount = task.Subtasks.Count(s => s.IsCompleted);

            return dto;
        }

        private TaskColumnDto MapColumn(TaskColumn c, Guid projectOwnerId, Guid userId)
        {
            return new TaskColumnDto
            {
                Id = c.Id,
                Name = c.Name,
                Order = c.Order,
                SystemKey = c.SystemKey,
                Tasks = c.Tasks
                    .Select(t => new
                    {
                        Task = t,
                        EffectivePriority = GetEffectivePriority(t)
                    })
                    .OrderByDescending(x => x.EffectivePriority)
                    .ThenBy(x => x.Task.CreatedAt)
                    .Select(x => MapTaskForBoard(x.Task, projectOwnerId, userId))
                    .ToList()
            };
        }

        private static TaskDto MapTaskForBoard(ProjectTask t, Guid projectOwnerId, Guid userId)
        {
            var dto = MapTask(t);

            var isOwner = projectOwnerId == userId;
            var isAssignee = t.Assignees.Any(a => a.UserId == userId);

            dto.IsOwner = isOwner;
            dto.CanEdit = isOwner || isAssignee;
            dto.CanUploadAttachments = dto.CanEdit;
            dto.AttachmentsCount = t.Attachments?.Count ?? 0;

            dto.HasSubtasks = t.Subtasks?.Any() ?? false;
            dto.TotalSubtasksCount = t.Subtasks?.Count ?? 0;
            dto.CompletedSubtasksCount = t.Subtasks?.Count(s => s.IsCompleted) ?? 0;

            dto.Tags = t.TagLinks?
                .Select(l => MapTag(l.Tag))
                .ToList() ?? new List<TaskTagDto>();

            return dto;
        }

        private static TaskDto MapTask(ProjectTask t) => new()
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            Priority = GetEffectivePriority(t).ToString(),
            ColumnId = t.ColumnId,
            ColumnName = t.Column?.Name ?? string.Empty,
            CreatedByEmail = t.CreatedBy?.Email ?? string.Empty,
            CreatedByName = t.CreatedBy?.Name ?? string.Empty,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            CompletedAt = t.CompletedAt,
            StartDate = t.StartDate,
            DueDate = t.DueDate,
            EffectiveDueDate = GetEffectiveDueDate(t),
            IsDueDateFixed = t.DueDate.HasValue,
            ProjectDeadline = t.Project?.Deadline,
            Assignees = t.Assignees.Select(a => new TaskAssigneeDto
            {
                Email = a.User?.Email ?? string.Empty,
                Name = a.User?.Name ?? string.Empty,
                Specialization = a.User?.Specialization.ToString(),
                AssignedAt = a.AssignedAt
            }).ToList(),
            Tags = t.TagLinks?
                .Select(l => MapTag(l.Tag))
                .ToList() ?? new List<TaskTagDto>()
        };

        private static TaskSubtaskDto MapSubtask(TaskSubtask s) => new()
        {
            Id = s.Id,
            Title = s.Title,
            IsCompleted = s.IsCompleted,
            Order = s.Order,
            CreatedAt = s.CreatedAt,
            CompletedAt = s.CompletedAt
        };

        private static TaskTagDto MapTag(TaskTag t) => new()
        {
            Id = t.Id,
            Name = t.Name,
            Color = t.Color,
            TasksCount = t.TaskLinks?.Count ?? 0,
            CreatedAt = t.CreatedAt
        };

        private static TaskAttachmentDto MapAttachment(TaskAttachment a, bool canDelete) => new()
        {
            Id = a.Id,
            FileName = a.FileName,
            ContentType = a.ContentType,
            SizeBytes = a.SizeBytes,
            UploadedByEmail = a.UploadedBy?.Email ?? string.Empty,
            UploadedByName = a.UploadedBy?.Name ?? string.Empty,
            UploadedAt = a.UploadedAt,
            CanDelete = canDelete
        };

        private static TaskCommentDto MapComment(TaskComment c) => new()
        {
            Id = c.Id,
            Text = c.Text,
            AuthorEmail = c.Author?.Email ?? string.Empty,
            AuthorName = c.Author?.Name ?? string.Empty,
            AuthorSpecialization = c.Author?.Specialization.ToString(),
            CreatedAt = c.CreatedAt
        };

        private static bool IsKey(TaskColumn? column, string key)
            => column != null &&
               string.Equals(column.SystemKey, key, StringComparison.OrdinalIgnoreCase);
    }
}