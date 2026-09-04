// Models/Notification.cs

using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Models;

[Table("Notifications")]
public class Notification
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }  // Кому уведомление

    [Required]
    public string Title { get; set; } = string.Empty;

    public string? Message { get; set; }

    [Required]
    public NotificationType Type { get; set; }

    public bool IsRead { get; set; } = false;

    public string? Link { get; set; }  // Ссылка на проект/заявку

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid? RelatedId { get; set; }  // ID связанного объекта (проект/заявка)

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}
