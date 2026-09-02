// Controllers/ProjectsController.cs
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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
        [Authorize]
        public async Task<IActionResult> CreateProject(CreateProjectRequest request)
        {
            try
            {
                _logger.LogInformation("POST CONTROLLER CALLED");
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }
                if (string.IsNullOrWhiteSpace(request.Name))
                {
                    return BadRequest(new { error = "Название проекта обязательно" }); // 400
                }

                var project = await _projectsService.CreateProjectAsync(request, userId);
                return CreatedAtAction(nameof(CreateProject), project); // 201
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
                return Ok(projects); // 200
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при возврате проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        [HttpGet("search/{code}")]
        public async Task<IActionResult> GetProjectByCode(string code)
        {
            try
            {
                _logger.LogInformation($"Поиск проекта по коду: {code}");

                var project = await _projectsService.GetProjectByCodeAsync(code);

                if (project == null)
                {
                    _logger.LogWarning($"Проект с кодом {code} не найден");
                    return NotFound(new { error = "Проект с таким кодом не найден" });
                }

                _logger.LogInformation($"Найден проект: {project.Name}");
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