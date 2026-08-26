// Models/ProjectEntity.cs
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
        public ProjectCategory Category { get; set; }

        [Required]
        public ProjectVisibility Visibility { get; set; }

        [Required]
        public DateTime Deadline { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}