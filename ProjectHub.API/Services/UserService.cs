// ProjectHub.API/Services/UserService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models.Enums;
using ProjectHub.DTOs;
using ProjectHub.Models;
using ProjectHub.Models.Enums;

namespace ProjectHub.API.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public UserService(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    public async Task<User?> GetUserByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.OwnedProjects)
            .Include(u => u.ProjectMemberships)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User> CreateUserAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    public async Task UpdateUserAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> UserExistsAsync(string email)
    {
        return await _context.Users.AnyAsync(u => u.Email == email);
    }

    // 📌 РЕГИСТРАЦИЯ
    public async Task<UserResponseDto> RegisterUserAsync(RegisterDto dto)
    {
        // Проверяем, что email не занят
        if (await UserExistsAsync(dto.Email))
        {
            throw new InvalidOperationException("Пользователь с таким email уже существует");
        }

        // Парсим специализацию
        if (!Enum.TryParse<Specialization>(dto.Specialization, true, out var specialization))
        {
            throw new ArgumentException("Некорректная специализация");
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

        await CreateUserAsync(user);

        // Генерируем токен
        var token = _authService.GenerateJwtToken(user);

        return new UserResponseDto
        {
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            Token = token,
            ProjectsCount = 0,
            CompletedProjectsCount = 0
        };
    }

    // 📌 ВХОД
    public async Task<UserResponseDto> LoginUserAsync(LoginDto dto)
    {
        var user = await GetUserByEmailAsync(dto.Email);

        if (user == null || !_authService.VerifyPassword(dto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Неверный email или пароль");
        }

        // Обновляем статус онлайн
        user.IsOnline = true;
        user.LastActiveAt = DateTime.UtcNow;
        await UpdateUserAsync(user);

        // Генерируем токен
        var token = _authService.GenerateJwtToken(user);

        // Получаем статистику проектов
        var projectsCount = await _context.ProjectMembers
            .CountAsync(pm => pm.UserId == user.Id);

        var completedProjectsCount = await _context.ProjectMembers
            .Where(pm => pm.UserId == user.Id && pm.Project.Status == ProjectStatus.Completed)
            .CountAsync();

        return new UserResponseDto
        {
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            Token = token,
            ProjectsCount = projectsCount,
            CompletedProjectsCount = completedProjectsCount
        };
    }

    // 📌 ВЫХОД
    public async Task LogoutUserAsync(Guid userId)
    {
        var user = await GetUserByIdAsync(userId);
        if (user != null)
        {
            user.IsOnline = false;
            await UpdateUserAsync(user);
        }
    }

    // 📌 ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
    public async Task<UserResponseDto> GetCurrentUserAsync(Guid userId)
    {
        var user = await GetUserByIdAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException("Пользователь не найден");
        }

        var projectsCount = await _context.ProjectMembers
            .CountAsync(pm => pm.UserId == user.Id);

        var completedProjectsCount = await _context.ProjectMembers
            .Where(pm => pm.UserId == user.Id && pm.Project.Status == ProjectStatus.Completed)
            .CountAsync();

        return new UserResponseDto
        {
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            ProjectsCount = projectsCount,
            CompletedProjectsCount = completedProjectsCount
        };
    }
}