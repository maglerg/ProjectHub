// Models/ChatMessageRead.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("ChatMessageReads")]
public class ChatMessageRead
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid ChatMessageId { get; set; }

    [ForeignKey("ChatMessageId")]
    public virtual ChatMessage ChatMessage { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}