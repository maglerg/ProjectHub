using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models;

[Table("VotingOptions")]
public class VotingOption
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid VotingId { get; set; }

    [ForeignKey("VotingId")]
    public virtual Voting Voting { get; set; } = null!;

    [Required]
    [MaxLength(300)]
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Порядок отображения
    /// </summary>
    public int Order { get; set; } = 0;

    public virtual ICollection<VotingVote> Votes { get; set; } = new List<VotingVote>();
}