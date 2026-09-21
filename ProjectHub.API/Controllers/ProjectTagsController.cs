// Controllers/ProjectTagsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs.ProjectTagDtos;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers
{
    [ApiController]
    [Route("api/project-tags")]
    [Authorize]
    public class ProjectTagsController : ControllerBase
    {
        private readonly ProjectTagsService _tags;
        private readonly ILogger<ProjectTagsController> _logger;

        public ProjectTagsController(
            ProjectTagsService tags,
            ILogger<ProjectTagsController> logger)
        {
            _tags = tags;
            _logger = logger;
        }

        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ГЛОБАЛЬНЫЕ ТЕГИ
        // ═══════════════════════════════════════════════════════════

        // GET /api/project-tags?search=...&take=100
        // Все теги (для автокомплита в поиске проектов)
        [HttpGet]
        public async Task<IActionResult> GetAllTags(
            [FromQuery] string? search = null,
            [FromQuery] int take = 100)
        {
            try
            {
                if (take <= 0) take = 100;
                if (take > 500) take = 500;

                var tags = await _tags.GetAllTagsAsync(search, take);
                return Ok(tags);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения тегов");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/project-tags
        // Создать тег (или вернуть существующий с таким именем)
        [HttpPost]
        public async Task<IActionResult> CreateTag([FromBody] CreateProjectTagDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var tag = await _tags.CreateTagAsync(userId, dto);
                return Ok(tag);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка создания тега");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // PUT /api/project-tags/{tagId}
        // Обновить цвет тега (только создатель)
        [HttpPut("{tagId}")]
        public async Task<IActionResult> UpdateTag(
            Guid tagId, [FromBody] UpdateProjectTagDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var tag = await _tags.UpdateTagAsync(tagId, userId, dto);
                return Ok(tag);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка обновления тега");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // DELETE /api/project-tags/{tagId}
        // Удалить тег глобально (только создатель)
        [HttpDelete("{tagId}")]
        public async Task<IActionResult> DeleteTag(Guid tagId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                await _tags.DeleteTagAsync(tagId, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка удаления тега");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // ═══════════════════════════════════════════════════════════
        //  ТЕГИ КОНКРЕТНОГО ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

        // GET /api/project-tags/project/{code}
        [HttpGet("project/{code}")]
        public async Task<IActionResult> GetProjectTags(string code)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var tags = await _tags.GetProjectTagsAsync(code, userId);
                return Ok(tags);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения тегов проекта");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // PUT /api/project-tags/project/{code}
        // Установить набор тегов на проект (только Owner/Admin)
        [HttpPut("project/{code}")]
        public async Task<IActionResult> SetProjectTags(
            string code, [FromBody] SetProjectTagsDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var tags = await _tags.SetProjectTagsAsync(code, userId, dto);
                return Ok(tags);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка установки тегов проекта");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
    }
}