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

    [Required]
    public MessageType Type { get; set; } = MessageType.Text;

    /// <summary>Текст сообщения (для Type = Text, а также как подпись к файлу).</summary>
    public string? Text { get; set; }

    /// <summary>URL вложения (для Type = Image/File/Sticker).</summary>
    [MaxLength(500)]
    public string? AttachmentUrl { get; set; }

    // ═══════════════════════════════════════════════════════════
    //  🆕 Метаданные вложения
    // ═══════════════════════════════════════════════════════════

    /// <summary>Оригинальное имя файла, которое видит пользователь.</summary>
    [MaxLength(255)]
    public string? AttachmentFileName { get; set; }

    /// <summary>MIME-тип (например, image/jpeg, application/pdf).</summary>
    [MaxLength(100)]
    public string? AttachmentContentType { get; set; }

    /// <summary>Размер файла в байтах.</summary>
    public long? AttachmentSizeBytes { get; set; }

    /// <summary>Уникальное имя файла на диске (Guid + расширение).</summary>
    [MaxLength(255)]
    public string? AttachmentStoredName { get; set; }

    // ═══════════════════════════════════════════════════════════

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }

    public virtual ICollection<ChatMessageRead> Reads { get; set; }
        = new List<ChatMessageRead>();
}

public enum MessageType
{
    Text = 0,
    Image = 1,
    File = 2,
    Sticker = 3
}