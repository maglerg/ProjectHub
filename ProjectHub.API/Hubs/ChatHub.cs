// Hubs/ChatHub.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.API.Services;
using System.Security.Claims;

namespace ProjectHub.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly PresenceTracker _presence;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(PresenceTracker presence, ILogger<ChatHub> logger)
    {
        _presence = presence;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var userId))
            throw new HubException("Пользователь не авторизован");
        return userId;
    }

    // ═══════════════════════════════════════════════════════════
    //  CONNECT / DISCONNECT
    // ═══════════════════════════════════════════════════════════

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();

        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");

        var becameOnline = _presence.UserConnected(Context.ConnectionId, userId);

        _logger.LogInformation(
            "SignalR connect: user={UserId}, conn={ConnId}, becameOnline={BecameOnline}",
            userId, Context.ConnectionId, becameOnline);

        if (becameOnline)
        {
            await UpdateUserOnlineStatusAsync(userId, true);
            await EmitPresenceAsync(userId, isOnline: true);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var becameOffline = _presence.UserDisconnected(Context.ConnectionId, out var userId);

        _logger.LogInformation(
            "SignalR disconnect: user={UserId}, conn={ConnId}, becameOffline={BecameOffline}",
            userId, Context.ConnectionId, becameOffline);

        if (becameOffline && userId != Guid.Empty)
        {
            var lastActive = DateTime.UtcNow;
            await UpdateUserOnlineStatusAsync(userId, false, lastActive);
            await EmitPresenceAsync(userId, isOnline: false, lastActive);
        }

        await base.OnDisconnectedAsync(exception);
    }

    // ═══════════════════════════════════════════════════════════
    //  ПОДПИСКА НА ЧАТ
    // ═══════════════════════════════════════════════════════════

    public async Task JoinChat(Guid chatId)
    {
        var userId = GetUserId();

        using var scope = Context.GetHttpContext()!.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var isParticipant = await db.ChatParticipants
            .AnyAsync(p => p.ChatId == chatId && p.UserId == userId);

        if (!isParticipant)
            throw new HubException("У вас нет доступа к этому чату");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat:{chatId}");
        _presence.AddConnectionToChat(Context.ConnectionId, chatId);

        _logger.LogInformation(
            "User {UserId} joined chat {ChatId} (conn {ConnId})",
            userId, chatId, Context.ConnectionId);
    }

    public async Task LeaveChat(Guid chatId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat:{chatId}");
        _presence.RemoveConnectionFromChat(Context.ConnectionId, chatId);

        _logger.LogInformation(
            "Connection {ConnId} left chat {ChatId}",
            Context.ConnectionId, chatId);
    }

    // ═══════════════════════════════════════════════════════════
    //  🆕 ПОДПИСКА НА ПРОЕКТ (по публичному коду)
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Подписаться на события проекта (доска задач и др.).
    /// Принимает публичный код проекта (например "ABC-123-DEF").
    /// Группа: project:{publicCode}
    /// </summary>
    public async Task JoinProject(string projectCode)
    {
        if (string.IsNullOrWhiteSpace(projectCode))
            throw new HubException("Код проекта обязателен");

        var userId = GetUserId();

        using var scope = Context.GetHttpContext()!.RequestServices.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var project = await db.Projects
            .Where(p => p.PublicCode == projectCode)
            .Select(p => new { p.Id, p.OwnerId, p.PublicCode })
            .FirstOrDefaultAsync();

        if (project == null)
            throw new HubException("Проект не найден");

        var isMember = project.OwnerId == userId
            || await db.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId);

        if (!isMember)
            throw new HubException("У вас нет доступа к этому проекту");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"project:{project.PublicCode}");

        _logger.LogInformation(
            "User {UserId} joined project {ProjectCode} (conn {ConnId})",
            userId, project.PublicCode, Context.ConnectionId);
    }

    /// <summary>Отписаться от событий проекта. Принимает публичный код.</summary>
    public async Task LeaveProject(string projectCode)
    {
        if (string.IsNullOrWhiteSpace(projectCode))
            return;

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project:{projectCode}");

        _logger.LogInformation(
            "Connection {ConnId} left project {ProjectCode}",
            Context.ConnectionId, projectCode);
    }

    // ═══════════════════════════════════════════════════════════
    //  ВСПОМОГАТЕЛЬНЫЕ
    // ═══════════════════════════════════════════════════════════

    private async Task UpdateUserOnlineStatusAsync(
        Guid userId, bool isOnline, DateTime? lastActiveAt = null)
    {
        try
        {
            using var scope = Context.GetHttpContext()!.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return;

            user.IsOnline = isOnline;
            if (lastActiveAt.HasValue)
                user.LastActiveAt = lastActiveAt.Value;
            else if (isOnline)
                user.LastActiveAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Не удалось обновить онлайн-статус пользователя {UserId}", userId);
        }
    }
    // ═══════════════════════════════════════════════════════════
    //  🆕 РАССЫЛКА PRESENCE С УЧЁТОМ OnlineVisibility
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// Эмитит UserOnline / UserOffline, соблюдая настройку приватности
    /// пользователя, чей статус изменился.
    ///
    ///   • Everyone    — всем (как раньше);
    ///   • FriendsOnly — только его друзьям;
    ///   • Nobody      — никому (событие не эмитится вообще).
    /// </summary>
    private async Task EmitPresenceAsync(
        Guid userId, bool isOnline, DateTime? lastActiveAt = null)
    {
        try
        {
            using var scope = Context.GetHttpContext()!.RequestServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var user = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new { u.OnlineVisibility })
                .FirstOrDefaultAsync();

            if (user == null) return;

            // Никто не должен видеть статус — вообще ничего не эмитим.
            if (user.OnlineVisibility == OnlineVisibility.Nobody)
                return;

            // Всем — как было.
            if (user.OnlineVisibility == OnlineVisibility.Everyone)
            {
                if (isOnline)
                    await Clients.Others.SendAsync("UserOnline", userId);
                else
                    await Clients.Others.SendAsync("UserOffline", userId, lastActiveAt);
                return;
            }

            // FriendsOnly — рассылаем только друзьям пользователя.
            if (user.OnlineVisibility == OnlineVisibility.FriendsOnly)
            {
                // Двусторонняя дружба (в БД две записи Friend — в обе стороны).
                // Нам нужны только те, у кого есть запись UserId=user, FriendId=friend.
                var friendIds = await db.Friends
                    .Where(f => f.UserId == userId
                                && f.Status == FriendStatus.Accepted)
                    .Select(f => f.FriendId)
                    .ToListAsync();

                if (friendIds.Count == 0) return;

                foreach (var friendId in friendIds)
                {
                    if (isOnline)
                    {
                        await Clients
                            .Group($"user:{friendId}")
                            .SendAsync("UserOnline", userId);
                    }
                    else
                    {
                        await Clients
                            .Group($"user:{friendId}")
                            .SendAsync("UserOffline", userId, lastActiveAt);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Не удалось эмитить presence для пользователя {UserId}", userId);
        }
    }
}