// DTOs/NotificationDtos/NotificationSettingsDto.cs

namespace ProjectHub.API.DTOs.NotificationDtos;

public class NotificationSettingsDto
{
    // Мастер
    public bool Enabled { get; set; }

    // По типам
    public bool NewMessages { get; set; }
    public bool FriendRequests { get; set; }
    public bool ProjectInvitations { get; set; }
    public bool ProjectChanges { get; set; }
    public bool TaskComments { get; set; }
    public bool Votings { get; set; }
    public bool TaskDeadlines { get; set; }
    public bool Applications { get; set; }
    public int DeadlineDaysBefore { get; set; }

    // DND
    public DateTime? DoNotDisturbUntil { get; set; }
    public bool IsDoNotDisturbActive { get; set; }

    // Каналы
    public bool InAppEnabled { get; set; }
    public bool EmailEnabled { get; set; }
}