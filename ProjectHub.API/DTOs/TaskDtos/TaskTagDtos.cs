namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskTagDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Color { get; set; }
        public int TasksCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTagDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Color { get; set; }
    }

    public class SetTaskTagsDto
    {
        /// <summary>Полный набор тегов задачи (заменяет текущий).</summary>
        public List<Guid> TagIds { get; set; } = new();
    }
}