// Controllers/UsersController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs;
using ProjectHub.API.Services;
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

    // 📌 PUT /api/users - обновить данные текущего пользователя
    [HttpPut]
    public async Task<IActionResult> UpdateUser([FromBody] UpdateUserDto dto)
    {
        try
        {
            _logger.LogInformation("PUT /api/users CALLED");

            // Получаем ID пользователя из токена
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var updatedUser = await _userService.UpdateUserAsync(userId, dto);
            return Ok(updatedUser);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning($"Пользователь не найден: {ex.Message}");
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при обновлении пользователя: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
    // 📌 GET /api/users/email/{email} - получить профиль пользователя по email
    [HttpGet("email/{email}")]
    public async Task<IActionResult> GetUserByEmail(string email)
    {
        try
        {
            _logger.LogInformation($"GET /api/users/email/{email} CALLED");

            var user = await _userService.GetUserProfileByEmailAsync(email);

            if (user == null)
            {
                return NotFound(new { error = "Пользователь не найден" });
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении пользователя: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}