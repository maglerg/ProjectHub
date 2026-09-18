using ProjectHub.API.Models.Enums;
using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("ProjectActivities")]
    public class ProjectActivity
    {
        [Key]
        public Guid Id { get; set; }

        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project Project { get; set; } = null!;

        /// <summary>Кто выполнил действие.</summary>
        public Guid UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User User { get; set; } = null!;

        public ActivityType Type { get; set; }

        /// <summary>Короткое человекочитаемое сообщение — например, название задачи.</summary>
        [MaxLength(500)]
        public string? Summary { get; set; }

        /// <summary>Ссылка на связанный объект (например, /projects/CODE/tasks/GUID).</summary>
        [MaxLength(500)]
        public string? Link { get; set; }

        /// <summary>ID связанной сущности (задача, участник, голосование и т. д.).</summary>
        public Guid? RelatedEntityId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}