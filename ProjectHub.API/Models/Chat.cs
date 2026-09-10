// Models/Chat.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("Chats")]
public class Chat
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    /// <summary>
    /// Тип чата: Personal (личный) или Project (общий в проекте)
    /// </summary>
    [Required]
    public ChatType Type { get; set; } = ChatType.Personal;

    /// <summary>
    /// Название чата (для групповых/проектных чатов, для личных — null)
    /// </summary>
    [MaxLength(255)]
    public string? Name { get; set; }

    /// <summary>
    /// ID проекта (только для Type = Project)
    /// </summary>
    public Guid? ProjectId { get; set; }

    [ForeignKey("ProjectId")]
    public virtual Project? Project { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastMessageAt { get; set; }

    // Навигационные свойства
    public virtual ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();
    public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

public enum ChatType
{
    Personal = 0,  // Личный чат (1-на-1)
    Project = 1    // Общий чат проекта (на будущее)
}