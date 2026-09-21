// DTOs/ProjectTagDtos/ProjectTagDtos.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectHub.API.DTOs.ProjectTagDtos
{
    // ── Ответ: один тег ──
    public class ProjectTagDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Color { get; set; }
        public int ProjectsCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // ── Создание тега ──
    public class CreateProjectTagDto
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(9)]
        public string? Color { get; set; }
    }

    // ── Обновление тега (только цвет; имя не меняем, чтобы не ломать ссылки) ──
    public class UpdateProjectTagDto
    {
        [MaxLength(9)]
        public string? Color { get; set; }
    }

    // ── Установить набор тегов на проект (заменяет текущий) ──
    public class SetProjectTagsDto
    {
        public List<Guid> TagIds { get; set; } = new();
    }

    // ── Ответ: тег с краткой инфой для карточки проекта ──
    public class ProjectTagBriefDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Color { get; set; }
    }
}