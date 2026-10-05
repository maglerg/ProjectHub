// Controllers/UsersController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs.UserDtos;
using ProjectHub.API.Services;
using ProjectHub.Models;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }
    // POST /api/users/avatar
    [HttpPost("avatar")]
    [RequestSizeLimit(4 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var user = await _userService.UploadAvatarAsync(userId, file);
            return Ok(user);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка загрузки аватара");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // DELETE /api/users/avatar
    [HttpDelete("avatar")]
    public async Task<IActionResult> DeleteAvatar()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var user = await _userService.DeleteAvatarAsync(userId);
            return Ok(user);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка удаления аватара");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
    // 📌 PUT /api/users - обновить данные текущего пользователя
    [HttpPut]
    public async Task<IActionResult> UpdateUser([FromBody] UpdateUserDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized(new { error = "Пользователь не авторизован" });
        }

        try
        {
            _logger.LogInformation("PUT /api/users CALLED. DTO = {@Dto}", dto);

            var updatedUser = await _userService.UpdateUserAsync(userId, dto);
            return Ok(updatedUser);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Пользователь {UserId} не найден", userId);
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при обновлении пользователя {UserId}", userId);
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
    // 📌 GET /api/users/email/{email} - получить профиль пользователя по email
    // 📌 GET /api/users/email/{email}
    [HttpGet("email/{email}")]
    public async Task<IActionResult> GetUserByEmail(string email)
    {
        try
        {
            _logger.LogInformation($"GET /api/users/email/{email} CALLED");

            // 🆕 Кто смотрит
            Guid? viewerId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var uid))
            {
                viewerId = uid;
            }

            var user = await _userService.GetUserProfileByEmailAsync(email, viewerId);

            if (user == null)
                return NotFound(new { error = "Пользователь не найден" });

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при получении пользователя");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
    // ═══════════════════════════════════════════════════════════
    //  🆕 СМЕНА ПАРОЛЯ
    // ═══════════════════════════════════════════════════════════

    // 📌 POST /api/users/password - смена пароля
    [HttpPost("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            await _userService.ChangePasswordAsync(userId, dto);

            return Ok(new { message = "Пароль успешно изменён" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            // ⚠️ 401, а не 403 — это не «нет прав», это «неверный текущий пароль».
            //    Фронт покажет сообщение в форме.
            return Unauthorized(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка смены пароля");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}