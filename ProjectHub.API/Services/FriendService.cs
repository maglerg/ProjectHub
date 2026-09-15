// Services/FriendService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.FriendDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class FriendService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<FriendService> _logger;
    private readonly NotificationService _notificationService;

    public FriendService(AppDbContext dbContext, ILogger<FriendService> logger, NotificationService notificationService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
    }

    // 📌 Получить список друзей пользователя
    public async Task<List<FriendDto>> GetFriendsAsync(Guid userId)
    {
        var friends = await _dbContext.Friends
            .Include(f => f.FriendUser)
            .Where(f => f.UserId == userId && f.Status == FriendStatus.Accepted)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return friends.Select(f => new FriendDto
        {
            Id = f.FriendUser.Id,
            Name = f.FriendUser.Name,
            Email = f.FriendUser.Email,
            Specialization = f.FriendUser.Specialization.ToString(),
            Description = f.FriendUser.Description,
            IsOnline = f.FriendUser.IsOnline,
            CreatedAt = f.FriendUser.CreatedAt,
            FriendSince = f.CreatedAt
        }).ToList();
    }

    // 📌 Добавить друга по email
    public async Task<FriendResponseDto> AddFriendAsync(Guid userId, string friendEmail)
    {
        // Находим пользователя, которого хотят добавить
        var friendUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == friendEmail);

        if (friendUser == null)
        {
            return new FriendResponseDto
            {
                Success = false,
                Message = "Пользователь с таким email не найден"
            };
        }

        if (friendUser.Id == userId)
        {
            return new FriendResponseDto
            {
                Success = false,
                Message = "Нельзя добавить себя в друзья"
            };
        }

        // Проверяем, есть ли уже такая связь
        var existingFriend = await _dbContext.Friends
            .FirstOrDefaultAsync(f => f.UserId == userId && f.FriendId == friendUser.Id);

        if (existingFriend != null)
        {
            if (existingFriend.Status == FriendStatus.Accepted)
            {
                return new FriendResponseDto
                {
                    Success = false,
                    Message = "Этот пользователь уже в друзьях"
                };
            }
            else if (existingFriend.Status == FriendStatus.Pending)
            {
                return new FriendResponseDto
                {
                    Success = false,
                    Message = "Заявка уже отправлена"
                };
            }
        }

        // Создаем запись о дружбе
        var friend = new Friend
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FriendId = friendUser.Id,
            Status = FriendStatus.Accepted,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Friends.AddAsync(friend);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Пользователь {userId} добавил в друзья {friendUser.Id}");

        return new FriendResponseDto
        {
            Success = true,
            Message = "Пользователь добавлен в друзья",
            Friend = new FriendDto
            {
                Id = friendUser.Id,
                Name = friendUser.Name,
                Email = friendUser.Email,
                Specialization = friendUser.Specialization.ToString(),
                Description = friendUser.Description,
                IsOnline = friendUser.IsOnline,
                CreatedAt = friendUser.CreatedAt,
                FriendSince = friend.CreatedAt
            }
        };
    }

    // 📌 Удалить друга
    public async Task<bool> RemoveFriendAsync(Guid userId, Guid friendId)
    {
        // Находим обе записи о дружбе
        var friendships = await _dbContext.Friends
            .Where(f => (f.UserId == userId && f.FriendId == friendId) ||
                        (f.UserId == friendId && f.FriendId == userId))
            .ToListAsync();

        if (!friendships.Any())
            return false;

        // Удаляем обе записи
        _dbContext.Friends.RemoveRange(friendships);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"🗑️ Пользователь {userId} и {friendId} удалены из друзей друг у друга");

        // 📨 Уведомление второму пользователю
        var user = await _dbContext.Users.FindAsync(userId);
        await _notificationService.CreateNotificationAsync(
            friendId,
            "💔 Пользователь удален из друзей",
            $"Пользователь {user?.Name} удалил вас из друзей",
            NotificationType.FriendRemoved,
            $"/users/{Uri.EscapeDataString(user?.Email ?? "")}",
            userId
        );

        return true;
    }

    public async Task<bool> IsFriendByEmailAsync(Guid userId, string friendEmail)
    {
        var friendUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == friendEmail);

        if (friendUser == null)
            return false;

        return await _dbContext.Friends
            .AnyAsync(f => f.UserId == userId && f.FriendId == friendUser.Id && f.Status == FriendStatus.Accepted);
    }

    // 📌 Получить статус дружбы
    public async Task<FriendStatus> GetFriendStatusAsync(Guid userId, Guid friendId)
    {
        var friend = await _dbContext.Friends
            .FirstOrDefaultAsync(f => f.UserId == userId && f.FriendId == friendId);

        if (friend == null)
            return FriendStatus.Rejected;

        return friend.Status;
    }
}