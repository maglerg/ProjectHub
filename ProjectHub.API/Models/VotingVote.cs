using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("VotingVotes")]
public class VotingVote
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid VotingId { get; set; }

    [ForeignKey("VotingId")]
    public virtual Voting Voting { get; set; } = null!;

    [Required]
    public Guid VotingOptionId { get; set; }

    [ForeignKey("VotingOptionId")]
    public virtual VotingOption VotingOption { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
}