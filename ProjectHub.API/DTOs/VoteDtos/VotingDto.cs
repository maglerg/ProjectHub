namespace ProjectHub.API.DTOs.VoteDtos;

// Голосование (для клиента)
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

    /// Закрыто ли по времени
    public bool IsExpired { get; set; }

    public List<VotingOptionDto> Options { get; set; } = new();

    /// Проголосовал ли текущий пользователь
    public bool HasVoted { get; set; }

    /// id опций, за которые проголосовал текущий пользователь
    public List<Guid> SelectedOptionIds { get; set; } = new();
    /// Всего проголосовало
    public int TotalVoters { get; set; }
    /// Всего участников проекта
    public int TotalProjectMembers { get; set; }
}
