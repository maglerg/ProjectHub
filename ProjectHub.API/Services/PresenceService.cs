// Services/PresenceService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class PresenceService : IPresenceService
{
    private readonly AppDbContext _db;
    private readonly ILogger<PresenceService> _logger;

    public PresenceService(AppDbContext db, ILogger<PresenceService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<bool> CanSeeOnlineStatusAsync(
        Guid targetUserId, Guid? viewerUserId)
    {
        // Свой собственный статус виден всегда
        if (viewerUserId.HasValue && viewerUserId.Value == targetUserId)
            return true;

        var target = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == targetUserId)
            .Select(u => new { u.IsOnline, u.OnlineVisibility })
            .FirstOrDefaultAsync();

        if (target == null) return false;
        if (!target.IsOnline) return false;

        switch (target.OnlineVisibility)
        {
            case OnlineVisibility.Everyone:
                return true;

            case OnlineVisibility.Nobody:
                return false;

            case OnlineVisibility.FriendsOnly:
                if (!viewerUserId.HasValue) return false;

                // Дружба хранится двумя записями (A→B и B→A).
                // Достаточно проверить одну — обе создаются вместе.
                return await _db.Friends
                    .AnyAsync(f => f.UserId == targetUserId
                                   && f.FriendId == viewerUserId.Value
                                   && f.Status == FriendStatus.Accepted);

            default:
                return false;
        }
    }

    public async Task<HashSet<Guid>> FilterVisibleOnlineUsersAsync(
        IEnumerable<Guid> targetUserIds, Guid? viewerUserId)
    {
        var ids = targetUserIds?
            .Distinct()
            .ToList() ?? new List<Guid>();

        if (ids.Count == 0)
            return new HashSet<Guid>();

        // Забираем всех кандидатов одним запросом
        var candidates = await _db.Users
            .AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.IsOnline,
                u.OnlineVisibility,
            })
            .ToListAsync();

        var visible = new HashSet<Guid>();

        // Кандидаты, которым нужно проверить дружбу
        var friendOnlyIds = new List<Guid>();

        foreach (var c in candidates)
        {
            if (!c.IsOnline) continue;

            // Свой статус — виден
            if (viewerUserId.HasValue && c.Id == viewerUserId.Value)
            {
                visible.Add(c.Id);
                continue;
            }

            switch (c.OnlineVisibility)
            {
                case OnlineVisibility.Everyone:
                    visible.Add(c.Id);
                    break;

                case OnlineVisibility.Nobody:
                    // не видим
                    break;

                case OnlineVisibility.FriendsOnly:
                    if (viewerUserId.HasValue)
                        friendOnlyIds.Add(c.Id);
                    break;
            }
        }

        // Один SQL: какие из friendOnlyIds — друзья смотрящего?
        if (viewerUserId.HasValue && friendOnlyIds.Count > 0)
        {
            var friendIds = await _db.Friends
                .AsNoTracking()
                .Where(f => f.FriendId == viewerUserId.Value
                            && friendOnlyIds.Contains(f.UserId)
                            && f.Status == FriendStatus.Accepted)
                .Select(f => f.UserId)
                .ToListAsync();

            foreach (var id in friendIds)
                visible.Add(id);
        }

        return visible;
    }
}