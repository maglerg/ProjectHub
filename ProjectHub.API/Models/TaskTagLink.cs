using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskTagLinks")]
    public class TaskTagLink
    {
        [Key]
        public Guid Id { get; set; }

        public Guid TaskId { get; set; }

        [ForeignKey(nameof(TaskId))]
        public virtual ProjectTask Task { get; set; } = null!;

        public Guid TagId { get; set; }

        [ForeignKey(nameof(TagId))]
        public virtual TaskTag Tag { get; set; } = null!;

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}