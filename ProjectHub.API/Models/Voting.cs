using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("Votings")]
public class Voting
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid ProjectId { get; set; }

    [ForeignKey("ProjectId")]
    public virtual Project Project { get; set; } = null!;

    [Required]
    public Guid CreatedById { get; set; }

    [ForeignKey("CreatedById")]
    public virtual User CreatedBy { get; set; } = null!;

    /// <summary>
    /// Вопрос голосования (название)
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Можно ли выбирать несколько вариантов
    /// </summary>
    public bool IsMultipleChoice { get; set; } = false;

    /// <summary>
    /// Можно ли переголосовать (иначе голос фиксируется)
    /// </summary>
    public bool AllowRevote { get; set; } = true;

    /// <summary>
    /// Показывать ли результаты до голосования
    /// </summary>
    public bool ShowResultsBeforeVote { get; set; } = false;
    public bool IsAnonymous { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Дата окончания голосования (опционально)
    /// </summary>
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Закрыто ли голосование вручную
    /// </summary>
    public bool IsClosed { get; set; } = false;

    // Навигация
    public virtual ICollection<VotingOption> Options { get; set; } = new List<VotingOption>();
    public virtual ICollection<VotingVote> Votes { get; set; } = new List<VotingVote>();
    
}