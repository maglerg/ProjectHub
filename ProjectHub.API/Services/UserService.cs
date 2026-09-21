// ProjectHub.API/Services/UserService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models.Enums;
using ProjectHub.API.DTOs.UserDtos;
using ProjectHub.Models;
using ProjectHub.Models.Enums;

namespace ProjectHub.API.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;
    private readonly FileStorageService _fileStorage;

    public UserService(
        AppDbContext context,
        IAuthService authService,
        FileStorageService fileStorage)
    {
        _context = context;
        _authService = authService;
        _fileStorage = fileStorage;
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

    // ═══════════════════════════════════════════════════════════
    //  АВАТАР ПОЛЬЗОВАТЕЛЯ
    // ═══════════════════════════════════════════════════════════

    private static readonly string[] AllowedAvatarExtensions =
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp"
    };

    private const long MaxAvatarSizeBytes = 3 * 1024 * 1024; // 3 МБ

    public async Task<UserResponseDto> UploadAvatarAsync(Guid userId, IFormFile file)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Пользователь не найден");

        if (file == null || file.Length == 0)
            throw new InvalidOperationException("Файл пуст");

        if (file.Length > MaxAvatarSizeBytes)
            throw new InvalidOperationException(
                $"Файл слишком большой (макс. {MaxAvatarSizeBytes / 1024 / 1024} МБ)");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedAvatarExtensions.Contains(ext))
            throw new InvalidOperationException($"Тип файла {ext} не разрешён");

        // Удаляем старый аватар
        if (!string.IsNullOrWhiteSpace(user.AvatarUrl))
        {
            try
            {
                var oldStored = Path.GetFileName(
                    new Uri(user.AvatarUrl, UriKind.RelativeOrAbsolute).ToString());
                _fileStorage.Delete(oldStored);
            }
            catch { /* ignore */ }
        }

        var storedName = await _fileStorage.SaveAsync(file.OpenReadStream(), ext);
        user.AvatarUrl = $"/uploads/{storedName}";

        await _context.SaveChangesAsync();

        return await GetCurrentUserAsync(userId);
    }

    public async Task<UserResponseDto> DeleteAvatarAsync(Guid userId)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Пользователь не найден");

        if (string.IsNullOrWhiteSpace(user.AvatarUrl))
            throw new InvalidOperationException("У пользователя нет аватара");

        try
        {
            var oldStored = Path.GetFileName(
                new Uri(user.AvatarUrl, UriKind.RelativeOrAbsolute).ToString());
            _fileStorage.Delete(oldStored);
        }
        catch { /* ignore */ }

        user.AvatarUrl = null;
        await _context.SaveChangesAsync();

        return await GetCurrentUserAsync(userId);
    }

    public async Task<bool> UserExistsAsync(string email)
    {
        return await _context.Users.AnyAsync(u => u.Email == email);
    }

    // 📌 РЕГИСТРАЦИЯ
    public async Task<UserResponseDto> RegisterUserAsync(RegisterDto dto)
    {
        if (await UserExistsAsync(dto.Email))
        {
            throw new InvalidOperationException("Пользователь с таким email уже существует");
        }

        if (!Enum.TryParse<Specialization>(dto.Specialization, true, out var specialization))
        {
            throw new ArgumentException("Некорректная специализация");
        }

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
            CompletedProjectsCount = 0,
            ChatPrivacy = user.ChatPrivacy.ToString(),
            AvatarUrl = user.AvatarUrl
        };
    }

    // 📌 ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
    public async Task<UserResponseDto> UpdateUserAsync(Guid userId, UpdateUserDto dto)
    {
        var user = await GetUserByIdAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException("Пользователь не найден");
        }

        user.Name = dto.Name;
        user.Description = dto.Description;

        if (!string.IsNullOrEmpty(dto.Specialization))
        {
            if (Enum.TryParse<Specialization>(dto.Specialization, true, out var specialization))
            {
                user.Specialization = specialization;
            }
        }

        if (!string.IsNullOrEmpty(dto.ChatPrivacy))
        {
            if (Enum.TryParse<ChatPrivacy>(dto.ChatPrivacy, true, out var privacy))
            {
                user.ChatPrivacy = privacy;
            }
        }

        await UpdateUserAsync(user);

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
            CompletedProjectsCount = completedProjectsCount,
            ChatPrivacy = user.ChatPrivacy.ToString(),
            AvatarUrl = user.AvatarUrl        // 🆕
        };
    }

    // 📌 ПРОФИЛЬ ПО EMAIL
    public async Task<UserResponseDto?> GetUserProfileByEmailAsync(string email)
    {
        var user = await _context.Users
            .Include(u => u.OwnedProjects)
            .Include(u => u.ProjectMemberships)
                .ThenInclude(pm => pm.Project)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return null;

        return new UserResponseDto
        {
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = user.IsOnline,
            CreatedAt = user.CreatedAt,
            ProjectsCount = user.OwnedProjects.Count + user.ProjectMemberships.Count,
            CompletedProjectsCount = user.ProjectMemberships
                .Count(pm => pm.Project.Status == ProjectStatus.Completed),
            ChatPrivacy = user.ChatPrivacy.ToString(),
            AvatarUrl = user.AvatarUrl        // 🆕
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

        user.IsOnline = true;
        user.LastActiveAt = DateTime.UtcNow;
        await UpdateUserAsync(user);

        var token = _authService.GenerateJwtToken(user);

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
            CompletedProjectsCount = completedProjectsCount,
            ChatPrivacy = user.ChatPrivacy.ToString(),
            AvatarUrl = user.AvatarUrl        // 🆕
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
            CompletedProjectsCount = completedProjectsCount,
            ChatPrivacy = user.ChatPrivacy.ToString(),
            AvatarUrl = user.AvatarUrl        // 🆕
        };
    }
}