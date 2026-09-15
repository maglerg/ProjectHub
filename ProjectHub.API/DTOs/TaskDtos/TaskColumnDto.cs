namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskColumnDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Order { get; set; }
        public string? SystemKey { get; set; }
        public List<TaskDto> Tasks { get; set; } = new();
    }
}
