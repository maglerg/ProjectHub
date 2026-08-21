// Services/ProjectsService.cs
using ProjectHub.API.Models;
using ProjectHub.API.DTOs;
using ProjectHub.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

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

        public async Task<ProjectResponse> CreateProjectAsync(CreateProjectRequest request)
        {
            _logger.LogInformation($"CREATE: {request.Name}");

            var publicCode = await GenerateUniqueCodeAsync();

            var projectEntity = new ProjectEntity
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                PublicCode = publicCode,
                Description = request.Description,
                Category = request.Category,
                Visibility = request.Visibility,
                Deadline = request.Deadline,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _dbContext.Projects.AddAsync(projectEntity);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Создан проект с кодом: {publicCode}");

            return MapToResponse(projectEntity);
        }

        public async Task<List<ProjectResponse>> GetProjectsFilteredAsync(
            ProjectCategory? category = null,
            ProjectVisibility? visibility = null)
        {
            var query = _dbContext.Projects.AsQueryable();

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
                .FirstOrDefaultAsync(p => p.PublicCode == code && p.Visibility == ProjectVisibility.Public);

            return projectEntity != null ? MapToResponse(projectEntity) : null;
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

        private ProjectResponse MapToResponse(ProjectEntity entity)
        {
            return new ProjectResponse
            {
                PublicCode = entity.PublicCode,
                Name = entity.Name,
                Description = entity.Description,
                Category = entity.Category,
                Visibility = entity.Visibility,
                Deadline = entity.Deadline
            };
        }
    }
}