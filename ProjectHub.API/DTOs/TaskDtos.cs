namespace ProjectHub.API.DTOs
{
    // ─────────────────────────────────────────────────────────
    //  Ответ: одна колонка с задачами
    // ─────────────────────────────────────────────────────────
    public class TaskColumnDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Order { get; set; }
        public string? SystemKey { get; set; }
        public List<TaskDto> Tasks { get; set; } = new();
    }

    // ─────────────────────────────────────────────────────────
    //  Ответ: одна задача
    // ─────────────────────────────────────────────────────────
    public class TaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        public Guid ColumnId { get; set; }
        public string ColumnName { get; set; } = string.Empty;

        public string CreatedByEmail { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public bool CanEdit { get; set; }

        public bool IsOwner { get; set; }
        public List<TaskAssigneeDto> Assignees { get; set; } = new();
    }
    public class TaskCommentDto
    {
        public Guid Id { get; set; }
        public string Text { get; set; } = string.Empty;

        public string AuthorEmail { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorSpecialization { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public class CreateTaskCommentDto
    {
        public string Text { get; set; } = string.Empty;
    }
    public class RemoveAssigneeDto
    {
        /// <summary>Email исполнителя, которого нужно снять. Если null — снять себя.</summary>
        public string? Email { get; set; }
    }
    // ─────────────────────────────────────────────────────────
    //  Исполнитель задачи
    // ─────────────────────────────────────────────────────────
    public class TaskAssigneeDto
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Specialization { get; set; }
        public DateTime AssignedAt { get; set; }
    }

    // ─────────────────────────────────────────────────────────
    //  Запрос: создать задачу
    // ─────────────────────────────────────────────────────────
    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>Опционально: в какую колонку. Если null — первая колонка "Не начато".</summary>
        public Guid? ColumnId { get; set; }
    }

    // ─────────────────────────────────────────────────────────
    //  Запрос: переместить задачу
    // ─────────────────────────────────────────────────────────
    public class MoveTaskDto
    {
        public Guid ColumnId { get; set; }
    }
    public class UpdateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid ColumnId { get; set; }
    }
}