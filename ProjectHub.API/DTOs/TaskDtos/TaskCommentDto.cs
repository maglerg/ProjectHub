namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskCommentDto
    {
        public Guid Id { get; set; }
        public string Text { get; set; } = string.Empty;

        public string AuthorEmail { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string? AuthorSpecialization { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
