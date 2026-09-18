using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskTags")]
    public class TaskTag
    {
        [Key]
        public Guid Id { get; set; }

        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project Project { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        /// <summary>HEX-цвет, например "#4f46e5". Может быть пустым.</summary>
        [MaxLength(9)]
        public string? Color { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<TaskTagLink> TaskLinks { get; set; }
            = new List<TaskTagLink>();
    }
}