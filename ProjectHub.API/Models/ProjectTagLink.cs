// Models/ProjectTagLink.cs

using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("ProjectTagLinks")]
    public class ProjectTagLink
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project Project { get; set; } = null!;

        public Guid TagId { get; set; }

        [ForeignKey(nameof(TagId))]
        public virtual ProjectTag Tag { get; set; } = null!;

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Кто привязал тег к проекту.</summary>
        public Guid AddedById { get; set; }

        [ForeignKey(nameof(AddedById))]
        public virtual User AddedBy { get; set; } = null!;
    }
}