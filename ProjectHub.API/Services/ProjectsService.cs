// Services/ProjectsService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;
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
        // 📌 Проверить, добавлен ли проект в избранное
        public async Task<bool> IsProjectFavoriteAsync(Guid projectId, Guid userId)
        {
            return await _dbContext.Favorites
                .AnyAsync(f => f.ProjectId == projectId && f.UserId == userId);
        }

        // 📌 Добавить/удалить из избранного по ID (используется внутри)
        public async Task<bool> ToggleFavoriteAsync(Guid projectId, Guid userId)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project == null)
                throw new KeyNotFoundException("Проект не найден");

            var favorite = await _dbContext.Favorites
                .FirstOrDefaultAsync(f => f.ProjectId == projectId && f.UserId == userId);

            if (favorite != null)
            {
                // Удаляем из избранного
                _dbContext.Favorites.Remove(favorite);
                project.FavoritesCount = Math.Max(0, project.FavoritesCount - 1);
                await _dbContext.SaveChangesAsync();
                return false;
            }
            else
            {
                // Добавляем в избранное
                var newFavorite = new Favorite
                {
                    Id = Guid.NewGuid(),
                    ProjectId = projectId,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                await _dbContext.Favorites.AddAsync(newFavorite);
                project.FavoritesCount += 1;
                await _dbContext.SaveChangesAsync();
                return true;
            }
        }

        // 📌 Получить избранные проекты пользователя
        public async Task<List<ProjectResponse>> GetUserFavoritesAsync(Guid userId)
        {
            var favoriteProjects = await _dbContext.Favorites
                .Where(f => f.UserId == userId)
                .Select(f => f.Project)
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .OrderByDescending(p => p.FavoritesCount)
                .ToListAsync();

            var responses = favoriteProjects.Select(MapToResponse).ToList();

            // 📌 Устанавливаем IsFavorite = true для всех
            foreach (var response in responses)
            {
                response.IsFavorite = true;
            }

            return responses;
        }
        // 📌 Получить проекты, где пользователь является владельцем или участником
        public async Task<List<ProjectResponse>> GetUserProjectsAsync(Guid userId)
        {
            // 📌 Проекты, где пользователь является ВЛАДЕЛЬЦЕМ
            var ownedProjects = await _dbContext.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .Where(p => p.OwnerId == userId)
                .ToListAsync();

            // 📌 Проекты, где пользователь является УЧАСТНИКОМ (через ProjectMembers)
            var memberProjects = await _dbContext.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .Where(p => p.Members.Any(m => m.UserId == userId))
                .ToListAsync();

            // 📌 Объединяем, убираем дубликаты, сортируем по дате создания
            var allProjects = ownedProjects
                .Union(memberProjects)
                .DistinctBy(p => p.Id)
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            // 📌 Если проектов нет — возвращаем пустой список
            if (!allProjects.Any())
            {
                _logger.LogInformation($"Пользователь {userId} не участвует ни в одном проекте");
                return new List<ProjectResponse>();
            }

            var responses = new List<ProjectResponse>();

            foreach (var project in allProjects)
            {
                var response = MapToResponse(project);

                // 📌 Проверяем статус избранного для каждого проекта
                response.IsFavorite = await IsProjectFavoriteAsync(project.Id, userId);

                // 📌 Проверяем статус пользователя в проекте
                response.UserStatus = await GetUserProjectStatusAsync(project.Id, userId);

                responses.Add(response);
            }

            return responses;
        }
        public async Task<List<ProjectResponse>> GetProjectsFilteredAsync(
            ProjectCategory? category = null,
            ProjectVisibility? visibility = null,
            bool favoritesOnly = false,
             Guid? userId = null)
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
            // 📌 Если запрошены только избранные
            if (favoritesOnly && userId.HasValue)
            {
                var favoriteIds = await _dbContext.Favorites
                    .Where(f => f.UserId == userId.Value)
                    .Select(f => f.ProjectId)
                    .ToListAsync();

                query = query.Where(p => favoriteIds.Contains(p.Id));
            }
            query = query.OrderByDescending(p => p.CreatedAt);

            var projects = await query.ToListAsync();
            return projects.Select(MapToResponse).ToList();
        }

        public async Task<ProjectResponse> GetProjectByCodeAsync(string code, Guid? currentUserId = null)
        {
            var projectEntity = await _dbContext.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                     .Include(p => p.Favorites)
                .FirstOrDefaultAsync(p => p.PublicCode == code && p.Visibility == ProjectVisibility.Public);

            if (projectEntity == null)
                return null;

            var response = MapToResponse(projectEntity);

            // 📌 Проверяем, добавил ли пользователь проект в избранное
            if (currentUserId.HasValue)
            {
                var isFavorite = await IsProjectFavoriteAsync(projectEntity.Id, currentUserId.Value);
                response.IsFavorite = isFavorite;

                var status = await GetUserProjectStatusAsync(projectEntity.Id, currentUserId.Value);
                response.UserStatus = status;
            }

            // 📌 Вычисляем статус пользователя, если передан ID
            if (currentUserId.HasValue)
            {
                response.UserStatus = await GetUserProjectStatusAsync(projectEntity.Id, currentUserId.Value);
            }

            return response;
        }
        // 📌 Добавить/удалить из избранного по публичному коду
        public async Task<bool> ToggleFavoriteByCodeAsync(string code, Guid userId)
        {
            // Находим проект по коду
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (project == null)
                throw new KeyNotFoundException("Проект с таким кодом не найден");

            return await ToggleFavoriteAsync(project.Id, userId);
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
                FavoritesCount = entity.FavoritesCount,
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