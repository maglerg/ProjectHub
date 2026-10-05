// Services/IPresenceService.cs

using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

/// <summary>
/// Единая точка правды: «виден ли онлайн-статус пользователя X
/// конкретному смотрящему Y».
/// </summary>
public interface IPresenceService
{
    /// <summary>
    /// Возвращает true, если смотрящий должен видеть,
    /// что пользователь <paramref name="targetUserId"/> сейчас онлайн.
    /// </summary>
    Task<bool> CanSeeOnlineStatusAsync(
        Guid targetUserId, Guid? viewerUserId);

    /// <summary>
    /// Массовая версия: возвращает набор targetId, чей онлайн-статус
    /// виден смотрящему. Для оптимизации (один SQL на пачку).
    /// </summary>
    Task<HashSet<Guid>> FilterVisibleOnlineUsersAsync(
        IEnumerable<Guid> targetUserIds, Guid? viewerUserId);
}