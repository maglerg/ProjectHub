// Models/ChatParticipant.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("ChatParticipants")]
public class ChatParticipant
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid ChatId { get; set; }

    [ForeignKey("ChatId")]
    public virtual Chat Chat { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Последнее прочитанное сообщение (для счётчика непрочитанных)
    /// </summary>
    public DateTime? LastReadAt { get; set; }
}