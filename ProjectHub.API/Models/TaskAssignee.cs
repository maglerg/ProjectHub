using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskAssignees")]
    public class TaskAssignee
    {
        [Key]
        public Guid Id { get; set; }

        public Guid TaskId { get; set; }

        [ForeignKey(nameof(TaskId))]
        public virtual ProjectTask Task { get; set; } = null!;

        public Guid UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}