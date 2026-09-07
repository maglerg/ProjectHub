// Models/Favorite.cs

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models;

[Table("Favorites")]
public class Favorite
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public Guid Id { get; set; }

    [Required]
    public Guid ProjectId { get; set; }

    [ForeignKey("ProjectId")]
    public virtual Project Project { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Уникальная пара (ProjectId, UserId)
    public override bool Equals(object? obj)
    {
        if (obj is not Favorite other) return false;
        return ProjectId == other.ProjectId && UserId == other.UserId;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(ProjectId, UserId);
    }
}