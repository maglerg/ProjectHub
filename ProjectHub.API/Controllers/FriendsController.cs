// Controllers/FriendsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.DTOs;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController : ControllerBase
{
    private readonly FriendService _friendService;
    private readonly ILogger<FriendsController> _logger;

    public FriendsController(FriendService friendService, ILogger<FriendsController> logger)
    {
        _friendService = friendService;
        _logger = logger;
    }

    // 📌 GET /api/friends — получить список друзей
    [HttpGet]
    public async Task<IActionResult> GetFriends()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var friends = await _friendService.GetFriendsAsync(userId);
            return Ok(friends);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении друзей: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/friends — добавить друга по email
    [HttpPost]
    public async Task<IActionResult> AddFriend([FromBody] FriendRequestDto dto)
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

            var result = await _friendService.AddFriendAsync(userId, dto.Email);

            if (!result.Success)
            {
                return BadRequest(new { error = result.Message });
            }

            return Ok(result.Friend);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при добавлении друга: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 DELETE /api/friends/{friendId} — удалить друга
    [HttpDelete("{friendId}")]
    public async Task<IActionResult> RemoveFriend(Guid friendId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var result = await _friendService.RemoveFriendAsync(userId, friendId);

            if (!result)
            {
                return NotFound(new { error = "Друг не найден" });
            }

            return Ok(new { message = "Друг удален" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при удалении друга: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
    // 📌 GET /api/friends/status/{email} — проверить статус дружбы по email
    [HttpGet("status/{email}")]
    public async Task<IActionResult> GetFriendStatusByEmail(string email)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var isFriend = await _friendService.IsFriendByEmailAsync(userId, email);
            return Ok(new { isFriend });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при проверке статуса дружбы: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}