namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskAssigneeDto
    {
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Specialization { get; set; }
        public DateTime AssignedAt { get; set; }
    }
}
