using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskCommentReads")]
    public class TaskCommentRead
    {
        [Key]
        public Guid Id { get; set; }

        public Guid TaskCommentId { get; set; }

        [ForeignKey(nameof(TaskCommentId))]
        public virtual TaskComment TaskComment { get; set; } = null!;

        public Guid UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;

        public DateTime ReadAt { get; set; } = DateTime.UtcNow;
    }
}