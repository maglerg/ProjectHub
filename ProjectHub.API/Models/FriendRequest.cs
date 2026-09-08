// Models/FriendRequest.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("FriendRequests")]
public class FriendRequest
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid SenderId { get; set; }  // Кто отправил

    [ForeignKey("SenderId")]
    public virtual User Sender { get; set; } = null!;

    [Required]
    public Guid ReceiverId { get; set; }  // Кому отправили

    [ForeignKey("ReceiverId")]
    public virtual User Receiver { get; set; } = null!;

    [Required]
    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;

    public string? Message { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public enum FriendRequestStatus
{
    Pending = 0,    // Ожидает
    Accepted = 1,   // Принята
    Rejected = 2,   // Отклонена
    Canceled = 3    // Отменена отправителем
}