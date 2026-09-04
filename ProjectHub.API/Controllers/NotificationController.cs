// Controllers/NotificationController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(NotificationService notificationService, ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    // 📌 GET /api/notifications - получить все уведомления
    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var notifications = unreadOnly
                ? await _notificationService.GetUnreadNotificationsAsync(userId)
                : await _notificationService.GetUserNotificationsAsync(userId);

            return Ok(notifications);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении уведомлений: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/notifications/unread/count - количество непрочитанных
    [HttpGet("unread/count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(new NotificationCountDto { UnreadCount = count });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении количества: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 PUT /api/notifications/mark-read - отметить как прочитанное
    [HttpPut("mark-read")]
    public async Task<IActionResult> MarkAsRead([FromBody] MarkReadDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            await _notificationService.MarkAsReadAsync(userId, dto.NotificationId);
            return Ok(new { message = "Уведомления отмечены как прочитанные" });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при отметке прочитанных: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}