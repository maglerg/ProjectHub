// Models/Application.cs

using ProjectHub.API.Models.Enums;
using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models;

[Table("Applications")]
public class Application
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

    [Required]
    public ApplicationStatus Status { get; set; }

    public string? Message { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public Guid? ProcessedBy { get; set; }
}

