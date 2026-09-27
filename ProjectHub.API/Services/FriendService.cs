// Services/FriendService.cs

using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.FriendDtos;
using ProjectHub.API.Hubs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class FriendService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<FriendService> _logger;
    private readonly NotificationService _notificationService;
    private readonly IHubContext<ChatHub> _hubContext;

    public FriendService(
        AppDbContext dbContext,
        ILogger<FriendService> logger,
        NotificationService notificationService,
        IHubContext<ChatHub> hubContext)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
        _hubContext = hubContext;
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
            FriendSince = f.CreatedAt,
            AvatarUrl = f.FriendUser.AvatarUrl
        }).ToList();
    }

    // 📌 Добавить друга по email (создаёт сразу Accepted — legacy-путь,
    //     обычно используется FriendRequestService)
    public async Task<FriendResponseDto> AddFriendAsync(Guid userId, string friendEmail)
    {
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

        var dto = new FriendDto
        {
            Id = friendUser.Id,
            Name = friendUser.Name,
            Email = friendUser.Email,
            Specialization = friendUser.Specialization.ToString(),
            Description = friendUser.Description,
            IsOnline = friendUser.IsOnline,
            CreatedAt = friendUser.CreatedAt,
            FriendSince = friend.CreatedAt,
            AvatarUrl = friendUser.AvatarUrl
        };

        // 🆕 ── SignalR: FriendAdded обоим ──
        var payload = new
        {
            UserId = userId,
            FriendId = friendUser.Id,
        };

        await EmitToUserAsync(userId, "FriendAdded", payload);
        await EmitToUserAsync(friendUser.Id, "FriendAdded", payload);

        return new FriendResponseDto
        {
            Success = true,
            Message = "Пользователь добавлен в друзья",
            Friend = dto
        };
    }

    // 📌 Удалить друга
    public async Task<bool> RemoveFriendAsync(Guid userId, Guid friendId)
    {
        var friendships = await _dbContext.Friends
            .Where(f => (f.UserId == userId && f.FriendId == friendId) ||
                        (f.UserId == friendId && f.FriendId == userId))
            .ToListAsync();

        if (!friendships.Any())
            return false;

        _dbContext.Friends.RemoveRange(friendships);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            $"🗑️ Пользователь {userId} и {friendId} удалены из друзей друг у друга");

        var user = await _dbContext.Users.FindAsync(userId);

        // 📨 Уведомление второму пользователю
        await _notificationService.CreateNotificationAsync(
            friendId,
            "💔 Пользователь удален из друзей",
            $"Пользователь {user?.Name} удалил вас из друзей",
            NotificationType.FriendRemoved,
            $"/users/{Uri.EscapeDataString(user?.Email ?? "")}",
            userId
        );

        // 🆕 ── SignalR: FriendRemoved обоим ──
        var payload = new
        {
            UserId = userId,
            FriendId = friendId,
        };

        await EmitToUserAsync(userId, "FriendRemoved", payload);
        await EmitToUserAsync(friendId, "FriendRemoved", payload);

        return true;
    }

    public async Task<bool> IsFriendByEmailAsync(Guid userId, string friendEmail)
    {
        var friendUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == friendEmail);

        if (friendUser == null)
            return false;

        return await _dbContext.Friends
            .AnyAsync(f => f.UserId == userId
                           && f.FriendId == friendUser.Id
                           && f.Status == FriendStatus.Accepted);
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

    // ═══════════════════════════════════════════════════════════
    //  🆕 SIGNALR — ХЕЛПЕР ЭМИТА
    // ═══════════════════════════════════════════════════════════

    private async Task EmitToUserAsync(Guid userId, string eventName, object payload)
    {
        try
        {
            await _hubContext.Clients
                .Group($"user:{userId}")
                .SendAsync(eventName, payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "SignalR: не удалось отправить {EventName} в user:{UserId}",
                eventName, userId);
        }
    }
}