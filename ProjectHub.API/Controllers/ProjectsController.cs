// Controllers/ProjectsController.cs
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ProjectHub.API.DTOs.ProjectDtos;
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
        // 📌 GET /api/projects/search/my/{code} — поиск проекта для участников (включая приватные)
        [HttpGet("search/my/{code}")]
        [Authorize]
        public async Task<IActionResult> GetProjectByCodeForMember(string code)
        {
            try
            {
                _logger.LogInformation($"Поиск проекта по коду для участника: {code}");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var project = await _projectsService.GetProjectByCodeForMemberAsync(code, userId);

                if (project == null)
                {
                    _logger.LogWarning($"Проект с кодом {code} не найден или доступ запрещен");
                    return NotFound(new { error = "Проект с таким кодом не найден или у вас нет доступа" });
                }

                _logger.LogInformation($"Найден проект для участника: {project.Name}");
                return Ok(project);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при поиске: {ex.Message}");
                return StatusCode(500, new { error = "Ошибка при поиске проекта" });
            }
        }
        // ═══════════════════════════════════════════════════════════
        //  АРХИВ
        // ═══════════════════════════════════════════════════════════

        // POST /api/projects/code/{code}/archive
        [HttpPost("code/{code}/archive")]
        [Authorize]
        public async Task<IActionResult> ArchiveProject(string code)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                    return Unauthorized(new { error = "Пользователь не авторизован" });

                var project = await _projectsService.ArchiveProjectAsync(code, userId);
                return Ok(project);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка архивации проекта: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/projects/code/{code}/unarchive
        [HttpPost("code/{code}/unarchive")]
        [Authorize]
        public async Task<IActionResult> UnarchiveProject(string code)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                    return Unauthorized(new { error = "Пользователь не авторизован" });

                var project = await _projectsService.UnarchiveProjectAsync(code, userId);
                return Ok(project);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка восстановления проекта: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // GET /api/projects/my/archived
        [HttpGet("my/archived")]
        [Authorize]
        public async Task<IActionResult> GetMyArchivedProjects()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                    return Unauthorized(new { error = "Пользователь не авторизован" });

                var projects = await _projectsService.GetUserProjectsAsync(userId, archived: true);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка загрузки архивных проектов: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // 📌 GET /api/projects/my — получить проекты текущего пользователя
        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMyProjects([FromQuery] bool archived = false)
        {
            try
            {
                _logger.LogInformation("=== ЗАПРОС МОИХ ПРОЕКТОВ ===");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var projects = await _projectsService.GetUserProjectsAsync(userId, archived);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Ошибка при получении проектов пользователя: {ex.Message}");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // GET /api/projects/search-by-tags?tagIds=...&tagIds=...
        [HttpGet("search-by-tags")]
        public async Task<IActionResult> SearchByTags(
            [FromQuery] List<Guid> tagIds,
            [FromQuery] int take = 100)
        {
            try
            {
                if (tagIds == null || tagIds.Count == 0)
                    return BadRequest(new { error = "Укажите хотя бы один тег" });

                if (take <= 0) take = 100;
                if (take > 200) take = 200;

                Guid? userId = null;
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var parsed))
                {
                    userId = parsed;
                }

                var projects = await _projectsService
                    .SearchPublicProjectsByTagsAsync(tagIds, userId, take);

                return Ok(projects);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка поиска проектов по тегам");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // POST /api/projects/code/{code}/cover
        [HttpPost("code/{code}/cover")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> UploadCover(string code, IFormFile file)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Не авторизован" });

            try
            {
                var project = await _projectsService.UploadCoverAsync(code, userId, file);
                return Ok(project);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка загрузки обложки");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // DELETE /api/projects/code/{code}/cover
        [HttpDelete("code/{code}/cover")]
        public async Task<IActionResult> DeleteCover(string code)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Не авторизован" });

            try
            {
                var project = await _projectsService.DeleteCoverAsync(code, userId);
                return Ok(project);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка удаления обложки");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out userId);
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
        // 📌 DELETE /api/projects/code/{code}/members/{email} — удалить участника из проекта
        [HttpDelete("code/{code}/members/{email}")]
        [Authorize]
        public async Task<IActionResult> RemoveMember(string code, string email)
        {
            try
            {
                _logger.LogInformation($"Удаление участника {email} из проекта {code}");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                {
                    return Unauthorized(new { error = "Пользователь не авторизован" });
                }

                var result = await _projectsService.RemoveMemberFromProjectAsync(code, userId, email);

                if (!result)
                {
                    return BadRequest(new { error = "Не удалось удалить участника" });
                }

                return Ok(new { message = "Участник удален из проекта" });
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
                _logger.LogError($"Ошибка при удалении участника: {ex.Message}");
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
        // 📌 POST /api/projects/code/{code}/leave — покинуть проект
        [HttpPost("code/{code}/leave")]
        [Authorize]
        public async Task<IActionResult> LeaveProject(string code)
        {
            try
            {
                _logger.LogInformation($"Пользователь покидает проект {code}");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                    return Unauthorized(new { error = "Пользователь не авторизован" });

                await _projectsService.LeaveProjectAsync(code, userId);
                return Ok(new { message = "Вы покинули проект" });
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
                _logger.LogError(ex, "Ошибка при выходе из проекта");
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