// Controllers/ProjectsController.cs
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Services;

namespace ProjectHub.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectsController : ControllerBase
    {
        private readonly ProjectsService _projectsService;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(ProjectsService projectsService, ILogger<ProjectsController> logger)
        {
            _projectsService = projectsService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CreateProject(CreateProjectRequest request)
        {
            try
            {
                _logger.LogInformation("POST CONTROLLER CALLED");

                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new { error = "Название проекта обязательно" });
                }

                var project = await _projectsService.CreateProjectAsync(request);
                return CreatedAtAction(nameof(CreateProject), project);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError($"Ошибка генерации кода: {ex.Message}");
                return StatusCode(500, new { error = "Не удалось создать проект", detail = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Неожиданная ошибка: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProjects(
            [FromQuery] ProjectCategory? category,
            [FromQuery] ProjectVisibility? visibility)
        {
            try
            {
                _logger.LogInformation("=== ЗАПРОС СПИСКА ПРОЕКТОВ ===");
                var projects = await _projectsService.GetProjectsFilteredAsync(category, visibility);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при возврате проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetProjectByCode(string code)
        {
            try
            {
                _logger.LogInformation($"🔍 Поиск проекта по коду: {code}");

                var project = await _projectsService.GetProjectByCodeAsync(code);

                if (project == null)
                {
                    _logger.LogWarning($"❌ Проект с кодом {code} не найден");
                    return NotFound(new { error = "Проект с таким кодом не найден" });
                }

                _logger.LogInformation($"✅ Найден проект: {project.Name}");
                return Ok(project);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при поиске: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при поиске проекта" });
            }
        }
    }
}