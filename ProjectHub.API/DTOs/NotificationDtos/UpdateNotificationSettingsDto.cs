// DTOs/NotificationDtos/UpdateNotificationSettingsDto.cs

namespace ProjectHub.API.DTOs.NotificationDtos;

/// <summary>
/// Все поля nullable — обновляем только то, что пришло.
/// </summary>
public class UpdateNotificationSettingsDto
{
    public bool? Enabled { get; set; }
    public bool? NewMessages { get; set; }
    public bool? FriendRequests { get; set; }
    public bool? ProjectInvitations { get; set; }
    public bool? ProjectChanges { get; set; }
    public bool? TaskComments { get; set; }
    public bool? Votings { get; set; }
    public bool? TaskDeadlines { get; set; }
    public bool? Applications { get; set; }
    public int? DeadlineDaysBefore { get; set; }
    public bool? InAppEnabled { get; set; }
    public bool? EmailEnabled { get; set; }
}