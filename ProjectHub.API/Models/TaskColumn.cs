using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskColumns")]
    public class TaskColumn
    {
        [Key]
        public Guid Id { get; set; }

        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public virtual Project Project { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>Порядок отображения колонки (0,1,2,...)</summary>
        public int Order { get; set; }

        /// <summary>Системная колонка, которую нельзя удалить</summary>
        public bool IsDefault { get; set; }

        /// <summary>Ключ системной колонки: NotStarted / InProgress / Completed (null для кастомных)</summary>
        [MaxLength(50)]
        public string? SystemKey { get; set; }
        /// <summary>Вес колонки для расчёта прогресса (0..1). 1 = завершено.</summary>
        public double ProgressWeight { get; set; }
        public virtual ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
    }
}