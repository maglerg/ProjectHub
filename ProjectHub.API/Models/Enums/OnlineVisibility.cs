// Models/Enums/OnlineVisibility.cs

namespace ProjectHub.API.Models.Enums;

/// <summary>
/// Кто видит мой онлайн-статус.
/// </summary>
public enum OnlineVisibility
{
    /// <summary>Все пользователи (по умолчанию).</summary>
    Everyone = 0,

    /// <summary>Только мои друзья.</summary>
    FriendsOnly = 1,

    /// <summary>Никто. Меня всегда показывают оффлайн.</summary>
    Nobody = 2
}