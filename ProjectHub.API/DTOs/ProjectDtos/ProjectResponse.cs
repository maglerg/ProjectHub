// DTOs/ProjectResponse.cs

using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.DTOs.ProjectDtos
{
    public class ProjectResponse
    {
        public string PublicCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ProjectCategory Category { get; set; }
        public ProjectVisibility Visibility { get; set; }
        public ProjectStatus Status { get; set; }
        public DateTime Deadline { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid OwnerId { get; set; }  
        public List<MemberInfo> Members { get; set; } = new();

        public UserProjectStatus UserStatus { get; set; } = UserProjectStatus.NotJoined;

        public int FavoritesCount { get; set; }  
        public bool IsFavorite { get; set; }     
    }
}