// Models/ProjectTag.cs

using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("ProjectTags")]
    public class ProjectTag
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        /// <summary>Название тега (уникально в рамках всей системы, регистронезависимо).</summary>
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        /// <summary>HEX-цвет, например "#4f46e5". Может быть пустым.</summary>
        [MaxLength(9)]
        public string? Color { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Кто создал тег (для аудита).</summary>
        public Guid CreatedById { get; set; }

        [ForeignKey(nameof(CreatedById))]
        public virtual User CreatedBy { get; set; } = null!;

        // Навигация: связь многие-ко-многим с проектами
        public virtual ICollection<ProjectTagLink> ProjectLinks { get; set; }
            = new List<ProjectTagLink>();
    }
}