using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.DTOs.TaskDtos
{
    public class UpdateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid ColumnId { get; set; }
        public TaskPriority Priority { get; set; } = TaskPriority.None;
        public DateTime? DueDate { get; set; }

    }
}
