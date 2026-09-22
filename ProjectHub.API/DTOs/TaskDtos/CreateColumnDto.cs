// DTOs/TaskDtos/CreateColumnDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectHub.API.DTOs.TaskDtos
{
    public class CreateColumnDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>Вес колонки в прогрессе (0..1). По умолчанию 0.5.</summary>
        [Range(0.0, 1.0)]
        public double ProgressWeight { get; set; } = 0.5;

        /// <summary>
        /// Позиция в списке. Если null — колонка добавляется
        /// перед системной «Завершено».
        /// </summary>
        public int? Order { get; set; }
    }
}