// Server/Controllers/AuthController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.Services;
using ProjectHub.API.DTOs.UserDtos;
using System.Security.Claims;

namespace ProjectHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IUserService userService, ILogger<AuthController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            _logger.LogInformation($"Регистрация пользователя: {dto.Email}");
            var result = await _userService.RegisterUserAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning($"Ошибка регистрации: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning($"Ошибка валидации: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Неожиданная ошибка при регистрации: {ex.Message}");
            return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/auth/login - вход
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            _logger.LogInformation($"Вход пользователя: {dto.Email}");
            var result = await _userService.LoginUserAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning($"Неудачная попытка входа: {ex.Message}");
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Неожиданная ошибка при входе: {ex.Message}");
            return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/auth/logout - выход
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized(new { message = "Не авторизован" });
            }

            var userId = Guid.Parse(userIdClaim);
            _logger.LogInformation($"Выход пользователя: {userId}");

            await _userService.LogoutUserAsync(userId);
            return Ok(new { message = "Выход выполнен успешно" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при выходе: {ex.Message}");
            return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/auth/me - получить текущего пользователя
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized(new { message = "Не авторизован" });
            }

            var userId = Guid.Parse(userIdClaim);
            _logger.LogInformation($"Запрос данных пользователя: {userId}");

            var result = await _userService.GetCurrentUserAsync(userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning($"Пользователь не найден: {ex.Message}");
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении пользователя: {ex.Message}");
            return StatusCode(500, new { message = "Внутренняя ошибка сервера" });
        }
    }
}