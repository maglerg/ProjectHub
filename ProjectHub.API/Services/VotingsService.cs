// Services/VotingsService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.VoteDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class VotingsService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<VotingsService> _logger;
    private readonly NotificationService _notificationService;
    private readonly ActivityService _activity;

    private const int MinOptions = 2;
    private const int MaxOptions = 10;

    public VotingsService(
        AppDbContext dbContext,
        ILogger<VotingsService> logger,
        NotificationService notificationService,
        ActivityService activity)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
        _activity = activity;
    }

    // 📌 Создать голосование
    public async Task<VotingDto> CreateVotingAsync(
        string projectCode, Guid userId, CreateVotingDto dto)
    {
        // 1. Валидация
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Название голосования обязательно");

        var options = dto.Options?
            .Where(o => !string.IsNullOrWhiteSpace(o))
            .Select(o => o.Trim())
            .ToList() ?? new List<string>();

        if (options.Count < MinOptions)
            throw new InvalidOperationException($"Нужно минимум {MinOptions} варианта");

        if (options.Count > MaxOptions)
            throw new InvalidOperationException($"Максимум {MaxOptions} вариантов");

        if (options.Distinct().Count() != options.Count)
            throw new InvalidOperationException("Варианты не должны повторяться");

        if (dto.EndsAt.HasValue && dto.EndsAt.Value <= DateTime.UtcNow)
            throw new InvalidOperationException("Дата окончания должна быть в будущем");

        // 2. Проект
        var project = await _dbContext.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.PublicCode == projectCode)
            ?? throw new KeyNotFoundException("Проект не найден");

        // 3. Проверка участника
        var isOwner = project.OwnerId == userId;
        var isMember = project.Members.Any(m => m.UserId == userId);

        if (!isOwner && !isMember)
            throw new UnauthorizedAccessException("Вы не участник этого проекта");

        // 4. Создаём голосование
        var voting = new Voting
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            CreatedById = userId,
            Title = dto.Title.Trim(),
            IsMultipleChoice = dto.IsMultipleChoice,
            AllowRevote = dto.AllowRevote,
            ShowResultsBeforeVote = dto.ShowResultsBeforeVote,
            IsAnonymous = dto.IsAnonymous,
            EndsAt = dto.EndsAt,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Votings.Add(voting);
        await _dbContext.SaveChangesAsync();

        // 5. Создаём опции
        var votingOptions = options.Select((text, index) => new VotingOption
        {
            Id = Guid.NewGuid(),
            VotingId = voting.Id,
            Text = text,
            Order = index
        }).ToList();

        _dbContext.VotingOptions.AddRange(votingOptions);

        await _activity.LogAsync(
            project.Id,
            userId,
            ActivityType.VotingCreated,
            summary: $"Создано голосование: {voting.Title}",
            link: $"/projects/{project.PublicCode}/votings/{voting.Id}",
            relatedEntityId: voting.Id
        );

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Создано голосование {voting.Id} в проекте {projectCode}");

        // 6. Уведомления всем участникам (кроме создателя)
        var creator = await _dbContext.Users.FindAsync(userId);
        var creatorName = creator?.Name ?? "Участник";

        var participantIds = new HashSet<Guid>(project.Members.Select(m => m.UserId))
        {
            project.OwnerId
        };

        foreach (var participantId in participantIds.Where(id => id != userId))
        {
            await _notificationService.CreateNotificationAsync(
                participantId,
                "🗳️ Новое голосование",
                $"{creatorName} создал голосование «{voting.Title}» в проекте '{project.Name}'",
                NotificationType.NewVoting,
                $"/projects/{project.PublicCode}/dashboard",
                voting.Id
            );
        }

        return await BuildVotingDtoAsync(voting.Id, userId);
    }

    // 📌 Список голосований проекта
    public async Task<List<VotingDto>> GetProjectVotingsAsync(string projectCode, Guid userId)
    {
        var project = await _dbContext.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.PublicCode == projectCode)
            ?? throw new KeyNotFoundException("Проект не найден");

        var isOwner = project.OwnerId == userId;
        var isMember = project.Members.Any(m => m.UserId == userId);

        if (!isOwner && !isMember)
            throw new UnauthorizedAccessException("Вы не участник этого проекта");

        var votingIds = await _dbContext.Votings
            .Where(v => v.ProjectId == project.Id)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => v.Id)
            .ToListAsync();

        var result = new List<VotingDto>();
        foreach (var id in votingIds)
        {
            result.Add(await BuildVotingDtoAsync(id, userId));
        }

        return result;
    }

    // 📌 Получить одно голосование
    public async Task<VotingDto> GetVotingAsync(Guid votingId, Guid userId)
    {
        return await BuildVotingDtoAsync(votingId, userId);
    }

    // 📌 Проголосовать
    public async Task<VotingDto> VoteAsync(Guid votingId, Guid userId, VoteDto dto)
    {
        var voting = await _dbContext.Votings
            .Include(v => v.Project).ThenInclude(p => p.Members)
            .Include(v => v.Options)
            .FirstOrDefaultAsync(v => v.Id == votingId)
            ?? throw new KeyNotFoundException("Голосование не найдено");

        var isOwner = voting.Project.OwnerId == userId;
        var isMember = voting.Project.Members.Any(m => m.UserId == userId);

        if (!isOwner && !isMember)
            throw new UnauthorizedAccessException("Вы не участник этого проекта");

        if (voting.IsClosed)
            throw new InvalidOperationException("Голосование закрыто");

        if (voting.EndsAt.HasValue && voting.EndsAt.Value <= DateTime.UtcNow)
            throw new InvalidOperationException("Время голосования истекло");

        if (dto.OptionIds == null || dto.OptionIds.Count == 0)
            throw new InvalidOperationException("Выберите хотя бы один вариант");

        if (!voting.IsMultipleChoice && dto.OptionIds.Count > 1)
            throw new InvalidOperationException("Можно выбрать только один вариант");

        var validOptionIds = voting.Options.Select(o => o.Id).ToHashSet();
        if (dto.OptionIds.Any(id => !validOptionIds.Contains(id)))
            throw new InvalidOperationException("Некорректный вариант");

        var existingVotes = await _dbContext.VotingVotes
            .Where(v => v.VotingId == votingId && v.UserId == userId)
            .ToListAsync();

        if (existingVotes.Any() && !voting.AllowRevote)
            throw new InvalidOperationException("Переголосовать нельзя");

        if (existingVotes.Any())
            _dbContext.VotingVotes.RemoveRange(existingVotes);

        var newVotes = dto.OptionIds.Distinct().Select(optionId => new VotingVote
        {
            Id = Guid.NewGuid(),
            VotingId = votingId,
            VotingOptionId = optionId,
            UserId = userId,
            VotedAt = DateTime.UtcNow
        }).ToList();

        _dbContext.VotingVotes.AddRange(newVotes);

        await _activity.LogAsync(
            voting.ProjectId,
            userId,
            ActivityType.VotingVoted,
            summary: $"Проголосовал(а) в «{voting.Title}»",
            link: $"/projects/{voting.Project.PublicCode}/votings/{voting.Id}",
            relatedEntityId: voting.Id
        );

        await _dbContext.SaveChangesAsync();

        await _notificationService.DeleteVotingNotificationAsync(userId, votingId);

        _logger.LogInformation($"Пользователь {userId} проголосовал в {votingId}");

        return await BuildVotingDtoAsync(votingId, userId);
    }

    // 📌 Закрыть голосование
    public async Task<VotingDto> CloseVotingAsync(Guid votingId, Guid userId)
    {
        var voting = await _dbContext.Votings
            .Include(v => v.Project).ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(v => v.Id == votingId)
            ?? throw new KeyNotFoundException("Голосование не найдено");

        var isAuthor = voting.CreatedById == userId;
        var isProjectOwner = voting.Project.OwnerId == userId;
        var isProjectAdmin = voting.Project.Members
            .Any(m => m.UserId == userId && m.Role == ProjectMemberRole.Admin);

        var canClose = isAuthor || isProjectOwner || isProjectAdmin;

        if (!canClose)
            throw new UnauthorizedAccessException(
                "Только автор голосования, владелец или админ проекта может закрыть его");

        voting.IsClosed = true;

        await _activity.LogAsync(
            voting.ProjectId,
            userId,
            ActivityType.VotingClosed,
            summary: $"Закрыто голосование: {voting.Title}",
            link: $"/projects/{voting.Project.PublicCode}/votings/{voting.Id}",
            relatedEntityId: voting.Id
        );

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Голосование {votingId} закрыто пользователем {userId}");

        return await BuildVotingDtoAsync(votingId, userId);
    }

    // 📌 Удалить голосование
    public async Task DeleteVotingAsync(Guid votingId, Guid userId)
    {
        var voting = await _dbContext.Votings
            .Include(v => v.Project).ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(v => v.Id == votingId)
            ?? throw new KeyNotFoundException("Голосование не найдено");

        var isAuthor = voting.CreatedById == userId;
        var isProjectOwner = voting.Project.OwnerId == userId;
        var isProjectAdmin = voting.Project.Members
            .Any(m => m.UserId == userId && m.Role == ProjectMemberRole.Admin);

        var canDelete = isAuthor || isProjectOwner || isProjectAdmin;

        if (!canDelete)
            throw new UnauthorizedAccessException(
                "Только автор голосования, владелец или админ проекта может удалить его");

        _dbContext.Votings.Remove(voting);
        await _dbContext.SaveChangesAsync();

        await _notificationService.DeleteNotificationsByRelatedIdAsync(votingId);

        _logger.LogInformation(
            $"Голосование {votingId} удалено пользователем {userId}");
    }

    // 📌 Краткая сводка
    public async Task<List<VotingSummaryDto>> GetVotingsSummaryAsync(
        string projectCode, Guid userId)
    {
        var project = await _dbContext.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.PublicCode == projectCode)
            ?? throw new KeyNotFoundException("Проект не найден");

        var votingIds = await _dbContext.Votings
            .Where(v => v.ProjectId == project.Id)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => v.Id)
            .ToListAsync();

        var result = new List<VotingSummaryDto>();

        foreach (var id in votingIds)
        {
            var voting = await _dbContext.Votings
                .Include(v => v.Votes)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (voting == null) continue;

            var hasVoted = voting.Votes.Any(v => v.UserId == userId);
            var isExpired = voting.EndsAt.HasValue && voting.EndsAt.Value <= DateTime.UtcNow;

            result.Add(new VotingSummaryDto
            {
                Id = voting.Id,
                Title = voting.Title,
                CreatedAt = voting.CreatedAt,
                IsClosed = voting.IsClosed,
                IsExpired = isExpired,
                HasVoted = hasVoted
            });
        }

        return result;
    }

    private async Task<VotingDto> BuildVotingDtoAsync(Guid votingId, Guid userId)
    {
        var voting = await _dbContext.Votings
            .Include(v => v.Project).ThenInclude(p => p.Members)
            .Include(v => v.CreatedBy)
            .Include(v => v.Options).ThenInclude(o => o.Votes).ThenInclude(vote => vote.User)
            .Include(v => v.Votes)
            .FirstOrDefaultAsync(v => v.Id == votingId)
            ?? throw new KeyNotFoundException("Голосование не найдено");

        var isOwner = voting.Project.OwnerId == userId;
        var isMember = voting.Project.Members.Any(m => m.UserId == userId);

        if (!isOwner && !isMember)
            throw new UnauthorizedAccessException("Вы не участник этого проекта");

        var isExpired = voting.EndsAt.HasValue && voting.EndsAt.Value <= DateTime.UtcNow;
        var isActive = !voting.IsClosed && !isExpired;

        var userVotes = voting.Votes
            .Where(v => v.UserId == userId)
            .Select(v => v.VotingOptionId)
            .ToHashSet();

        var hasVoted = userVotes.Any();

        var totalVoters = voting.Votes
            .Select(v => v.UserId)
            .Distinct()
            .Count();

        var canSeeVoters = !voting.IsAnonymous && (
            hasVoted || !isActive || voting.ShowResultsBeforeVote
        );

        var options = voting.Options
            .OrderBy(o => o.Order)
            .Select(o => new VotingOptionDto
            {
                Id = o.Id,
                Text = o.Text,
                Order = o.Order,
                VotesCount = o.Votes.Count,
                IsSelectedByCurrentUser = userVotes.Contains(o.Id),
                Voters = canSeeVoters
                    ? o.Votes
                        .OrderBy(v => v.VotedAt)
                        .Select(v => new VotingVoterDto
                        {
                            UserId = v.UserId,
                            Name = v.User?.Name ?? "Пользователь",
                            Email = v.User?.Email ?? string.Empty,
                            Specialization = v.User?.Specialization.ToString(),
                            VotedAt = v.VotedAt
                        })
                        .ToList()
                    : new List<VotingVoterDto>()
            })
            .ToList();

        foreach (var option in options)
        {
            option.Percent = totalVoters > 0
                ? Math.Round((double)option.VotesCount / totalVoters * 100, 1)
                : 0;
        }

        var participantIds = new HashSet<Guid>(voting.Project.Members.Select(m => m.UserId))
        {
            voting.Project.OwnerId
        };

        return new VotingDto
        {
            Id = voting.Id,
            ProjectId = voting.ProjectId,
            ProjectCode = voting.Project.PublicCode,
            CreatedById = voting.CreatedById,
            CreatedByName = voting.CreatedBy?.Name ?? string.Empty,
            Title = voting.Title,
            IsMultipleChoice = voting.IsMultipleChoice,
            AllowRevote = voting.AllowRevote,
            ShowResultsBeforeVote = voting.ShowResultsBeforeVote,
            IsAnonymous = voting.IsAnonymous,
            IsClosed = voting.IsClosed,
            IsExpired = isExpired,
            CreatedAt = voting.CreatedAt,
            EndsAt = voting.EndsAt,
            Options = options,
            HasVoted = hasVoted,
            SelectedOptionIds = userVotes.ToList(),
            TotalVoters = totalVoters,
            TotalProjectMembers = participantIds.Count
        };
    }
}