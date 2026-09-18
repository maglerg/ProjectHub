// Services/ApplicationService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.ApplicationDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class ApplicationService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ApplicationService> _logger;
    private readonly NotificationService _notificationService;
    private readonly ActivityService _activity;

    public ApplicationService(
        AppDbContext dbContext,
        ILogger<ApplicationService> logger,
        NotificationService notificationService,
        ActivityService activity)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
        _activity = activity;
    }

    public async Task<Project?> GetProjectByCodeAsync(string code)
    {
        return await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == code);
    }

    // 📌 Подать заявку на вступление
    public async Task<ApplicationResponseDto> CreateApplicationAsync(
        Guid projectId, Guid userId, CreateApplicationDto dto)
    {
        _logger.LogInformation($"🔵 Пользователь {userId} подает заявку на проект {projectId}");

        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Проект не найден");

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Пользователь не найден");

        if (project.OwnerId == userId)
            throw new InvalidOperationException("Вы являетесь владельцем проекта");

        var existingMember = await _dbContext.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (existingMember != null)
            throw new InvalidOperationException("Вы уже являетесь участником проекта");

        var existingApplication = await _dbContext.Applications
            .FirstOrDefaultAsync(a => a.ProjectId == projectId
                                      && a.UserId == userId
                                      && a.Status == ApplicationStatus.Pending);

        if (existingApplication != null)
            throw new InvalidOperationException("Вы уже подали заявку на этот проект");

        var application = new Application
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UserId = userId,
            Status = ApplicationStatus.Pending,
            Message = dto?.Message,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Applications.Add(application);

        await _activity.LogAsync(
            project.Id,
            userId,
            ActivityType.ApplicationSubmitted,
            summary: $"{user.Name} подал(а) заявку на вступление",
            link: $"/projects/{project.PublicCode}/applications",
            relatedEntityId: application.Id
        );

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"✅ Заявка {application.Id} создана");

        // 📌 Уведомления владельцу и админам
        try
        {
            await _notificationService.CreateNotificationAsync(
                project.OwnerId,
                "📨 Новая заявка на вступление",
                $"Пользователь {user.Name} хочет присоединиться к проекту '{project.Name}'",
                NotificationType.ApplicationReceived,
                $"/projects/{project.PublicCode}/applications",
                application.Id
            );

            var admins = await _dbContext.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && pm.Role == ProjectMemberRole.Admin)
                .ToListAsync();

            foreach (var admin in admins)
            {
                if (admin.UserId == project.OwnerId) continue;

                await _notificationService.CreateNotificationAsync(
                    admin.UserId,
                    "📨 Новая заявка на вступление",
                    $"Пользователь {user.Name} хочет присоединиться к проекту '{project.Name}'",
                    NotificationType.ApplicationReceived,
                    $"/projects/{project.PublicCode}/applications",
                    application.Id
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"❌ Ошибка при отправке уведомлений: {ex.Message}");
        }

        return MapToResponse(application);
    }

    // 📌 Принять или отклонить заявку
    public async Task<ApplicationResponseDto> ProcessApplicationAsync(
        Guid applicationId, Guid processedBy, bool approve, string? message = null)
    {
        _logger.LogInformation($"Обработка заявки {applicationId} пользователем {processedBy}. Одобрить: {approve}");

        var application = await _dbContext.Applications
            .Include(a => a.Project).ThenInclude(p => p.Members)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == applicationId)
            ?? throw new KeyNotFoundException("Заявка не найдена");

        if (application.Status != ApplicationStatus.Pending)
            throw new InvalidOperationException($"Заявка уже обработана. Статус: {application.Status}");

        // Проверяем права
        var isOwner = application.Project.OwnerId == processedBy;
        var isAdmin = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == application.ProjectId
                            && pm.UserId == processedBy
                            && pm.Role == ProjectMemberRole.Admin);

        if (!isOwner && !isAdmin)
            throw new UnauthorizedAccessException(
                "У вас нет прав для обработки заявок в этом проекте");

        if (approve)
        {
            application.Status = ApplicationStatus.Approved;
            application.ProcessedAt = DateTime.UtcNow;
            application.ProcessedBy = processedBy;
            application.UpdatedAt = DateTime.UtcNow;

            var member = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = application.ProjectId,
                UserId = application.UserId,
                Role = ProjectMemberRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            _dbContext.ProjectMembers.Add(member);

            await _activity.LogAsync(
                application.ProjectId,
                processedBy,
                ActivityType.ApplicationApproved,
                summary: $"Одобрена заявка: {application.User?.Name ?? "пользователь"}",
                link: $"/projects/{application.Project.PublicCode}/applications",
                relatedEntityId: application.Id
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"✅ Пользователь {application.UserId} добавлен в участники проекта {application.ProjectId}");

            // Уведомление новому участнику
            await _notificationService.CreateNotificationAsync(
                application.UserId,
                "✅ Ваша заявка одобрена!",
                $"Вы стали участником проекта '{application.Project.Name}'",
                NotificationType.ApplicationApproved,
                $"/projects/{application.Project.PublicCode}/dashboard",
                application.ProjectId
            );

            // Уведомление всем участникам
            var projectMembers = await _dbContext.ProjectMembers
                .Where(pm => pm.ProjectId == application.ProjectId)
                .Include(pm => pm.User)
                .ToListAsync();

            var newMemberName = application.User?.Name ?? "Новый участник";

            foreach (var pm in projectMembers)
            {
                if (pm.UserId == application.UserId || pm.UserId == processedBy)
                    continue;

                await _notificationService.CreateNotificationAsync(
                    pm.UserId,
                    "👋 Новый участник в проекте",
                    $"{newMemberName} присоединился к проекту '{application.Project.Name}'",
                    NotificationType.NewMember,
                    $"/projects/{application.Project.PublicCode}/dashboard",
                    application.ProjectId
                );
            }

            _logger.LogInformation("📨 Уведомления о новом участнике отправлены");
        }
        else
        {
            // ❌ Отклоняем — удаляем заявку
            var projectName = application.Project?.Name ?? "проект";

            await _notificationService.CreateNotificationAsync(
                application.UserId,
                "❌ Ваша заявка отклонена",
                $"К сожалению, ваша заявка на вступление в проект '{projectName}' была отклонена",
                NotificationType.ApplicationRejected,
                $"/projects/{application.Project?.PublicCode}",
                application.ProjectId
            );

            await _notificationService.DeleteNotificationsByRelatedIdAsync(applicationId);

            await _activity.LogAsync(
                application.ProjectId,
                processedBy,
                ActivityType.ApplicationRejected,
                summary: $"Отклонена заявка: {application.User?.Name ?? "пользователь"}",
                link: $"/projects/{application.Project.PublicCode}/applications",
                relatedEntityId: applicationId
            );

            _dbContext.Applications.Remove(application);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"🗑️ Заявка {applicationId} отклонена и удалена из БД");
        }

        return MapToResponse(application);
    }

    // 📌 Заявки проекта
    public async Task<List<ApplicationResponseDto>> GetApplicationsForProjectAsync(
        Guid projectId, ApplicationStatus? status = null)
    {
        var query = _dbContext.Applications
            .Include(a => a.User)
            .Include(a => a.Project)
            .Where(a => a.ProjectId == projectId);

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        var applications = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return applications.Select(MapToResponse).ToList();
    }

    // 📌 Заявки пользователя
    public async Task<List<ApplicationResponseDto>> GetApplicationsForUserAsync(Guid userId)
    {
        var applications = await _dbContext.Applications
            .Include(a => a.Project)
            .Include(a => a.User)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return applications.Select(MapToResponse).ToList();
    }

    // 📌 Заявки проекта по коду
    public async Task<List<ApplicationResponseDto>> GetApplicationsByCodeAsync(
        string code, ApplicationStatus? status = null)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == code)
            ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

        var query = _dbContext.Applications
            .Include(a => a.User)
            .Include(a => a.Project)
            .Where(a => a.ProjectId == project.Id);

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        var applications = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return applications.Select(MapToResponse).ToList();
    }

    // 📌 Очистить уведомления по коду проекта
    public async Task CleanupNotificationsByCodeAsync(string code)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == code);

        if (project == null) return;

        await _notificationService.CleanupNotificationsForProjectAsync(project.Id);
    }

    // 📌 Проверки
    public async Task<bool> IsUserProjectOwner(Guid projectId, Guid userId)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId);

        return project != null && project.OwnerId == userId;
    }

    public async Task<bool> IsUserProjectAdmin(Guid projectId, Guid userId)
    {
        return await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId
                            && pm.UserId == userId
                            && pm.Role == ProjectMemberRole.Admin);
    }

    // 📌 Маппер
    private ApplicationResponseDto MapToResponse(Application application)
    {
        return new ApplicationResponseDto
        {
            Id = application.Id,
            ProjectId = application.ProjectId,
            ProjectName = application.Project?.Name ?? string.Empty,
            ProjectCode = application.Project?.PublicCode ?? string.Empty,
            UserId = application.UserId,
            UserName = application.User?.Name ?? string.Empty,
            UserEmail = application.User?.Email ?? string.Empty,
            UserSpecialization = application.User?.Specialization.ToString(),
            Status = application.Status.ToString(),
            Message = application.Message,
            CreatedAt = application.CreatedAt,
            ProcessedAt = application.ProcessedAt
        };
    }
}