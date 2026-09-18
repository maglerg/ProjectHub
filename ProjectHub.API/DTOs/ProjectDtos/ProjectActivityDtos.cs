namespace ProjectHub.API.DTOs.ProjectDtos
{
    public class ProjectActivityDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string? Link { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public DateTime CreatedAt { get; set; }

        // Автор
        public string UserName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? UserSpecialization { get; set; }
    }

    public class ProjectActivityPageDto
    {
        public int Total { get; set; }
        public int Skip { get; set; }
        public int Take { get; set; }
        public List<ProjectActivityDto> Items { get; set; } = new();
    }
}