// Models/UserNotificationSettings.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

/// <summary>
/// Настройки уведомлений пользователя. Связь 1:1 с User.
/// Создаётся автоматически при регистрации (см. UserService.RegisterUserAsync).
/// </summary>
[Table("UserNotificationSettings")]
public class UserNotificationSettings
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    // ═══════════════════════════════════════════════════════════
    //  МАСТЕР-ПЕРЕКЛЮЧАТЕЛЬ
    // ═══════════════════════════════════════════════════════════

    /// <summary>Главный тумблер. Если false — все уведомления отключены.</summary>
    public bool Enabled { get; set; } = true;

    // ═══════════════════════════════════════════════════════════
    //  ПО ТИПАМ
    // ═══════════════════════════════════════════════════════════

    /// <summary>Новые сообщения в чатах.</summary>
    public bool NewMessages { get; set; } = true;

    /// <summary>Заявки в друзья (входящие и результат по своим).</summary>
    public bool FriendRequests { get; set; } = true;

    /// <summary>Приглашения в проекты.</summary>
    public bool ProjectInvitations { get; set; } = true;

    /// <summary>Изменения в проекте: роль, удаление, архив, новый участник.</summary>
    public bool ProjectChanges { get; set; } = true;

    /// <summary>Комментарии к задачам.</summary>
    public bool TaskComments { get; set; } = true;

    /// <summary>Голосования.</summary>
    public bool Votings { get; set; } = true;

    /// <summary>Дедлайны задач.</summary>
    public bool TaskDeadlines { get; set; } = true;

    /// <summary>За сколько дней предупреждать о дедлайне. 1..30.</summary>
    public int DeadlineDaysBefore { get; set; } = 3;

    /// <summary>Заявки на вступление в проект (для owner/admin).</summary>
    public bool Applications { get; set; } = true;

    // ═══════════════════════════════════════════════════════════
    //  НЕ БЕСПОКОИТЬ
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// До какого момента уведомления подавлены.
    /// null или прошедшая дата → DND выключен.
    /// </summary>
    public DateTime? DoNotDisturbUntil { get; set; }

    // ═══════════════════════════════════════════════════════════
    //  КАНАЛЫ ДОСТАВКИ (заготовка на будущее)
    // ═══════════════════════════════════════════════════════════

    /// <summary>In-app доставка через SignalR (пока всегда true).</summary>
    public bool InAppEnabled { get; set; } = true;

    /// <summary>Email-дубликат (пока не реализовано на отправке, флаг хранится).</summary>
    public bool EmailEnabled { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}