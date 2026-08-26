// Server/Controllers/AuthController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectHub.DTOs;
using ProjectHub.Models;
using ProjectHub.Models.Enums;
using ProjectHub.Services;
using System.Security.Claims;

namespace ProjectHub.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthService _authService;

    public AuthController(ApplicationDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    // 📌 POST /api/auth/register - регистрация
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        // Проверяем, что email не занят
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (existingUser != null)
            return BadRequest(new { message = "Пользователь с таким email уже существует" });

        // Парсим специализацию
        if (!Enum.TryParse<Specialization>(dto.Specialization, true, out var specialization))
        {
            return BadRequest(new { message = "Некорректная специализация" });
        }

        // Создаем пользователя
        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = _authService.HashPassword(dto.Password),
            Specialization = specialization,
            Description = dto.Description,
            IsOnline = true,
            LastActiveAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Генерируем токен
        var token = _authService.GenerateJwtToken(user);

        // Возвращаем ответ
        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            Token = token,
            ProjectsCount = 0,
            CompletedProjectsCount = 0
        });
    }

    // 📌 POST /api/auth/login - вход
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        // Ищем пользователя по email
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
            return Unauthorized(new { message = "Неверный email или пароль" });

        // Проверяем пароль
        if (!_authService.VerifyPassword(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Неверный email или пароль" });

        // Обновляем статус онлайн
        user.IsOnline = true;
        user.LastActiveAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Генерируем токен
        var token = _authService.GenerateJwtToken(user);

        // Получаем статистику проектов
        var projectsCount = await _context.ProjectMembers
            .CountAsync(pm => pm.UserId == user.Id);

        var completedProjectsCount = await _context.ProjectMembers
            .Where(pm => pm.UserId == user.Id && pm.Project.Status == "Completed")
            .CountAsync();

        // Возвращаем ответ
        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            Token = token,
            ProjectsCount = projectsCount,
            CompletedProjectsCount = completedProjectsCount
        });
    }

    // 📌 POST /api/auth/logout - выход
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _context.Users.FindAsync(userId);

        if (user != null)
        {
            user.IsOnline = false;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Выход выполнен" });
    }

    // 📌 GET /api/auth/me - получить текущего пользователя
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
            return NotFound(new { message = "Пользователь не найден" });

        var projectsCount = await _context.ProjectMembers
            .CountAsync(pm => pm.UserId == user.Id);

        var completedProjectsCount = await _context.ProjectMembers
            .Where(pm => pm.UserId == user.Id && pm.Project.Status == "Completed")
            .CountAsync();

        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            ProjectsCount = projectsCount,
            CompletedProjectsCount = completedProjectsCount
        });
    }
}