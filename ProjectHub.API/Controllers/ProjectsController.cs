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

        [HttpPost("join/{code}")]
        [Authorize]
        public async Task<IActionResult> JoinProject(string code)
        {
            try
            {
                _logger.LogInformation($"POST join/{code} CALLED");

                // Получаем ID пользователя из токена
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var result = await _projectsService.JoinProjectAsync(code, userId);

                if (!result)
                {
                    return NotFound(new { error = "Проект с таким кодом не найден" });
                }

                // Возвращаем обновленный проект с участниками
                var updatedProject = await _projectsService.GetProjectByCodeAsync(code);
                return Ok(updatedProject);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning($"Ошибка присоединения: {ex.Message}");
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Неожиданная ошибка: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // 📌 GET /api/projects/my — получить проекты текущего пользователя
        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMyProjects()
        {
            try
            {
                _logger.LogInformation("=== ЗАПРОС МОИХ ПРОЕКТОВ ===");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var projects = await _projectsService.GetUserProjectsAsync(userId);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при получении проектов пользователя: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // 📌 PUT /api/projects/code/{code}/members/{email}/role — изменить роль участника по публичному коду и email
        [HttpPut("code/{code}/members/{email}/role")]
        [Authorize]
        public async Task<IActionResult> ChangeMemberRole(string code, string email, [FromBody] ChangeRoleRequest request)
        {
            try
            {
                _logger.LogInformation($"Изменение роли участника с email {email} в проекте {code}");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var result = await _projectsService.ChangeMemberRoleByCodeAndEmailAsync(code, userId, email, request.NewRole);

                if (!result)
                {
                    return BadRequest(new { error = "Не удалось изменить роль" });
                }

                return Ok(new { message = "Роль успешно изменена" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при изменении роли: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // 📌 PUT /api/projects/code/{code} — обновить проект по публичному коду
        [HttpPut("code/{code}")]
        [Authorize]
        public async Task<IActionResult> UpdateProjectByCode(string code, [FromBody] UpdateProjectRequest request)
        {
            try
            {
                _logger.LogInformation($"Обновление проекта с кодом {code}");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var updatedProject = await _projectsService.UpdateProjectByCodeAsync(code, userId, request);
                return Ok(updatedProject);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при обновлении проекта: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
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

        // 📌 GET /api/projects — обновляем с поддержкой избранных
        [HttpGet]
        public async Task<IActionResult> GetProjects(
            [FromQuery] ProjectCategory? category,
            [FromQuery] ProjectVisibility? visibility,
            [FromQuery] bool favoritesOnly = false)
        {
            try
            {
                _logger.LogInformation("=== ЗАПРОС СПИСКА ПРОЕКТОВ ===");

                Guid? userId = null;
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
                {
                    userId = parsedUserId;
                }

                var projects = await _projectsService.GetProjectsFilteredAsync(
                    category,
                    visibility,
                    favoritesOnly,
                    userId);

                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при возврате проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // 📌 POST /api/projects/{code}/favorite — добавить/удалить из избранного по коду
        [HttpPost("{code}/favorite")]
        [Authorize]
        public async Task<IActionResult> ToggleFavoriteByCode(string code)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var result = await _projectsService.ToggleFavoriteByCodeAsync(code, userId);
                return Ok(new { isFavorite = result });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при изменении избранного: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // 📌 GET /api/projects/favorites — получить избранные проекты
        [HttpGet("favorites")]
        [Authorize]
        public async Task<IActionResult> GetFavorites()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var projects = await _projectsService.GetUserFavoritesAsync(userId);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при получении избранных проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        [HttpGet("search/{code}")]
        public async Task<IActionResult> GetProjectByCode(string code)
        {
            try
            {
                _logger.LogInformation($"Поиск проекта по коду: {code}");

                // 📌 Получаем ID текущего пользователя из токена (если есть)
                Guid? currentUserId = null;
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    currentUserId = userId;
                }

                var project = await _projectsService.GetProjectByCodeAsync(code, currentUserId);

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