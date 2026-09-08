// DTOs/FriendRequestDto.cs

namespace ProjectHub.API.DTOs;

public class FriendRequestResponseDto
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public Guid ReceiverId { get; set; }
    public string ReceiverName { get; set; } = string.Empty;
    public string ReceiverEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class FriendRequestActionDto
{
    public bool Approve { get; set; }
}

public class FriendRequestStatusDto
{
    public string Status { get; set; } = string.Empty;  // "None", "Pending", "Friend"
    public Guid? RequestId { get; set; }
    public bool IsFriend { get; set; }
}