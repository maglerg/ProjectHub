// Server/Models/User.cs

using ProjectHub.Models.Enums;

namespace ProjectHub.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Specialization Specialization { get; set; }
    public string? Description { get; set; }
    public bool IsOnline { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastActiveAt { get; set; }

    // Навигационные свойства
    public List<Project> OwnedProjects { get; set; } = new();
    public List<ProjectMember> ProjectMemberships { get; set; } = new();
}