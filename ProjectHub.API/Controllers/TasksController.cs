using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProjectHub.API.DTOs.TaskDtos;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Controllers
{
    [ApiController]
    [Route("api/projects/{projectCode}/tasks")]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly TaskService _taskService;
        private readonly ILogger<TasksController> _logger;

        public TasksController(TaskService taskService, ILogger<TasksController> logger)
        {
            _taskService = taskService;
            _logger = logger;
        }

        private bool TryGetUserId(out Guid userId)
        {
            userId = Guid.Empty;
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && Guid.TryParse(claim.Value, out userId);
        }

        // GET /api/projects/{projectCode}/tasks
        [HttpGet]
        public async Task<IActionResult> GetBoard(string projectCode)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var board = await _taskService.GetBoardByCodeAsync(projectCode, userId);
                return Ok(board);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения доски задач");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/projects/{projectCode}/tasks
        [HttpPost]
        public async Task<IActionResult> Create(string projectCode, [FromBody] CreateTaskDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var task = await _taskService.CreateTaskAsync(projectCode, userId, dto);
                return Ok(task);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка создания задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/projects/{projectCode}/tasks/{taskId}/take
        [HttpPost("{taskId}/take")]
        public async Task<IActionResult> Take(string projectCode, Guid taskId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var task = await _taskService.TakeTaskAsync(projectCode, taskId, userId);
                return Ok(task);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка взятия задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/projects/{projectCode}/tasks/{taskId}/leave
        [HttpPost("{taskId}/leave")]
        public async Task<IActionResult> Leave(string projectCode, Guid taskId, [FromBody] RemoveAssigneeDto? dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var task = await _taskService.LeaveTaskAsync(
                    projectCode, taskId, userId, dto ?? new RemoveAssigneeDto());
                return Ok(task);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка снятия с задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // DELETE /api/projects/{projectCode}/tasks/{taskId}
        [HttpDelete("{taskId}")]
        public async Task<IActionResult> Delete(string projectCode, Guid taskId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                await _taskService.DeleteTaskAsync(projectCode, taskId, userId);
                return NoContent(); // 204
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка удаления задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }

        }
        // GET /api/projects/{projectCode}/tasks/{taskId}/comments
        [HttpGet("{taskId}/comments")]
        public async Task<IActionResult> GetComments(string projectCode, Guid taskId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var comments = await _taskService.GetCommentsAsync(projectCode, taskId, userId);
                return Ok(comments);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения комментариев");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // POST /api/projects/{projectCode}/tasks/{taskId}/comments
        [HttpPost("{taskId}/comments")]
        public async Task<IActionResult> AddComment(
            string projectCode, Guid taskId, [FromBody] CreateTaskCommentDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var comment = await _taskService.AddCommentAsync(projectCode, taskId, userId, dto);
                return Ok(comment);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка добавления комментария");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // GET /api/projects/{projectCode}/tasks/{taskId}
        [HttpGet("{taskId}")]
        public async Task<IActionResult> GetById(string projectCode, Guid taskId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var task = await _taskService.GetTaskByIdAsync(projectCode, taskId, userId);
                return Ok(task);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка получения задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // PUT /api/projects/{projectCode}/tasks/{taskId}
        [HttpPut("{taskId}")]
        public async Task<IActionResult> Update(string projectCode, Guid taskId, [FromBody] UpdateTaskDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var task = await _taskService.UpdateTaskAsync(projectCode, taskId, userId, dto);
                return Ok(task);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка обновления задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // PATCH /api/projects/{projectCode}/tasks/{taskId}/move
        [HttpPatch("{taskId}/move")]
        public async Task<IActionResult> Move(string projectCode, Guid taskId, [FromBody] MoveTaskDto dto)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var task = await _taskService.MoveTaskAsync(projectCode, taskId, userId, dto);
                return Ok(task);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка перемещения задачи");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }
        // POST /api/projects/{projectCode}/tasks/{taskId}/attachments
        [HttpPost("{taskId}/attachments")]
        [RequestSizeLimit(25 * 1024 * 1024)]   // страховка на уровне контроллера
        public async Task<IActionResult> UploadAttachment(
            string projectCode, Guid taskId, IFormFile file)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var dto = await _taskService.UploadAttachmentAsync(
                    projectCode, taskId, userId, file);
                return Ok(dto);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка загрузки вложения");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // GET /api/projects/{projectCode}/tasks/{taskId}/attachments/{attachmentId}/download
        [HttpGet("{taskId}/attachments/{attachmentId}/download")]
        public async Task<IActionResult> DownloadAttachment(
            string projectCode, Guid taskId, Guid attachmentId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                var (stream, fileName, contentType) = await _taskService
                    .DownloadAttachmentAsync(projectCode, taskId, attachmentId, userId);

                return File(stream, contentType, fileName);
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка скачивания вложения");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

        // DELETE /api/projects/{projectCode}/tasks/{taskId}/attachments/{attachmentId}
        [HttpDelete("{taskId}/attachments/{attachmentId}")]
        public async Task<IActionResult> DeleteAttachment(
            string projectCode, Guid taskId, Guid attachmentId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(new { error = "Пользователь не авторизован" });

            try
            {
                await _taskService.DeleteAttachmentAsync(projectCode, taskId, attachmentId, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка удаления вложения");
                return StatusCode(500, new { error = "Внутренняя ошибка сервера" });
            }
        }

    }
}