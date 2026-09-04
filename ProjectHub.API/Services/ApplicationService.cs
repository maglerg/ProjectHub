// Services/ApplicationService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.Services;

public class ApplicationService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ApplicationService> _logger;

    public ApplicationService(AppDbContext dbContext, ILogger<ApplicationService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }
    public async Task<Project?> GetProjectByCodeAsync(string code)
    {
        return await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.PublicCode == code);
    }
    // 📌 Подать заявку на вступление
    public async Task<ApplicationResponseDto> CreateApplicationAsync(Guid projectId, Guid userId, CreateApplicationDto dto)
    {
        _logger.LogInformation($"Пользователь {userId} подает заявку на проект {projectId}");

        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null)
        {
            throw new KeyNotFoundException("Проект не найден");
        }

        if (project.OwnerId == userId)
        {
            throw new InvalidOperationException("Вы являетесь владельцем проекта");
        }

        var existingMember = await _dbContext.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

        if (existingMember != null)
        {
            throw new InvalidOperationException("Вы уже являетесь участником проекта");
        }

        var existingApplication = await _dbContext.Applications
            .FirstOrDefaultAsync(a => a.ProjectId == projectId && a.UserId == userId && a.Status == ApplicationStatus.Pending);

        if (existingApplication != null)
        {
            throw new InvalidOperationException("Вы уже подали заявку на этот проект");
        }

        var application = new Application
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UserId = userId,
            Status = ApplicationStatus.Pending,
            Message = dto?.Message,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Applications.AddAsync(application);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Заявка {application.Id} создана");

        return MapToResponse(application);
    }

    // 📌 Получить все заявки для проекта
    public async Task<List<ApplicationResponseDto>> GetApplicationsForProjectAsync(Guid projectId, ApplicationStatus? status = null)
    {
        var query = _dbContext.Applications
            .Include(a => a.User)
            .Include(a => a.Project)
            .Where(a => a.ProjectId == projectId);

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        var applications = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return applications.Select(MapToResponse).ToList();
    }

    // 📌 Получить заявки пользователя
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

    // 📌 Принять или отклонить заявку
    public async Task<ApplicationResponseDto> ProcessApplicationAsync(Guid applicationId, Guid processedBy, bool approve, string? message = null)
    {
        _logger.LogInformation($"Обработка заявки {applicationId} пользователем {processedBy}. Одобрить: {approve}");

        var application = await _dbContext.Applications
            .Include(a => a.Project)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (application == null)
        {
            throw new KeyNotFoundException("Заявка не найдена");
        }

        if (application.Status != ApplicationStatus.Pending)
        {
            throw new InvalidOperationException($"Заявка уже обработана. Статус: {application.Status}");
        }

        var isOwner = application.Project.OwnerId == processedBy;
        var isAdmin = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == application.ProjectId &&
                           pm.UserId == processedBy &&
                           pm.Role == ProjectMemberRole.Admin);

        if (!isOwner && !isAdmin)
        {
            throw new UnauthorizedAccessException("У вас нет прав для обработки заявок в этом проекте");
        }

        application.Status = approve ? ApplicationStatus.Approved : ApplicationStatus.Rejected;
        application.ProcessedAt = DateTime.UtcNow;
        application.ProcessedBy = processedBy;
        application.UpdatedAt = DateTime.UtcNow;

        if (approve)
        {
            var member = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = application.ProjectId,
                UserId = application.UserId,
                Role = ProjectMemberRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            await _dbContext.ProjectMembers.AddAsync(member);
            _logger.LogInformation($"Пользователь {application.UserId} добавлен в участники проекта {application.ProjectId}");
        }
        else
        {
            _logger.LogInformation($"Заявка {applicationId} отклонена");
        }

        await _dbContext.SaveChangesAsync();

        return MapToResponse(application);
    }

    // 📌 Проверка, является ли пользователь владельцем проекта
    public async Task<bool> IsUserProjectOwner(Guid projectId, Guid userId)
    {
        var project = await _dbContext.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId);

        return project != null && project.OwnerId == userId;
    }

    // 📌 Проверка, является ли пользователь админом проекта
    public async Task<bool> IsUserProjectAdmin(Guid projectId, Guid userId)
    {
        return await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId &&
                            pm.UserId == userId &&
                            pm.Role == ProjectMemberRole.Admin);
    }

    // 📌 Маппинг в DTO (СИНХРОННЫЙ)
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