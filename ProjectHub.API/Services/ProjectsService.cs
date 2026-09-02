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

        public async Task<ProjectResponse> GetProjectByCodeAsync(string code)
        {
            var projectEntity = await _dbContext.Projects
       .Include(p => p.Members)
           .ThenInclude(m => m.User)
       .FirstOrDefaultAsync(p => p.PublicCode == code && p.Visibility == ProjectVisibility.Public);

            if (projectEntity == null)
                return null;

            return MapToResponse(projectEntity);
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
                
                Members = entity.Members.Select(m => new ProjectHub.API.DTOs.MemberInfo
                {
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