// Models/Friend.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("Friends")]
public class Friend
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }  // Кто добавил

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [Required]
    public Guid FriendId { get; set; }  // Кого добавили

    [ForeignKey("FriendId")]
    public virtual User FriendUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public FriendStatus Status { get; set; } = FriendStatus.Accepted;
}

public enum FriendStatus
{
    Pending = 0,    // Ожидает подтверждения
    Accepted = 1,   // Подтвержден
    Rejected = 2    // Отклонен
}