// DTOs/TaskDtos/UpdateColumnDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectHub.API.DTOs.TaskDtos
{
    public class UpdateColumnDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(0.0, 1.0)]
        public double ProgressWeight { get; set; } = 0.5;
    }
}