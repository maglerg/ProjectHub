using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskSubtasks")]
    public class TaskSubtask
    {
        [Key]
        public Guid Id { get; set; }

        public Guid TaskId { get; set; }

        [ForeignKey(nameof(TaskId))]
        public virtual ProjectTask Task { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        public bool IsCompleted { get; set; }

        public int Order { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}