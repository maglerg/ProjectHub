// Services/ProjectsService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using System.Reflection;


namespace ProjectHub.API.Services
{
    public class ProjectsService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ProjectsService> _logger;
        private readonly CodeGeneratorService _codeGenerator;
        private const int MaxAttempts = 100;

        public ProjectsService(
            AppDbContext dbContext,
            ILogger<ProjectsService> logger,
            CodeGeneratorService codeGenerator)
        {
            _dbContext = dbContext;
            _logger = logger;
            _codeGenerator = codeGenerator;
        }

        public async Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request, Guid userId)
        {
            _logger.LogInformation($"CREATE: {request.Name}");

            var publicCode = await GenerateUniqueCodeAsync();
            var projectEntity = new Project
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                PublicCode = publicCode,
                Description = request.Description,
                Category = request.Category,
                Status = ProjectStatus.Uncompleted,
                Visibility = request.Visibility,
                Deadline = request.Deadline,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                OwnerId = userId
            };

            await _dbContext.Projects.AddAsync(projectEntity);
            await _dbContext.SaveChangesAsync();
            var ownerMember = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = projectEntity.Id,
                UserId = userId,
                Role = ProjectMemberRole.Owner,
                JoinedAt = DateTime.UtcNow
            };
            await _dbContext.ProjectMembers.AddAsync(ownerMember);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation($"Создан проект с кодом: {publicCode}");

            var projectWithMembers = await _dbContext.Projects
    .Include(p => p.Members)
        .ThenInclude(m => m.User)
    .FirstAsync(p => p.Id == projectEntity.Id);

            return MapToResponse(projectWithMembers);
        }
        public async Task<bool> JoinProjectAsync(string publicCode, Guid userId)
        {
            _logger.LogInformation($"Попытка присоединения к проекту {publicCode} пользователем {userId}");

            // Находим проект по коду
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == publicCode && p.Visibility == ProjectVisibility.Public);

            if (project == null)
            {
                _logger.LogWarning($"Проект с кодом {publicCode} не найден");
                return false;
            }
            _logger.LogInformation($"Проверяем пользователя: {userId}");
            _logger.LogInformation($"Проект: {project.Id}");
            var allMembers = await _dbContext.ProjectMembers
    .Where(pm => pm.ProjectId == project.Id)
    .ToListAsync();

            foreach (var memberr in allMembers)
            {
                _logger.LogInformation(
                    $"MEMBER: Id={memberr.Id}, UserId={memberr.UserId}, Role={memberr.Role}");
            }
            // Проверяем, не является ли пользователь уже участником
            var existingMember = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId);

            if (existingMember != null)
            {
                _logger.LogWarning($"Пользователь {userId} уже является участником проекта {publicCode}");
                throw new InvalidOperationException("Вы уже являетесь участником этого проекта");
            }

            // Проверяем, не является ли пользователь владельцем
            if (project.OwnerId == userId)
            {
                _logger.LogWarning($"Пользователь {userId} является владельцем проекта {publicCode}");
                throw new InvalidOperationException("Вы являетесь владельцем этого проекта");
            }

            // Создаем запись об участнике
            var member = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                UserId = userId,
                Role = ProjectMemberRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            await _dbContext.ProjectMembers.AddAsync(member);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Пользователь {userId} успешно присоединился к проекту {publicCode}");
            return true;
        }
        public async Task<List<ProjectResponse>> GetProjectsFilteredAsync(
            ProjectCategory? category = null,
            ProjectVisibility? visibility = null)
        {
            var query = _dbContext.Projects
    .Include(p => p.Members)
        .ThenInclude(m => m.User)
    .AsQueryable();

            if (category.HasValue)
                query = query.Where(p => p.Category == category.Value);

            if (visibility.HasValue)
                query = query.Where(p => p.Visibility == visibility.Value);

            // По умолчанию только публичные
            query = query.Where(p => p.Visibility == ProjectVisibility.Public);
            query = query.OrderByDescending(p => p.CreatedAt);

            var projects = await query.ToListAsync();
            return projects.Select(MapToResponse).ToList();
        }

        public async Task<ProjectResponse> GetProjectByCodeAsync(string code, Guid? currentUserId = null)
        {
            var projectEntity = await _dbContext.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(p => p.PublicCode == code && p.Visibility == ProjectVisibility.Public);

            if (projectEntity == null)
                return null;

            var response = MapToResponse(projectEntity);

            // 📌 Вычисляем статус пользователя, если передан ID
            if (currentUserId.HasValue)
            {
                response.UserStatus = await GetUserProjectStatusAsync(projectEntity.Id, currentUserId.Value);
            }

            return response;
        }

        // 📌 НОВЫЙ МЕТОД — определяет статус пользователя в проекте
        private async Task<UserProjectStatus> GetUserProjectStatusAsync(Guid projectId, Guid userId)
        {
            // Проверяем, является ли пользователь владельцем
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project != null && project.OwnerId == userId)
            {
                return UserProjectStatus.Owner;
            }

            // Проверяем, является ли пользователь участником
            var member = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (member != null)
            {
                return member.Role == ProjectMemberRole.Admin ? UserProjectStatus.Admin : UserProjectStatus.Member;
            }

            // Проверяем, есть ли ожидающая заявка
            var pendingApplication = await _dbContext.Applications
                .FirstOrDefaultAsync(a => a.ProjectId == projectId &&
                                          a.UserId == userId &&
                                          a.Status == ApplicationStatus.Pending);

            if (pendingApplication != null)
            {
                return UserProjectStatus.Pending;
            }

            return UserProjectStatus.NotJoined;
        }

        public async Task<bool> IsCodeExistsAsync(string code)
        {
            return await _dbContext.Projects.AnyAsync(p => p.PublicCode == code);
        }

        private async Task<string> GenerateUniqueCodeAsync()
        {
            var attempts = 0;
            while (attempts < MaxAttempts)
            {
                var formattedCode = _codeGenerator.GenerateFormattedCode();
                if (!await IsCodeExistsAsync(formattedCode))
                {
                    return formattedCode;
                }
                attempts++;
            }
            throw new InvalidOperationException($"Не удалось сгенерировать уникальный код после {MaxAttempts} попыток");
        }


        private ProjectResponse MapToResponse(Project entity)
        {
            return new ProjectResponse
            {
                PublicCode = entity.PublicCode,
                Name = entity.Name,
                Description = entity.Description,
                Category = entity.Category,
                Visibility = entity.Visibility,
                Status = entity.Status,
                Deadline = entity.Deadline,
                CreatedAt = entity.CreatedAt,
                OwnerId = entity.OwnerId,  
                Members = entity.Members.Select(m => new ProjectHub.API.DTOs.MemberInfo
                {
                    UserId = m.UserId,
                    Name = m.User.Name,
                    Email = m.User.Email,
                    Specialization = m.User.Specialization.ToString(),
                    Role = m.Role.ToString(),
                    JoinedAt = m.JoinedAt
                }).ToList()
            };
        }
    }
}