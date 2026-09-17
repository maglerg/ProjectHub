using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.DTOs.TaskDtos
{
    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        // Опционально: в какую колонку. Если null — первая колонка "Не начато".
        public Guid? ColumnId { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.None;
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }

    }

}
