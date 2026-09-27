// Services/InvitationService.cs

using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.InvitationDtos;
using ProjectHub.API.Hubs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;
using System.Collections.Concurrent;

namespace ProjectHub.API.Services;

public class InvitationService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<InvitationService> _logger;
    private readonly NotificationService _notificationService;
    private readonly ActivityService _activity;
    private readonly IHubContext<ChatHub> _hubContext;

    // 🆕 In-memory блокировка по ключу (projectId, inviteeId).
    // Защищает от race condition, когда два админа жмут «Пригласить» одновременно.
    // Дополнительно к уникальному индексу в БД.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _inviteLocks = new();

    public InvitationService(
        AppDbContext dbContext,
        ILogger<InvitationService> logger,
        NotificationService notificationService,
        ActivityService activity,
        IHubContext<ChatHub> hubContext)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
        _activity = activity;
        _hubContext = hubContext;
    }

    public async Task<Project?> GetProjectByCodeAsync(string code)
    {
        return await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == code);
    }

    public async Task<InvitationStatusDto> GetInvitationStatusAsync(
        Guid userId, string projectCode)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == projectCode);

        if (project == null)
            return new InvitationStatusDto { Status = "None" };

        var invitation = await _dbContext.Invitations
            .FirstOrDefaultAsync(i => i.ProjectId == project.Id
                                      && i.InviteeId == userId
                                      && i.Status == InvitationStatus.Pending);

        if (invitation != null)
        {
            return new InvitationStatusDto
            {
                Status = "Pending",
                InvitationId = invitation.Id
            };
        }

        return new InvitationStatusDto { Status = "None" };
    }

    // 📌 Создать приглашение
    public async Task<InvitationResponseDto> CreateInvitationAsync(
        Guid projectId, Guid inviterId, string inviteeEmail, string? message = null)
    {
        _logger.LogInformation(
            $"Пользователь {inviterId} приглашает {inviteeEmail} в проект {projectId}");

        // ── 1. Ранняя валидация: находим invitee, чтобы знать inviteeId для lock-ключа ──
        var invitee = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == inviteeEmail)
            ?? throw new KeyNotFoundException("Пользователь с таким email не найден");

        if (invitee.Id == inviterId)
            throw new InvalidOperationException("Нельзя пригласить себя");

        // ── 2. Атомарная проверка «проект + права + членство + существующее приглашение» ──
        //    под per-(project, invitee) семафором.
        var lockKey = $"{projectId}:{invitee.Id}";
        var semaphore = _inviteLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));

        await semaphore.WaitAsync();
        try
        {
            return await CreateInvitationCoreAsync(
                projectId, inviterId, invitee, message);
        }
        finally
        {
            semaphore.Release();

            // Чистим словарь от «мертвых» семафоров, чтобы не течь
            // (если очередь на ключ пуста — удаляем).
            if (semaphore.CurrentCount == 1)
            {
                _inviteLocks.TryRemove(lockKey, out _);
            }
        }
    }

    // Ядро создания — выполняется под семафором.
    private async Task<InvitationResponseDto> CreateInvitationCoreAsync(
        Guid projectId, Guid inviterId, User invitee, string? message)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Проект не найден");

        EnsureProjectNotArchived(project);

        // ── Проверка прав: owner или admin ──
        var isOwner = project.OwnerId == inviterId;
        var isAdmin = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId
                            && pm.UserId == inviterId
                            && pm.Role == ProjectMemberRole.Admin);

        if (!isOwner && !isAdmin)
            throw new UnauthorizedAccessException(
                "У вас нет прав для приглашения участников");

        // ── Invitee уже участник? ──
        var isMember = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == invitee.Id);

        if (isMember)
            throw new InvalidOperationException("Пользователь уже является участником проекта");

        // ── Есть pending-приглашение? ──
        var existingInvitation = await _dbContext.Invitations
            .FirstOrDefaultAsync(i => i.ProjectId == projectId
                                      && i.InviteeId == invitee.Id);

        if (existingInvitation != null)
            throw new InvalidOperationException("Приглашение уже отправлено");

        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            InviterId = inviterId,
            InviteeId = invitee.Id,
            Status = InvitationStatus.Pending,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Invitations.Add(invitation);

        // 🆕 Activity для истории проекта
        var activity = await _activity.LogAsync(
            project.Id,
            inviterId,
            ActivityType.InvitationSent,
            summary: $"Приглашение отправлено: {invitee.Name}",
            link: $"/projects/{project.PublicCode}/dashboard",
            relatedEntityId: invitee.Id
        );

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Race condition: пока мы тут думали, кто-то уже вставил приглашение.
            // Уникальный индекс (ProjectId, InviteeId) сработал.
            _logger.LogWarning(
                "Попытка создать дублирующее приглашение: project={ProjectId}, invitee={InviteeId}",
                projectId, invitee.Id);

            // Откатываем трекинг, чтобы context не тянул за собой мусор
            _dbContext.Entry(invitation).State = EntityState.Detached;
            if (activity != null)
                _dbContext.Entry(activity).State = EntityState.Detached;

            throw new InvalidOperationException("Приглашение уже отправлено");
        }

        // 🆕 ── SignalR: ActivityAdded в project:{code} ──
        await _activity.EmitActivityAsync(activity, project.PublicCode);

        _logger.LogInformation($"Приглашение {invitation.Id} создано");

        // ── Notification для получателя ──
        var inviter = await _dbContext.Users.FindAsync(inviterId);
        await _notificationService.CreateNotificationAsync(
            invitee.Id,
            "📩 Приглашение в проект",
            $"Пользователь {inviter?.Name} приглашает вас присоединиться к проекту '{project.Name}'",
            NotificationType.ProjectInvitation,
            "/invitations",
            invitation.Id
        );

        invitation.Project = project;
        invitation.Inviter = inviter!;
        invitation.Invitee = invitee;

        var dto = MapToResponse(invitation);

        // 🆕 ── SignalR: InvitationCreated в user:{inviteeId} ──
        // Прилетит на страницу /invitations у получателя.
        await EmitToUserAsync(invitee.Id, "InvitationCreated", dto);

        return dto;
    }

    // 📌 Принять или отклонить приглашение
    public async Task<InvitationResponseDto> ProcessInvitationAsync(
        Guid invitationId, Guid userId, bool accept)
    {
        var invitation = await _dbContext.Invitations
            .Include(i => i.Project)
            .Include(i => i.Inviter)
            .Include(i => i.Invitee)
            .FirstOrDefaultAsync(i => i.Id == invitationId && i.InviteeId == userId)
            ?? throw new KeyNotFoundException("Приглашение не найдено");

        if (invitation.Status != InvitationStatus.Pending)
            throw new InvalidOperationException("Приглашение уже обработано");

        var projectId = invitation.ProjectId;
        var projectName = invitation.Project?.Name ?? "проект";
        var projectCode = invitation.Project?.PublicCode ?? "";
        var inviterId = invitation.InviterId;
        var inviterName = invitation.Inviter?.Name ?? "Пользователь";
        var inviterEmail = invitation.Inviter?.Email ?? "";
        var inviterAvatarUrl = invitation.Inviter?.AvatarUrl;
        var inviteeId = invitation.InviteeId;
        var inviteeName = invitation.Invitee?.Name ?? "Пользователь";
        var inviteeEmail = invitation.Invitee?.Email ?? "";
        var inviteeAvatarUrl = invitation.Invitee?.AvatarUrl;
        var message = invitation.Message;
        var createdAt = invitation.CreatedAt;

        ProjectActivity? activity = null;
        var processedStatus = accept ? "Accepted" : "Rejected";

        if (accept)
        {
            if (invitation.Project?.IsArchived == true)
                throw new InvalidOperationException(
                    "Проект находится в архиве, присоединиться нельзя");

            // Защита от race condition: если pending уже нет — кто-то другой
            // параллельно обработал (или удалил).
            var alreadyMember = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == inviteeId);

            if (alreadyMember)
                throw new InvalidOperationException(
                    "Вы уже являетесь участником проекта");

            var member = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                UserId = inviteeId,
                Role = ProjectMemberRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            _dbContext.ProjectMembers.Add(member);

            activity = await _activity.LogAsync(
                projectId,
                inviteeId,
                ActivityType.InvitationAccepted,
                summary: $"{inviteeName} принял(а) приглашение",
                link: $"/projects/{projectCode}/dashboard",
                relatedEntityId: inviteeId
            );

            // 📌 Уведомления ДО удаления приглашения
            // (после удаления RelatedId=invitationId уже не будет существовать)
            await _notificationService.CreateNotificationAsync(
                inviterId,
                "✅ Приглашение принято",
                $"{inviteeName} принял ваше приглашение в проект '{projectName}'",
                NotificationType.InvitationAccepted,
                $"/projects/{projectCode}/dashboard",
                projectId
            );

            var projectMembers = await _dbContext.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Include(pm => pm.User)
                .ToListAsync();

            foreach (var pm in projectMembers)
            {
                if (pm.UserId == inviteeId || pm.UserId == inviterId)
                    continue;

                await _notificationService.CreateNotificationAsync(
                    pm.UserId,
                    "👋 Новый участник в проекте",
                    $"{inviteeName} присоединился к проекту '{projectName}' по приглашению {inviterName}",
                    NotificationType.NewMember,
                    $"/projects/{projectCode}/dashboard",
                    projectId
                );
            }

            // Удаляем уведомление получателя о самом приглашении
            await _notificationService.DeleteNotificationsByRelatedIdAsync(invitationId);

            _dbContext.Invitations.Remove(invitation);

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"Пользователь {inviteeId} принял приглашение, добавлен в проект {projectId}");
        }
        else
        {
            await _notificationService.CreateNotificationAsync(
                inviterId,
                "❌ Приглашение отклонено",
                $"{inviteeName} отклонил ваше приглашение в проект '{projectName}'",
                NotificationType.InvitationRejected,
                $"/projects/{projectCode}/dashboard",
                projectId
            );

            activity = await _activity.LogAsync(
                projectId,
                inviteeId,
                ActivityType.InvitationDeclined,
                summary: $"{inviteeName} отклонил(а) приглашение",
                link: $"/projects/{projectCode}/dashboard",
                relatedEntityId: inviteeId
            );

            await _notificationService.DeleteNotificationsByRelatedIdAsync(invitationId);

            _dbContext.Invitations.Remove(invitation);

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Приглашение {invitationId} отклонено");
        }

        // 🆕 ── SignalR: ActivityAdded в project ──
        await _activity.EmitActivityAsync(activity, projectCode);

        var response = new InvitationResponseDto
        {
            Id = invitationId,
            ProjectId = projectId,
            ProjectName = projectName,
            ProjectCode = projectCode,
            InviterId = inviterId,
            InviterName = inviterName,
            InviterEmail = inviterEmail,
            InviterAvatarUrl = inviterAvatarUrl,
            InviteeId = inviteeId,
            InviteeName = inviteeName,
            InviteeEmail = inviteeEmail,
            InviteeAvatarUrl = inviteeAvatarUrl,
            Status = processedStatus,
            Message = message,
            CreatedAt = createdAt,
            ProcessedAt = DateTime.UtcNow
        };

        // 🆕 ── SignalR: InvitationProcessed ──
        // Отправляем обоим: и пригласившему (пусть видит, что приглашение
        // обработано), и приглашённому (чтобы UI на /invitations
        // убрал карточку, если она всё ещё открыта в другой вкладке).
        await EmitToUserAsync(inviterId, "InvitationProcessed", new
        {
            InvitationId = invitationId,
            Status = processedStatus,
            ProjectId = projectId,
            ProjectCode = projectCode,
        });

        await EmitToUserAsync(inviteeId, "InvitationProcessed", new
        {
            InvitationId = invitationId,
            Status = processedStatus,
            ProjectId = projectId,
            ProjectCode = projectCode,
        });

        return response;
    }

    public async Task<List<InvitationResponseDto>> GetUserInvitationsAsync(Guid userId)
    {
        var invitations = await _dbContext.Invitations
            .Include(i => i.Project)
            .Include(i => i.Inviter)
            .Include(i => i.Invitee)
            .Where(i => i.InviteeId == userId && i.Status == InvitationStatus.Pending)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invitations.Select(MapToResponse).ToList();
    }

    // ═══════════════════════════════════════════════════════════
    //  ВСПОМОГАТЕЛЬНЫЕ
    // ═══════════════════════════════════════════════════════════

    private static void EnsureProjectNotArchived(Project project)
    {
        if (project.IsArchived)
            throw new InvalidOperationException(
                "Проект находится в архиве, действие недоступно");
    }

    /// <summary>
    /// Проверяет, что DbUpdateException вызван нарушением unique constraint.
    /// Покрывает Postgres (23505), SQL Server (2601/2627), SQLite (2067).
    /// </summary>
    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        return msg.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("unique", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("23505")   // PostgreSQL
            || msg.Contains("2601")    // SQL Server
            || msg.Contains("2627")    // SQL Server
            || msg.Contains("2067");   // SQLite
    }

    /// <summary>
    /// Отправляет событие в группу user:{userId}.
    /// Обёрнуто в try/catch — SignalR не должен ломать основной поток.
    /// </summary>
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

    private InvitationResponseDto MapToResponse(Invitation invitation)
    {
        return new InvitationResponseDto
        {
            Id = invitation.Id,
            ProjectId = invitation.ProjectId,
            ProjectName = invitation.Project?.Name ?? string.Empty,
            ProjectCode = invitation.Project?.PublicCode ?? string.Empty,
            InviterId = invitation.InviterId,
            InviterName = invitation.Inviter?.Name ?? string.Empty,
            InviterEmail = invitation.Inviter?.Email ?? string.Empty,
            InviterAvatarUrl = invitation.Inviter?.AvatarUrl,
            InviteeId = invitation.InviteeId,
            InviteeName = invitation.Invitee?.Name ?? string.Empty,
            InviteeEmail = invitation.Invitee?.Email ?? string.Empty,
            InviteeAvatarUrl = invitation.Invitee?.AvatarUrl,
            Status = invitation.Status.ToString(),
            Message = invitation.Message,
            CreatedAt = invitation.CreatedAt,
            ProcessedAt = invitation.ProcessedAt
        };
    }
}