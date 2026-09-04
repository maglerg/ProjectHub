// DTOs/NotificationDto.cs

namespace ProjectHub.API.DTOs;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? RelatedId { get; set; }
}

public class NotificationCountDto
{
    public int UnreadCount { get; set; }
}

public class MarkReadDto
{
    public bool All { get; set; }
    public Guid? NotificationId { get; set; }
}