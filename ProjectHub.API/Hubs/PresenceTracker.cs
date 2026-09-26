// Hubs/PresenceTracker.cs

using System.Collections.Concurrent;

namespace ProjectHub.API.Hubs;

/// <summary>
/// Singleton-трекер онлайн-присутствия.
/// Хранит:
///   • сколько активных SignalR-соединений у каждого пользователя
///     (один user может открыть несколько вкладок — счётчик);
///   • какие чаты сейчас «открыты» у каждого соединения
///     (чтобы при disconnect выйти из групп не нужно — SignalR сам чистит);
///   • множество онлайн-пользователей (для broadcast'а смены статуса).
/// </summary>
public class PresenceTracker
{
    // userId -> количество активных соединений
    private readonly ConcurrentDictionary<Guid, int> _userConnections = new();

    // connectionId -> userId (чтобы быстро найти при disconnect)
    private readonly ConcurrentDictionary<string, Guid> _connectionToUser = new();

    // connectionId -> набор chatId, в которые connection подписан
    // (нужно, чтобы понимать, кому слать статус «онлайн» в конкретном чате)
    private readonly ConcurrentDictionary<string, HashSet<Guid>> _connectionChats = new();

    /// <summary>
    /// Регистрирует новое соединение. Возвращает true, если пользователь
    /// стал онлайн (был 0 соединений, стало 1).
    /// </summary>
    public bool UserConnected(string connectionId, Guid userId)
    {
        _connectionToUser[connectionId] = userId;

        var newCount = _userConnections.AddOrUpdate(userId, 1, (_, old) => old + 1);
        return newCount == 1;
    }

    /// <summary>
    /// Убирает соединение. Возвращает true, если пользователь стал оффлайн
    /// (было 1 соединение, стало 0).
    /// </summary>
    public bool UserDisconnected(string connectionId, out Guid userId)
    {
        userId = Guid.Empty;

        if (!_connectionToUser.TryRemove(connectionId, out userId))
            return false;

        _connectionChats.TryRemove(connectionId, out _);

        if (_userConnections.TryGetValue(userId, out var old))
        {
            var newCount = old - 1;
            if (newCount <= 0)
            {
                _userConnections.TryRemove(userId, out _);
                return true;   // стал оффлайн
            }

            _userConnections[userId] = newCount;
        }

        return false;
    }

    /// <summary>Пользователь сейчас онлайн (есть хотя бы одно соединение).</summary>
    public bool IsOnline(Guid userId) => _userConnections.ContainsKey(userId);

    /// <summary>Список всех онлайн-пользователей.</summary>
    public IReadOnlyCollection<Guid> GetOnlineUsers()
        => _userConnections.Keys.ToArray();

    /// <summary>
    /// Регистрирует подписку соединения на чат (чтобы при disconnect
    /// можно было бы при желании понять, в какие чаты слать оффлайн-статус).
    /// </summary>
    public void AddConnectionToChat(string connectionId, Guid chatId)
    {
        var set = _connectionChats.GetOrAdd(connectionId, _ => new HashSet<Guid>());
        lock (set)
        {
            set.Add(chatId);
        }
    }

    public void RemoveConnectionFromChat(string connectionId, Guid chatId)
    {
        if (_connectionChats.TryGetValue(connectionId, out var set))
        {
            lock (set)
            {
                set.Remove(chatId);
            }
        }
    }

    /// <summary>
    /// Все userId, у которых есть хотя бы одно соединение,
    /// подписанное на указанный чат.
    /// </summary>
    public HashSet<Guid> GetUsersInChat(Guid chatId)
    {
        var result = new HashSet<Guid>();

        foreach (var (connectionId, chats) in _connectionChats)
        {
            bool contains;
            lock (chats) { contains = chats.Contains(chatId); }
            if (!contains) continue;

            if (_connectionToUser.TryGetValue(connectionId, out var userId))
                result.Add(userId);
        }

        return result;
    }
}