// Models/ChatMessage.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("ChatMessages")]
public class ChatMessage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid ChatId { get; set; }

    [ForeignKey("ChatId")]
    public virtual Chat Chat { get; set; } = null!;

    [Required]
    public Guid SenderId { get; set; }

    [ForeignKey("SenderId")]
    public virtual User Sender { get; set; } = null!;

    /// <summary>
    /// Тип сообщения (на будущее: текст, стикер, картинка, файл)
    /// </summary>
    [Required]
    public MessageType Type { get; set; } = MessageType.Text;

    /// <summary>
    /// Текст сообщения (для Type = Text)
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// URL вложения (для Type = Image/File/Sticker) — на будущее
    /// </summary>
    [MaxLength(500)]
    public string? AttachmentUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }
    public virtual ICollection<ChatMessageRead> Reads { get; set; } = new List<ChatMessageRead>();
}

public enum MessageType
{
    Text = 0,
    Image = 1,      // на будущее
    File = 2,       // на будущее
    Sticker = 3     // на будущее
}