using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ProjectHub.Models;

namespace ProjectHub.API.Models
{
    [Table("Notes")]
    public class Note
    {
        [Key]
        public Guid Id { get; set; }

        /// <summary>Автор — единственный, кто видит заметку.</summary>
        public Guid AuthorId { get; set; }

        [ForeignKey(nameof(AuthorId))]
        public virtual User Author { get; set; } = null!;

        /// <summary>Проект, к которому привязана заметка. null = свободная.</summary>
        public Guid? ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project? Project { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        [Required]
        [MaxLength(5000)]
        public string Content { get; set; } = string.Empty;

        /// <summary>Цветовой маркер (HEX), опционально.</summary>
        [MaxLength(9)]
        public string? Color { get; set; }

        public bool IsPinned { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}