// ProjectHub.API/Models/ProjectMember.cs

using ProjectHub.Models;

namespace ProjectHub.API.Models;

public class ProjectMember
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string Role { get; set; } = "Member"; // Owner, Admin, Member
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}