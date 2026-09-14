using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("ProjectTasks")]
    public class ProjectTask
    {
        [Key]
        public Guid Id { get; set; }

        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project Project { get; set; } = null!;

        public Guid ColumnId { get; set; }

        [ForeignKey(nameof(ColumnId))]
        public virtual TaskColumn Column { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public Guid CreatedById { get; set; }

        [ForeignKey(nameof(CreatedById))]
        public virtual User CreatedBy { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        public virtual ICollection<TaskAssignee> Assignees { get; set; } = new List<TaskAssignee>();
    }
}