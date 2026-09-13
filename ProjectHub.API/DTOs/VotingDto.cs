namespace ProjectHub.API.DTOs;

// 📌 Создание голосования
public class CreateVotingDto
{
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// От 2 до 10 вариантов
    /// </summary>
    public List<string> Options { get; set; } = new();

    public bool IsMultipleChoice { get; set; } = false;
    public bool AllowRevote { get; set; } = false;
    public bool ShowResultsBeforeVote { get; set; } = false;
    public bool IsAnonymous { get; set; } = false;
    public DateTime? EndsAt { get; set; }
}

// 📌 Голосование (для клиента)
public class VotingDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectCode { get; set; } = string.Empty;

    public Guid CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public bool IsMultipleChoice { get; set; }
    public bool AllowRevote { get; set; }
    public bool ShowResultsBeforeVote { get; set; }
    public bool IsAnonymous { get; set; }
    public bool IsClosed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EndsAt { get; set; }

    /// <summary>
    /// Закрыто ли по времени
    /// </summary>
    public bool IsExpired { get; set; }

    public List<VotingOptionDto> Options { get; set; } = new();

    /// <summary>
    /// Проголосовал ли текущий пользователь
    /// </summary>
    public bool HasVoted { get; set; }

    /// <summary>
    /// id опций, за которые проголосовал текущий пользователь
    /// </summary>
    public List<Guid> SelectedOptionIds { get; set; } = new();

    /// <summary>
    /// Всего проголосовало
    /// </summary>
    public int TotalVoters { get; set; }

    /// <summary>
    /// Всего участников проекта
    /// </summary>
    public int TotalProjectMembers { get; set; }
}

public class VotingOptionDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int Order { get; set; }
    public int VotesCount { get; set; }

    /// <summary>
    /// Процент от числа проголосовавших
    /// </summary>
    public double Percent { get; set; }

    /// <summary>
    /// Проголосовал ли текущий пользователь за этот вариант
    /// </summary>
    public bool IsSelectedByCurrentUser { get; set; }
    // 📌 НОВОЕ: список проголосовавших за этот вариант
    public List<VotingVoterDto> Voters { get; set; } = new();
}
public class VotingVoterDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Specialization { get; set; }
    public DateTime VotedAt { get; set; }
}
// 📌 Голосование по вариантам
public class VoteDto
{
    /// <summary>
    /// id вариантов, за которые голосуем
    /// </summary>
    public List<Guid> OptionIds { get; set; } = new();
}

// 📌 Краткая информация о голосовании (для счётчика)
public class VotingSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsClosed { get; set; }
    public bool IsExpired { get; set; }
    public bool HasVoted { get; set; }
}