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
        public IActionResult CreateProject(CreateProjectRequest request)
        {
            try
            {
                var projectResponse = _projectsService.CreateProject(request);
                return CreatedAtAction(nameof(CreateProject), projectResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при создании проекта: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpGet("filter")]
        public IActionResult GetProjectsFiltered(
    [FromQuery] ProjectCategory? category,
    [FromQuery] ProjectVisibility? visibility)
        {
            try
            {
                _logger.LogInformation($"=== ФИЛЬТРАЦИЯ ПРОЕКТОВ: Category={category}, Visibility={visibility} ===");

                var projects = _projectsService.GetProjectsFiltered(category, visibility);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при фильтрации проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // Можно также обновить GET /api/projects
        [HttpGet]
        public IActionResult GetProjects(
            [FromQuery] ProjectCategory? category,
            [FromQuery] ProjectVisibility? visibility)
        {
            try
            {
                _logger.LogInformation("=== ЗАПРОС СПИСКА ПРОЕКТОВ ===");
                var projects = _projectsService.GetProjectsFiltered(category, visibility);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при возврате всех проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpGet("code/{code}")]
        public IActionResult GetProjectByCode(string code)
        {
            try
            {
                var projectResponse = _projectsService.GetProjectByCode(code);

                if (projectResponse == null)
                {
                    _logger.LogWarning($"Проект с кодом {code} не найден");
                    return NotFound(new { error = "Проект с таким кодом не найден" });
                }

                _logger.LogInformation($"Найден проект: {projectResponse.Name}");
                return Ok(projectResponse);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при поиске проекта по публичному коду: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
    }
}