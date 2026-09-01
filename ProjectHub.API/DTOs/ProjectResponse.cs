// DTOs/ProjectResponse.cs
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.DTOs
{
    public class ProjectResponse
    {
        public string PublicCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public ProjectCategory Category { get; set; }
        public ProjectVisibility Visibility { get; set; }
        public ProjectStatus Status { get; set; }  
        public DateTime Deadline { get; set; }
        public DateTime CreatedAt { get; set; }    
    }
}