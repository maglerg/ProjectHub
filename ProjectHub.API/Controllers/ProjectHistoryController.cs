using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.Models.Enums;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers
{
    [ApiController]
    [Route("api/projects/{projectCode}/history")]
    [Authorize]
    public class ProjectHistoryController : ControllerBase
    {
        private readonly ProjectHistoryService _history;
        private readonly ILogger<ProjectHistoryController> _logger;

        public ProjectHistoryController(
            ProjectHistoryService history,
            ILogger<ProjectHistoryController> logger)
        {
            _history = history;
            _logger = logger;
        }

        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out userId);
        }

        // GET /api/projects/{code}/history?type=TaskCreated&skip=0&take=50
        [HttpGet]
        public async Task<IActionResult> GetHistory(
            string projectCode,
            [FromQuery] ActivityType? type,
            [FromQuery] Guid? relatedEntityId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var page = await _history.GetProjectActivityAsync(
                    projectCode, userId, type, relatedEntityId, skip, take);
                return Ok(page);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения истории проекта");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
    }
}