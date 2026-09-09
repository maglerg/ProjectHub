// Models/Invitation.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("Invitations")]
public class Invitation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid ProjectId { get; set; }

    [ForeignKey("ProjectId")]
    public virtual Project Project { get; set; } = null!;

    [Required]
    public Guid InviterId { get; set; }  // Кто пригласил

    [ForeignKey("InviterId")]
    public virtual User Inviter { get; set; } = null!;

    [Required]
    public Guid InviteeId { get; set; }  // Кого приглашают

    [ForeignKey("InviteeId")]
    public virtual User Invitee { get; set; } = null!;

    [Required]
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;

    public string? Message { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public enum InvitationStatus
{
    Pending = 0,    // Ожидает
    Accepted = 1,   // Принята
    Rejected = 2    // Отклонена
}