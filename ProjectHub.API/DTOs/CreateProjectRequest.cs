using ProjectHub.API.Models;

namespace ProjectHub.API.DTOs
{
    public class CreateProjectRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public ProjectCategory Category { get; set; }
        public ProjectVisibility Visibility { get; set; }
        public DateTime Deadline { get; set; }
    }
}