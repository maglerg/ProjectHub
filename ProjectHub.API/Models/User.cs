// Server/Models/User.cs

using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models.Enums;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProjectHub.Models;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Specialization Specialization { get; set; }
    public string? Description { get; set; }
    public bool IsOnline { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastActiveAt { get; set; }

    // 1. Проекты, где этот пользователь является владельцем (Owner)
    [JsonIgnore] // Чтобы не было бесконечных циклов при сериализации в JSON
    public virtual ICollection<Project> OwnedProjects { get; set; } = new List<Project>();

    // 2. проекты где пользователь является участником (не овнером)
    [JsonIgnore]
    public virtual ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
    // настройка приватности сообщений
    public ChatPrivacy ChatPrivacy { get; set; } = ChatPrivacy.All;
    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    // 🆕 Настройки уведомлений (1:1)
    [JsonIgnore]
    public virtual UserNotificationSettings? NotificationSettings { get; set; }

    // (опционально) — если хочешь ещё и Email в настройках, оставь как есть.
    public OnlineVisibility OnlineVisibility { get; set; } = OnlineVisibility.Everyone;

}
public enum ChatPrivacy
{
    All = 0,   // Все могут писать (по умолчанию)
    FriendsOnly = 1 // Только друзья
}