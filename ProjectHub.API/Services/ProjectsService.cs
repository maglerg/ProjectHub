// Services/ProjectsService.cs
using ProjectHub.API.Models;
using ProjectHub.API.DTOs;
using Microsoft.Extensions.Logging;

namespace ProjectHub.API.Services
{
    public class ProjectsService
    {
        private readonly List<Project> _projects = new();
        private readonly ILogger<ProjectsService> _logger;
        private readonly CodeGeneratorService _codeGenerator;
        private const int MaxAttempts = 100;

        public ProjectsService(
            ILogger<ProjectsService> logger,
            CodeGeneratorService codeGenerator)
        {
            _logger = logger;
            _codeGenerator = codeGenerator;
        }

        public ProjectResponse CreateProject(CreateProjectRequest request)
        {
            _logger.LogInformation($"CREATE: {request.Name}");

            var publicCode = GenerateUniqueCode();

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                PublicCode = publicCode,
                Description = request.Description,
                Category = request.Category,
                Visibility = request.Visibility,
                Deadline = request.Deadline
            };

            _projects.Add(project);
            _logger.LogInformation($"✅ Создан проект с кодом: {publicCode}");

            return MapToResponse(project);
        }

        // ✅ Новый метод с фильтрацией
        public List<ProjectResponse> GetProjectsFiltered(
            ProjectCategory? category = null,
            ProjectVisibility? visibility = null)
        {
            var filtered = _projects.AsEnumerable();

            // Фильтр по категории
            if (category.HasValue)
            {
                filtered = filtered.Where(p => p.Category == category.Value);
            }

            // Фильтр по видимости
            if (visibility.HasValue)
            {
                filtered = filtered.Where(p => p.Visibility == visibility.Value);
            }

            // 🔒 Всегда показываем только публичные проекты
            // (если нет авторизации, приватные скрыты)
            filtered = filtered.Where(p => p.Visibility == ProjectVisibility.Public);

            return filtered.Select(MapToResponse).ToList();
        }

        // Старые методы для обратной совместимости
        public List<ProjectResponse> GetProjects()
        {
            // По умолчанию показываем только публичные
            return _projects
                .Where(p => p.Visibility == ProjectVisibility.Public)
                .Select(MapToResponse)
                .ToList();
        }

        public ProjectResponse GetProjectByCode(string code)
        {
            var project = _projects
                .FirstOrDefault(p => p.PublicCode == code && p.Visibility == ProjectVisibility.Public);

            return project != null ? MapToResponse(project) : null;
        }

        // Внутренние методы
        public bool IsCodeExists(string code)
        {
            return _projects.Any(p => p.PublicCode == code);
        }

        private ProjectResponse MapToResponse(Project project)
        {
            return new ProjectResponse
            {
                PublicCode = project.PublicCode,
                Name = project.Name,
                Description = project.Description,
                Category = project.Category,
                Visibility = project.Visibility,
                Deadline = project.Deadline
            };
        }

        private string GenerateUniqueCode()
        {
            var attempts = 0;

            while (attempts < MaxAttempts)
            {
                var formattedCode = _codeGenerator.GenerateFormattedCode();

                if (!IsCodeExists(formattedCode))
                {
                    _logger.LogInformation($"✅ Сгенерирован уникальный код: {formattedCode} (попытка {attempts + 1})");
                    return formattedCode;
                }

                attempts++;
                _logger.LogWarning($"⚠️ Код {formattedCode} уже существует, генерируем новый (попытка {attempts})");
            }

            throw new InvalidOperationException($"Не удалось сгенерировать уникальный код после {MaxAttempts} попыток");
        }
    }
}