// Models/ProjectEntity.cs
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("Projects")]
    public class Project
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        [Required]
        [MaxLength(20)]
        public string PublicCode { get; set; }

        public string Description { get; set; }
        [Required]
        public ProjectStatus Status { get; set; }

        [Required]
        public ProjectCategory Category { get; set; }

        [Required]
        public ProjectVisibility Visibility { get; set; }

        [Required]
        public DateTime Deadline { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
        public Guid OwnerId { get; set; }

        // Навигационное свойство: Владелец проекта
        [ForeignKey("OwnerId")]
        public virtual User Owner { get; set; }

        // Навигационное свойство: Список участников проекта (связь многие-ко-многим через ProjectMember)
        public virtual ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();

        [Required]
        public int FavoritesCount { get; set; } = 0;  

        // Навигационное свойство для избранных
        public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();

        public bool IsArchived { get; set; } = false;

        public DateTime? ArchivedAt { get; set; }

        public Guid? ArchivedById { get; set; }

        [ForeignKey(nameof(ArchivedById))]
        public virtual User? ArchivedBy { get; set; }
    }
}