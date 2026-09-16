namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskSubtaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
        public int Order { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    public class CreateSubtaskDto
    {
        public string Title { get; set; } = string.Empty;
    }

    public class UpdateSubtaskDto
    {
        public string Title { get; set; } = string.Empty;
    }
}