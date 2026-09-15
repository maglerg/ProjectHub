using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.DTOs.ProjectDtos
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