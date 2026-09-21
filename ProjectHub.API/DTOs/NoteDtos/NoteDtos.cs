namespace ProjectHub.API.DTOs.NoteDtos
{
    public class NoteDto
    {
        public Guid Id { get; set; }

        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? Color { get; set; }
        public bool IsPinned { get; set; }

        public Guid? ProjectId { get; set; }
        public string? ProjectCode { get; set; }
        public string? ProjectName { get; set; }

        /// <summary>
        /// Есть ли у пользователя доступ к связанному проекту.
        /// false = проект удалён, пользователь исключён или проект недоступен.
        /// Тогда клиент не должен делать ссылку на проект.
        /// </summary>
        public bool ProjectAccessible { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateNoteDto
    {
        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;

        /// <summary>Опционально — привязать к проекту сразу при создании.</summary>
        public string? ProjectCode { get; set; }

        public string? Color { get; set; }
    }

    public class UpdateNoteDto
    {
        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? Color { get; set; }
        public bool IsPinned { get; set; }
    }

    public class AttachNoteDto
    {
        /// <summary>Публичный код проекта, либо null — отвязать.</summary>
        public string? ProjectCode { get; set; }
    }
}