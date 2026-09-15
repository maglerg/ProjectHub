// Controllers/InvitationsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs.InvitationDtos;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvitationsController : ControllerBase
{
    private readonly InvitationService _invitationService;
    private readonly ILogger<InvitationsController> _logger;

    public InvitationsController(InvitationService invitationService, ILogger<InvitationsController> logger)
    {
        _invitationService = invitationService;
        _logger = logger;
    }

    // 📌 GET /api/invitations - получить приглашения пользователя
    [HttpGet]
    public async Task<IActionResult> GetInvitations()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var invitations = await _invitationService.GetUserInvitationsAsync(userId);
            return Ok(invitations);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении приглашений: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/invitations/project/code/{code} — создать приглашение по публичному коду
    [HttpPost("project/code/{code}")]
    public async Task<IActionResult> CreateInvitationByCode(string code, [FromBody] CreateInvitationDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { error = "Email не может быть пустым" });
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            // 📌 Находим проект по публичному коду
            var project = await _invitationService.GetProjectByCodeAsync(code);
            if (project == null)
            {
                return NotFound(new { error = "Проект с таким кодом не найден" });
            }

            var result = await _invitationService.CreateInvitationAsync(project.Id, userId, dto.Email, dto.Message);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при создании приглашения: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 PUT /api/invitations/{invitationId} — принять/отклонить приглашение
    [HttpPut("{invitationId}")]
    public async Task<IActionResult> ProcessInvitation(Guid invitationId, [FromBody] InvitationActionDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var result = await _invitationService.ProcessInvitationAsync(invitationId, userId, dto.Accept);
            return Ok(result);
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
            _logger.LogError($"Ошибка при обработке приглашения: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}