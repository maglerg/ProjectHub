// Controllers/VotingsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VotingsController : ControllerBase
{
    private readonly VotingsService _votingsService;
    private readonly ILogger<VotingsController> _logger;

    public VotingsController(VotingsService votingsService, ILogger<VotingsController> logger)
    {
        _votingsService = votingsService;
        _logger = logger;
    }

    // 📌 POST /api/votings/project/{code} — создать голосование
    [HttpPost("project/{code}")]
    public async Task<IActionResult> CreateVoting(string code, [FromBody] CreateVotingDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var voting = await _votingsService.CreateVotingAsync(code, userId, dto);
            return Ok(voting);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка создания голосования: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/votings/project/{code} — все голосования проекта
    [HttpGet("project/{code}")]
    public async Task<IActionResult> GetProjectVotings(string code)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var votings = await _votingsService.GetProjectVotingsAsync(code, userId);
            return Ok(votings);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка получения голосований: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/votings/project/{code}/summary — краткая сводка (для бейджа)
    [HttpGet("project/{code}/summary")]
    public async Task<IActionResult> GetVotingsSummary(string code)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var summary = await _votingsService.GetVotingsSummaryAsync(code, userId);
            return Ok(summary);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка получения сводки: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/votings/{votingId} — одно голосование
    [HttpGet("{votingId}")]
    public async Task<IActionResult> GetVoting(Guid votingId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var voting = await _votingsService.GetVotingAsync(votingId, userId);
            return Ok(voting);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка получения голосования: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/votings/{votingId}/vote — проголосовать
    [HttpPost("{votingId}/vote")]
    public async Task<IActionResult> Vote(Guid votingId, [FromBody] VoteDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var voting = await _votingsService.VoteAsync(votingId, userId, dto);
            return Ok(voting);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка голосования: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/votings/{votingId}/close — закрыть
    [HttpPost("{votingId}/close")]
    public async Task<IActionResult> CloseVoting(Guid votingId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var voting = await _votingsService.CloseVotingAsync(votingId, userId);
            return Ok(voting);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка закрытия голосования: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 DELETE /api/votings/{votingId} — удалить
    [HttpDelete("{votingId}")]
    public async Task<IActionResult> DeleteVoting(Guid votingId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            await _votingsService.DeleteVotingAsync(votingId, userId);
            return Ok(new { message = "Голосование удалено" });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка удаления голосования: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}