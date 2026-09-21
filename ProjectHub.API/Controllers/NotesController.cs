using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs.NoteDtos;
using ProjectHub.API.Models.Enums;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers
{
    [ApiController]
    [Route("api/notes")]
    [Authorize]
    public class NotesController : ControllerBase
    {
        private readonly NoteService _noteService;
        private readonly ILogger<NotesController> _logger;

        public NotesController(NoteService noteService, ILogger<NotesController> logger)
        {
            _noteService = noteService;
            _logger = logger;
        }

        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out userId);
        }

        // GET /api/notes?filter=All&projectCode=...&search=...
        [HttpGet]
        public async Task<IActionResult> GetNotes(
            [FromQuery] NoteFilter filter = NoteFilter.All,
            [FromQuery] string? projectCode = null,
            [FromQuery] string? search = null)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var notes = await _noteService.GetUserNotesAsync(
                    userId, filter, projectCode, search);
                return Ok(notes);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения заметок");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // GET /api/notes/{noteId}
        [HttpGet("{noteId}")]
        public async Task<IActionResult> GetNote(Guid noteId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var note = await _noteService.GetNoteAsync(noteId, userId);
                return Ok(note);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения заметки");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/notes
        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] CreateNoteDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var note = await _noteService.CreateNoteAsync(userId, dto);
                return Ok(note);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка создания заметки");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // PUT /api/notes/{noteId}
        [HttpPut("{noteId}")]
        public async Task<IActionResult> UpdateNote(Guid noteId, [FromBody] UpdateNoteDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var note = await _noteService.UpdateNoteAsync(noteId, userId, dto);
                return Ok(note);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка обновления заметки");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // PATCH /api/notes/{noteId}/project
        [HttpPatch("{noteId}/project")]
        public async Task<IActionResult> AttachToProject(Guid noteId, [FromBody] AttachNoteDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var note = await _noteService.AttachToProjectAsync(noteId, userId, dto);
                return Ok(note);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка привязки заметки к проекту");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // DELETE /api/notes/{noteId}
        [HttpDelete("{noteId}")]
        public async Task<IActionResult> DeleteNote(Guid noteId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                await _noteService.DeleteNoteAsync(noteId, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка удаления заметки");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
    }
}