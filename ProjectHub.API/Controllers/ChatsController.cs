// Controllers/ChatsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs.ChatDtos;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatsController : ControllerBase
{
    private readonly ChatService _chatService;
    private readonly ILogger<ChatsController> _logger;

    public ChatsController(ChatService chatService, ILogger<ChatsController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    // 📌 GET /api/chats — список чатов пользователя
    [HttpGet]
    public async Task<IActionResult> GetChats()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var chats = await _chatService.GetUserChatsAsync(userId);
            return Ok(chats);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении чатов: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/chats/personal — создать/получить личный чат
    [HttpPost("personal")]
    public async Task<IActionResult> CreatePersonalChat([FromBody] CreateChatDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { error = "Email не может быть пустым" });

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var chat = await _chatService.GetOrCreatePersonalChatAsync(userId, dto.Email);
            return Ok(chat);
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
            _logger.LogError($"Ошибка при создании чата: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/chats/{chatId} — получить чат по ID
    [HttpGet("{chatId}")]
    public async Task<IActionResult> GetChat(Guid chatId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var chat = await _chatService.GetChatByIdAsync(chatId, userId);
            return Ok(chat);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении чата: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/chats/{chatId}/messages — получить сообщения
    [HttpGet("{chatId}/messages")]
    public async Task<IActionResult> GetMessages(Guid chatId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var messages = await _chatService.GetChatMessagesAsync(chatId, userId, skip, take);
            return Ok(messages);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении сообщений: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/chats/project/by-code/{publicCode} — получить или создать чат проекта
    [HttpGet("project/by-code/{publicCode}")]
    public async Task<IActionResult> GetProjectChatByCode(string publicCode)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var chat = await _chatService.GetOrCreateProjectChatByCodeAsync(publicCode, userId);
            return Ok(chat);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при получении чата проекта: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
    // 📌 POST /api/chats/{chatId}/messages — отправить сообщение
    [HttpPost("{chatId}/messages")]
    public async Task<IActionResult> SendMessage(Guid chatId, [FromBody] SendMessageDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Пользователь не авторизован" });
            }

            var message = await _chatService.SendMessageAsync(chatId, userId, dto);
            return Ok(message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при отправке сообщения: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 POST /api/chats/{chatId}/messages/file — отправить файл
    [HttpPost("{chatId}/messages/file")]
    [RequestSizeLimit(25 * 1024 * 1024)]   // страховка на уровне контроллера
    public async Task<IActionResult> SendFile(
        Guid chatId,
        IFormFile file,
        [FromForm] string? caption)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            if (file == null || file.Length == 0)
                return BadRequest(new { error = "Файл не передан" });

            var dto = new SendFileDto { Caption = caption };

            var message = await _chatService.SendFileAsync(chatId, userId, file, dto);
            return Ok(message);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при отправке файла: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }

    // 📌 GET /api/chats/{chatId}/messages/{messageId}/file — скачать файл
    [HttpGet("{chatId}/messages/{messageId}/file")]
    public async Task<IActionResult> DownloadFile(Guid chatId, Guid messageId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            var (stream, fileName, contentType) = await _chatService
                .DownloadFileAsync(chatId, messageId, userId);

            return File(stream, contentType, fileName);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError($"Ошибка при скачивании файла: {ex.Message}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
        }
    }
}