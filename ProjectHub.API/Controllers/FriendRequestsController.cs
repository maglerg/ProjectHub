// Controllers/FriendRequestsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendRequestsController : ControllerBase
{
    private readonly FriendRequestService _friendRequestService;
    private readonly ILogger<FriendRequestsController> _logger;

    public FriendRequestsController(FriendRequestService friendRequestService, ILogger<FriendRequestsController> logger)
    {
        _friendRequestService = friendRequestService;
        _logger = logger;
    }

    // 📌 GET /api/friendrequests/status/{email} — получить статус
    [HttpGet("status/{email}")]
    public async Task<IActionResult> GetStatus(string email)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var status = await _friendRequestService.GetFriendStatusAsync(userId, email);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении статуса: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/friendrequests — отправить заявку
    [HttpPost]
    public async Task<IActionResult> SendRequest([FromBody] FriendRequestDto dto)
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

            var result = await _friendRequestService.SendFriendRequestAsync(userId, dto.Email);
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
            _logger.LogError($"Ошибка при отправке заявки: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 DELETE /api/friendrequests/{requestId} — отменить заявку
    [HttpDelete("{requestId}")]
    public async Task<IActionResult> CancelRequest(Guid requestId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            await _friendRequestService.CancelFriendRequestAsync(requestId, userId);
            return Ok(new { message = "Заявка отменена" });
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
            _logger.LogError($"Ошибка при отмене заявки: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 PUT /api/friendrequests/{requestId} — обработать заявку
    [HttpPut("{requestId}")]
    public async Task<IActionResult> ProcessRequest(Guid requestId, [FromBody] FriendRequestActionDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var result = await _friendRequestService.ProcessFriendRequestAsync(requestId, userId, dto.Approve);
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
            _logger.LogError($"Ошибка при обработке заявки: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/friendrequests/incoming — получить входящие заявки
    [HttpGet("incoming")]
    public async Task<IActionResult> GetIncomingRequests()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var requests = await _friendRequestService.GetIncomingRequestsAsync(userId);
            return Ok(requests);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении заявок: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}