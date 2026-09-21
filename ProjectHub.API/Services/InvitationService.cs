// Services/InvitationService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.InvitationDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class InvitationService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<InvitationService> _logger;
    private readonly NotificationService _notificationService;
    private readonly ActivityService _activity;

    public InvitationService(
        AppDbContext dbContext,
        ILogger<InvitationService> logger,
        NotificationService notificationService,
        ActivityService activity)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
        _activity = activity;
    }

    // 📌 Получить проект по публичному коду
    public async Task<Project?> GetProjectByCodeAsync(string code)
    {
        return await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == code);
    }

    // 📌 Получить статус приглашения
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

    // 📌 Создать приглашение (только Owner/Admin)
    public async Task<InvitationResponseDto> CreateInvitationAsync(
        Guid projectId, Guid inviterId, string inviteeEmail, string? message = null)
    {
        _logger.LogInformation(
            $"Пользователь {inviterId} приглашает {inviteeEmail} в проект {projectId}");

        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Проект не найден");

        // 📌 Архив — блокируем приглашения
        EnsureProjectNotArchived(project);

        var isOwner = project.OwnerId == inviterId;
        var isAdmin = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId
                            && pm.UserId == inviterId
                            && pm.Role == ProjectMemberRole.Admin);

        if (!isOwner && !isAdmin)
            throw new UnauthorizedAccessException(
                "У вас нет прав для приглашения участников");

        var invitee = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == inviteeEmail)
            ?? throw new KeyNotFoundException("Пользователь с таким email не найден");

        if (invitee.Id == inviterId)
            throw new InvalidOperationException("Нельзя пригласить себя");

        var isMember = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == invitee.Id);

        if (isMember)
            throw new InvalidOperationException("Пользователь уже является участником проекта");

        var existingInvitation = await _dbContext.Invitations
            .FirstOrDefaultAsync(i => i.ProjectId == projectId
                                      && i.InviteeId == invitee.Id
                                      && i.Status == InvitationStatus.Pending);

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

        await _activity.LogAsync(
            project.Id,
            inviterId,
            ActivityType.InvitationSent,
            summary: $"Приглашение отправлено: {invitee.Name}",
            link: $"/projects/{project.PublicCode}/dashboard",
            relatedEntityId: invitee.Id
        );

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Приглашение {invitation.Id} создано");

        // 📨 Уведомление приглашённому
        var inviter = await _dbContext.Users.FindAsync(inviterId);
        await _notificationService.CreateNotificationAsync(
            invitee.Id,
            "📩 Приглашение в проект",
            $"Пользователь {inviter?.Name} приглашает вас присоединиться к проекту '{project.Name}'",
            NotificationType.ProjectInvitation,
            "/invitations",
            invitation.Id
        );

        // 📌 Подгружаем навигации, чтобы MapToResponse заполнил AvatarUrl
        invitation.Project = project;
        invitation.Inviter = inviter;
        invitation.Invitee = invitee;

        return MapToResponse(invitation);
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

        // Сохраняем данные для уведомлений и ответа (до удаления)
        var projectId = invitation.ProjectId;
        var projectName = invitation.Project?.Name ?? "проект";
        var projectCode = invitation.Project?.PublicCode ?? "";
        var inviterId = invitation.InviterId;
        var inviterName = invitation.Inviter?.Name ?? "Пользователь";
        var inviterEmail = invitation.Inviter?.Email ?? "";
        var inviterAvatarUrl = invitation.Inviter?.AvatarUrl;     // 🆕
        var inviteeId = invitation.InviteeId;
        var inviteeName = invitation.Invitee?.Name ?? "Пользователь";
        var inviteeEmail = invitation.Invitee?.Email ?? "";
        var inviteeAvatarUrl = invitation.Invitee?.AvatarUrl;     // 🆕
        var message = invitation.Message;
        var createdAt = invitation.CreatedAt;

        if (accept)
        {
            // 📌 Принятие приглашения в архивный проект блокируем
            if (invitation.Project?.IsArchived == true)
                throw new InvalidOperationException(
                    "Проект находится в архиве, присоединиться нельзя");

            // ✅ Принимаем
            var member = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                UserId = inviteeId,
                Role = ProjectMemberRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            _dbContext.ProjectMembers.Add(member);

            await _activity.LogAsync(
                projectId,
                inviteeId,
                ActivityType.InvitationAccepted,
                summary: $"{inviteeName} принял(а) приглашение",
                link: $"/projects/{projectCode}/dashboard",
                relatedEntityId: inviteeId
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"Пользователь {inviteeId} принял приглашение и добавлен в проект");

            // 📨 Пригласившему
            await _notificationService.CreateNotificationAsync(
                inviterId,
                "✅ Приглашение принято",
                $"{inviteeName} принял ваше приглашение в проект '{projectName}'",
                NotificationType.InvitationAccepted,
                $"/projects/{projectCode}/dashboard",
                projectId
            );

            // 📨 Всем участникам проекта
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

            _logger.LogInformation("📨 Уведомления о новом участнике отправлены");
        }
        else
        {
            // ❌ Отклоняем
            await _notificationService.CreateNotificationAsync(
                inviterId,
                "❌ Приглашение отклонено",
                $"{inviteeName} отклонил ваше приглашение в проект '{projectName}'",
                NotificationType.InvitationRejected,
                $"/projects/{projectCode}/dashboard",
                projectId
            );

            await _activity.LogAsync(
                projectId,
                inviteeId,
                ActivityType.InvitationDeclined,
                summary: $"{inviteeName} отклонил(а) приглашение",
                link: $"/projects/{projectCode}/dashboard",
                relatedEntityId: inviteeId
            );

            _logger.LogInformation($"Приглашение {invitationId} отклонено");
        }

        // Удаляем уведомления по приглашению
        await _notificationService.DeleteNotificationsByRelatedIdAsync(invitationId);

        // Удаляем само приглашение
        _dbContext.Invitations.Remove(invitation);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"🗑️ Приглашение {invitationId} обработано и удалено");

        return new InvitationResponseDto
        {
            Id = invitationId,
            ProjectId = projectId,
            ProjectName = projectName,
            ProjectCode = projectCode,
            InviterId = inviterId,
            InviterName = inviterName,
            InviterEmail = inviterEmail,
            InviterAvatarUrl = inviterAvatarUrl,       // 🆕
            InviteeId = inviteeId,
            InviteeName = inviteeName,
            InviteeEmail = inviteeEmail,
            InviteeAvatarUrl = inviteeAvatarUrl,       // 🆕
            Status = accept ? "Accepted" : "Rejected",
            Message = message,
            CreatedAt = createdAt,
            ProcessedAt = DateTime.UtcNow
        };
    }

    // 📌 Получить все приглашения для пользователя
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
            InviterAvatarUrl = invitation.Inviter?.AvatarUrl,      // 🆕
            InviteeId = invitation.InviteeId,
            InviteeName = invitation.Invitee?.Name ?? string.Empty,
            InviteeEmail = invitation.Invitee?.Email ?? string.Empty,
            InviteeAvatarUrl = invitation.Invitee?.AvatarUrl,      // 🆕
            Status = invitation.Status.ToString(),
            Message = invitation.Message,
            CreatedAt = invitation.CreatedAt,
            ProcessedAt = invitation.ProcessedAt
        };
    }
}