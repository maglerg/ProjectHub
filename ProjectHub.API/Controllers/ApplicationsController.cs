// Controllers/ApplicationsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models.Enums;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly ApplicationService _applicationService;
    private readonly ILogger<ApplicationsController> _logger;

    public ApplicationsController(ApplicationService applicationService, ILogger<ApplicationsController> logger)
    {
        _applicationService = applicationService;
        _logger = logger;
    }

    // 📌 POST /api/applications/project/code/{code} - подать заявку по публичному коду
    [HttpPost("project/code/{code}")]
    public async Task<IActionResult> CreateApplicationByCode(string code, [FromBody] CreateApplicationDto? dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var project = await _applicationService.GetProjectByCodeAsync(code);
            if (project == null)
            {
                return NotFound(new { error = "Проект с таким кодом не найден" });
            }

            var result = await _applicationService.CreateApplicationAsync(project.Id, userId, dto ?? new CreateApplicationDto());
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
            _logger.LogError($"Ошибка при создании заявки: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/applications/project/code/{code} - получить заявки по публичному коду (ТОЛЬКО ОДИН РАЗ!)
    [HttpGet("project/code/{code}")]
    public async Task<IActionResult> GetApplicationsByCode(string code, [FromQuery] string? status)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            // 📌 Сначала находим проект по коду
            var project = await _applicationService.GetProjectByCodeAsync(code);
            if (project == null)
            {
                return NotFound(new { error = "Проект с таким кодом не найден" });
            }

            var isOwner = await _applicationService.IsUserProjectOwner(project.Id, userId);
            var isAdmin = await _applicationService.IsUserProjectAdmin(project.Id, userId);

            if (!isOwner && !isAdmin)
            {
                return Forbid("У вас нет прав для просмотра заявок");
            }

            // 📌 ОЧИЩАЕМ УВЕДОМЛЕНИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
            await _applicationService.CleanupNotificationsByCodeAsync(code);

            Enum.TryParse<ApplicationStatus>(status, true, out var statusEnum);
            var result = await _applicationService.GetApplicationsByCodeAsync(code, statusEnum);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении заявок: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 PUT /api/applications/{applicationId}/process - обработать заявку
    [HttpPut("{applicationId}/process")]
    public async Task<IActionResult> ProcessApplication(Guid applicationId, [FromBody] ApplicationActionDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var result = await _applicationService.ProcessApplicationAsync(applicationId, userId, dto.Approve, dto.Message);
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
            _logger.LogError($"Ошибка при обработке заявки: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}