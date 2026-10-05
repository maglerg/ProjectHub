// ProjectHub.API/Services/UserService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models;
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

    private readonly IPresenceService _presence;

    private readonly ILogger<UserService> _logger;   // ← перенесли сюда, порядок не важен

    public UserService(
        AppDbContext context,
        IAuthService authService,
        FileStorageService fileStorage,
        IPresenceService presence,
        ILogger<UserService> logger)                  // 🆕 добавлен параметр
    {
        _context = context;
        _authService = authService;
        _fileStorage = fileStorage;
        _presence = presence;
        _logger = logger;                             // 🆕 присваивание
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

        // 🆕 Создаём дефолтные настройки уведомлений
        await CreateDefaultNotificationSettingsAsync(user.Id);

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
            OnlineVisibility = user.OnlineVisibility.ToString(),   // 🆕
            AvatarUrl = user.AvatarUrl
        };
    }

    // 📌 ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
    public async Task<UserResponseDto> UpdateUserAsync(Guid userId, UpdateUserDto dto)
    {
        _logger.LogInformation(
            "🟢 [UpdateUserAsync] START userId={UserId}, " +
            "DTO: Name='{Name}', Specialization='{Spec}', " +
            "ChatPrivacy='{Chat}', OnlineVisibility='{Vis}'",
            userId,
            dto.Name ?? "<null>",
            dto.Specialization ?? "<null>",
            dto.ChatPrivacy ?? "<null>",
            dto.OnlineVisibility ?? "<null>");

        // ── 1. Достаём пользователя из БД ──
        var user = await GetUserByIdAsync(userId);

        if (user == null)
        {
            _logger.LogWarning(
                "🟡 [UpdateUserAsync] Пользователь {UserId} не найден", userId);
            throw new KeyNotFoundException("Пользователь не найден");
        }

        _logger.LogInformation(
            "🟢 [UpdateUserAsync] Прочитан из БД: " +
            "ChatPrivacy={Chat}, OnlineVisibility={Vis}, IsOnline={Online}",
            user.ChatPrivacy,
            user.OnlineVisibility,
            user.IsOnline);

        // ── 2. Обновляем простые поля ──
        user.Name = dto.Name;
        user.Description = dto.Description;

        if (!string.IsNullOrEmpty(dto.Specialization))
        {
            if (Enum.TryParse<Specialization>(dto.Specialization, true, out var specialization))
            {
                user.Specialization = specialization;
                _logger.LogInformation(
                    "🟢 [UpdateUserAsync] Specialization -> {Spec}", specialization);
            }
            else
            {
                _logger.LogWarning(
                    "🟡 [UpdateUserAsync] Не удалось распарсить Specialization='{Raw}'",
                    dto.Specialization);
            }
        }

        if (!string.IsNullOrEmpty(dto.ChatPrivacy))
        {
            if (Enum.TryParse<ChatPrivacy>(dto.ChatPrivacy, true, out var privacy))
            {
                user.ChatPrivacy = privacy;
                _logger.LogInformation(
                    "🟢 [UpdateUserAsync] ChatPrivacy -> {Privacy}", privacy);
            }
            else
            {
                _logger.LogWarning(
                    "🟡 [UpdateUserAsync] Не удалось распарсить ChatPrivacy='{Raw}'",
                    dto.ChatPrivacy);
            }
        }

        // ── 3. Приватность онлайн-статуса ──
        if (!string.IsNullOrEmpty(dto.OnlineVisibility))
        {
            if (Enum.TryParse<OnlineVisibility>(dto.OnlineVisibility, true, out var visibility))
            {
                user.OnlineVisibility = visibility;
                _logger.LogInformation(
                    "🟢 [UpdateUserAsync] OnlineVisibility -> {Vis}", visibility);
            }
            else
            {
                _logger.LogWarning(
                    "🟡 [UpdateUserAsync] Не удалось распарсить OnlineVisibility='{Raw}'. " +
                    "Допустимые значения: Everyone, FriendsOnly, Nobody",
                    dto.OnlineVisibility);
            }
        }
        else
        {
            _logger.LogInformation(
                "🟡 [UpdateUserAsync] OnlineVisibility в DTO пустой — оставляем как есть ({Vis})",
                user.OnlineVisibility);
        }

        // ── 4. Перед сохранением ──
        _logger.LogInformation(
            "🟢 [UpdateUserAsync] Перед SaveChanges: " +
            "ChatPrivacy={Chat}, OnlineVisibility={Vis}",
            user.ChatPrivacy,
            user.OnlineVisibility);

        // ── 5. Сохраняем ──
        try
        {
            await UpdateUserAsync(user);
            _logger.LogInformation("🟢 [UpdateUserAsync] SaveChanges — OK");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "🔴 [UpdateUserAsync] Ошибка SaveChanges для {UserId}", userId);
            throw;
        }

        // ── 6. Перечитываем из БД (чтобы убедиться, что реально сохранилось) ──
        var verifyUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (verifyUser != null)
        {
            _logger.LogInformation(
                "🟢 [UpdateUserAsync] ПОСЛЕ сохранения (чтение из БД): " +
                "ChatPrivacy={Chat}, OnlineVisibility={Vis}",
                verifyUser.ChatPrivacy,
                verifyUser.OnlineVisibility);
        }
        else
        {
            _logger.LogWarning(
                "🟡 [UpdateUserAsync] Не удалось перечитать пользователя {UserId}",
                userId);
        }

        // ── 7. Считаем статистику ──
        var projectsCount = await _context.ProjectMembers
            .CountAsync(pm => pm.UserId == user.Id);

        var completedProjectsCount = await _context.ProjectMembers
            .Where(pm => pm.UserId == user.Id && pm.Project.Status == ProjectStatus.Completed)
            .CountAsync();

        var result = new UserResponseDto
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
            OnlineVisibility = user.OnlineVisibility.ToString(),
            AvatarUrl = user.AvatarUrl
        };

        _logger.LogInformation(
            "🟢 [UpdateUserAsync] END. Возвращаем DTO: " +
            "ChatPrivacy={Chat}, OnlineVisibility={Vis}",
            result.ChatPrivacy,
            result.OnlineVisibility);

        return result;
    }

    // 📌 ПРОФИЛЬ ПО EMAIL
    // 📌 ПРОФИЛЬ ПО EMAIL (с учётом смотрящего)
    public async Task<UserResponseDto?> GetUserProfileByEmailAsync(
        string email, Guid? viewerId)
    {
        var user = await _context.Users
            .Include(u => u.OwnedProjects)
            .Include(u => u.ProjectMemberships)
                .ThenInclude(pm => pm.Project)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
            return null;

        // 🆕 Фильтрация онлайн-статуса по приватности
        var isOnlineVisible = await _presence
            .CanSeeOnlineStatusAsync(user.Id, viewerId);

        return new UserResponseDto
        {
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            Description = user.Description,
            IsOnline = isOnlineVisible,                              // ← отфильтровано
            CreatedAt = user.CreatedAt,
            ProjectsCount = user.OwnedProjects.Count + user.ProjectMemberships.Count,
            CompletedProjectsCount = user.ProjectMemberships
                .Count(pm => pm.Project.Status == ProjectStatus.Completed),
            ChatPrivacy = user.ChatPrivacy.ToString(),
            OnlineVisibility = user.OnlineVisibility.ToString(),
            AvatarUrl = user.AvatarUrl
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

        // 🆕 На всякий случай: у старых пользователей настроек может не быть.
        //    Если их нет — создаём тихо (не блокирует логин при ошибке).
        await EnsureNotificationSettingsExistAsync(user.Id);

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
            OnlineVisibility = user.OnlineVisibility.ToString(),   // 🆕
            AvatarUrl = user.AvatarUrl
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

        _logger.LogInformation(
            "🟢 [GetCurrentUserAsync] userId={UserId}: " +
            "ChatPrivacy={Chat}, OnlineVisibility={Vis}",
            userId,
            user.ChatPrivacy,
            user.OnlineVisibility);

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
            OnlineVisibility = user.OnlineVisibility.ToString(),   // 🆕
            AvatarUrl = user.AvatarUrl
        };
    }

    // ═══════════════════════════════════════════════════════════
    //  🆕 СМЕНА ПАРОЛЯ
    // ═══════════════════════════════════════════════════════════

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        // 1. Базовая валидация
        if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            throw new InvalidOperationException("Введите текущий пароль");

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            throw new InvalidOperationException("Введите новый пароль");

        if (dto.NewPassword.Length < 6)
            throw new InvalidOperationException(
                "Новый пароль должен содержать минимум 6 символов");

        if (dto.NewPassword != dto.ConfirmPassword)
            throw new InvalidOperationException(
                "Новый пароль и его подтверждение не совпадают");

        if (dto.CurrentPassword == dto.NewPassword)
            throw new InvalidOperationException(
                "Новый пароль должен отличаться от текущего");

        // 2. Пользователь существует?
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Пользователь не найден");

        // 3. Проверяем текущий пароль
        if (!_authService.VerifyPassword(dto.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Текущий пароль указан неверно");

        // 4. Хешируем и сохраняем новый
        user.PasswordHash = _authService.HashPassword(dto.NewPassword);
        user.LastActiveAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // ⚠️ JWT не инвалидируется — текущие сессии продолжают работать
        //    до истечения токена. Это осознанное решение: у нас stateless JWT
        //    без refresh-токенов. При желании можно добавить «версию пароля»
        //    в claim и валидировать её — но это отдельная задача.
    }

    // ═══════════════════════════════════════════════════════════
    //  🆕 НАСТРОЙКИ УВЕДОМЛЕНИЙ — АВТОСОЗДАНИЕ
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Создаёт дефолтные настройки уведомлений для нового пользователя.
    /// </summary>
    private async Task CreateDefaultNotificationSettingsAsync(Guid userId)
    {
        // Защита от повторного создания (например, при гонках)
        var exists = await _context.UserNotificationSettings
            .AnyAsync(s => s.UserId == userId);

        if (exists)
            return;

        var settings = new UserNotificationSettings
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Enabled = true,
            NewMessages = true,
            FriendRequests = true,
            ProjectInvitations = true,
            ProjectChanges = true,
            TaskComments = true,
            Votings = true,
            TaskDeadlines = true,
            Applications = true,
            DeadlineDaysBefore = 3,
            InAppEnabled = true,
            EmailEnabled = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.UserNotificationSettings.Add(settings);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Гонка: кто-то параллельно создал — не страшно, просто игнорируем.
            _context.Entry(settings).State = EntityState.Detached;
        }
    }

    /// <summary>
    /// Тихо проверяет, что настройки существуют (для «старых» пользователей,
    /// зарегистрированных до появления фичи). Если нет — создаёт.
    /// </summary>
    private async Task EnsureNotificationSettingsExistAsync(Guid userId)
    {
        try
        {
            await CreateDefaultNotificationSettingsAsync(userId);
        }
        catch
        {
            // не ломаем логин, если что-то пошло не так
        }
    }
}