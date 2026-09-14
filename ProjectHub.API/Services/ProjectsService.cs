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
        private readonly NotificationService _notificationService;

        public ProjectsService(
            AppDbContext dbContext,
            ILogger<ProjectsService> logger,
            CodeGeneratorService codeGenerator,
            NotificationService notificationService)
        {
            _dbContext = dbContext;
            _logger = logger;
            _codeGenerator = codeGenerator;
            _notificationService = notificationService;
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
            // ── Создаём системные колонки задач ──
            var defaultColumns = new List<TaskColumn>
{
    new()
    {
        Id = Guid.NewGuid(),
        ProjectId = projectEntity.Id,
        Name = "Не начато",
        Order = 0,
        IsDefault = true,
        SystemKey = TaskService.KeyNotStarted
    },
    new()
    {
        Id = Guid.NewGuid(),
        ProjectId = projectEntity.Id,
        Name = "В процессе",
        Order = 1,
        IsDefault = true,
        SystemKey = TaskService.KeyInProgress
    },
    new()
    {
        Id = Guid.NewGuid(),
        ProjectId = projectEntity.Id,
        Name = "Завершено",
        Order = 2,
        IsDefault = true,
        SystemKey = TaskService.KeyCompleted
    }
};

            await _dbContext.TaskColumns.AddRangeAsync(defaultColumns);
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
        // 📌 Изменить роль участника по публичному коду и email (только для владельца)
        public async Task<bool> ChangeMemberRoleByCodeAndEmailAsync(string projectCode, Guid ownerId, string memberEmail, string newRole)
        {
            // Находим проект по публичному коду
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == projectCode);

            if (project == null)
            {
                throw new KeyNotFoundException("Проект с таким кодом не найден");
            }

            // Проверяем, что пользователь является владельцем
            if (project.OwnerId != ownerId)
            {
                throw new UnauthorizedAccessException("Только владелец может изменять роли");
            }

            // Находим пользователя по email
            var memberUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Email == memberEmail);

            if (memberUser == null)
            {
                throw new KeyNotFoundException("Пользователь с таким email не найден");
            }

            // Нельзя изменить роль владельца
            if (memberUser.Id == ownerId)
            {
                throw new InvalidOperationException("Нельзя изменить роль владельца");
            }

            // Находим участника
            var member = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == memberUser.Id);

            if (member == null)
            {
                throw new KeyNotFoundException("Участник не найден");
            }

            // Парсим новую роль
            if (!Enum.TryParse<ProjectMemberRole>(newRole, true, out var role))
            {
                throw new InvalidOperationException("Некорректная роль");
            }

            member.Role = role;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Роль участника {memberEmail} изменена на {role} в проекте {projectCode}");

            // 📨 Уведомление пользователю
            var roleNames = new Dictionary<ProjectMemberRole, string>
    {
        { ProjectMemberRole.Admin, "администратора" },
        { ProjectMemberRole.Member, "участника" }
    };

            await _notificationService.CreateNotificationAsync(
                memberUser.Id,
                $"🔄 Ваша роль в проекте изменена",
                $"Вас назначили {roleNames.GetValueOrDefault(role, role.ToString())} в проекте '{project.Name}'",
                NotificationType.RoleChanged,
                $"/projects/{project.PublicCode}/dashboard",
                project.Id
            );

            return true;
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

            // 📌 Если запрошены только избранные — не ограничиваем по видимости.
            // Пользователь мог добавить в избранное приватный проект, к которому у него есть доступ.
            if (favoritesOnly && userId.HasValue)
            {
                var favoriteIds = await _dbContext.Favorites
                    .Where(f => f.UserId == userId.Value)
                    .Select(f => f.ProjectId)
                    .ToListAsync();

                query = query.Where(p => favoriteIds.Contains(p.Id));
            }
            else
            {
                // 📌 Для обычного списка — только публичные
                query = query.Where(p => p.Visibility == ProjectVisibility.Public);

                // 📌 Дополнительный фильтр по видимости — только для обычного списка
                if (visibility.HasValue)
                    query = query.Where(p => p.Visibility == visibility.Value);
            }

            query = query.OrderByDescending(p => p.CreatedAt);

            var projects = await query.ToListAsync();

            var responses = projects.Select(MapToResponse).ToList();

            // 📌 Для избранных — проставляем IsFavorite = true
            if (favoritesOnly)
            {
                foreach (var r in responses)
                    r.IsFavorite = true;
            }

            return responses;
        }

        // 📌 Поиск проекта по коду (только публичные)
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

            if (currentUserId.HasValue)
            {
                response.IsFavorite = await IsProjectFavoriteAsync(projectEntity.Id, currentUserId.Value);
                response.UserStatus = await GetUserProjectStatusAsync(projectEntity.Id, currentUserId.Value);
            }

            return response;
        }

        // 📌 Получить проект по коду для участника (включая приватные)
        public async Task<ProjectResponse> GetProjectByCodeForMemberAsync(string code, Guid userId)
        {
            var projectEntity = await _dbContext.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (projectEntity == null)
                return null;

            // Проверяем, является ли пользователь участником или владельцем
            var isMember = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == projectEntity.Id && pm.UserId == userId);

            var isOwner = projectEntity.OwnerId == userId;

            if (!isMember && !isOwner)
                return null;

            var response = MapToResponse(projectEntity);

            response.IsFavorite = await IsProjectFavoriteAsync(projectEntity.Id, userId);
            response.UserStatus = await GetUserProjectStatusAsync(projectEntity.Id, userId);

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

        // 📌 Обновить проект по публичному коду
        public async Task<ProjectResponse> UpdateProjectByCodeAsync(string code, Guid userId, UpdateProjectRequest request)
        {
            var project = await _dbContext.Projects
                .Include(p => p.Members)
                    .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (project == null)
            {
                throw new KeyNotFoundException("Проект с таким кодом не найден");
            }

            // Проверяем права
            var isOwner = project.OwnerId == userId;
            var isAdmin = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId && pm.Role == ProjectMemberRole.Admin);

            if (!isOwner && !isAdmin)
            {
                throw new UnauthorizedAccessException("У вас нет прав для редактирования проекта");
            }

            // 📌 Обновляем поля в зависимости от прав
            if (!string.IsNullOrWhiteSpace(request.Name) && isOwner)
            {
                project.Name = request.Name;
            }

            if (!string.IsNullOrWhiteSpace(request.Description) && (isOwner || isAdmin))
            {
                project.Description = request.Description;
            }

            if (request.Category.HasValue && isOwner)
            {
                project.Category = request.Category.Value;
            }

            if (request.Visibility.HasValue && isOwner)
            {
                project.Visibility = request.Visibility.Value;
            }

            if (request.Deadline.HasValue && isOwner)
            {
                project.Deadline = request.Deadline.Value;
            }

            project.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Проект {code} обновлен пользователем {userId}");

            return MapToResponse(project);
        }
        // 📌 Удалить участника из проекта по публичному коду и email
        public async Task<bool> RemoveMemberFromProjectAsync(string projectCode, Guid userId, string memberEmail)
        {
            // Находим проект по коду
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == projectCode);

            if (project == null)
            {
                throw new KeyNotFoundException("Проект с таким кодом не найден");
            }

            // Находим пользователя, который хочет удалить
            var currentUser = await _dbContext.Users.FindAsync(userId);
            if (currentUser == null)
            {
                throw new KeyNotFoundException("Пользователь не найден");
            }

            // Проверяем права текущего пользователя
            var isOwner = project.OwnerId == userId;
            var isAdmin = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId && pm.Role == ProjectMemberRole.Admin);

            if (!isOwner && !isAdmin)
            {
                throw new UnauthorizedAccessException("У вас нет прав для удаления участников");
            }

            // Находим пользователя, которого хотят удалить
            var memberUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Email == memberEmail);

            if (memberUser == null)
            {
                throw new KeyNotFoundException("Пользователь с таким email не найден");
            }

            // Нельзя удалить владельца
            if (memberUser.Id == project.OwnerId)
            {
                throw new InvalidOperationException("Нельзя удалить владельца проекта");
            }

            // Админ не может удалять админов
            if (isAdmin && !isOwner)
            {
                var isTargetAdmin = await _dbContext.ProjectMembers
                    .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == memberUser.Id && pm.Role == ProjectMemberRole.Admin);

                if (isTargetAdmin)
                {
                    throw new UnauthorizedAccessException("Администратор не может удалять других администраторов");
                }
            }

            // Нельзя удалить самого себя
            if (memberUser.Id == userId)
            {
                throw new InvalidOperationException("Нельзя удалить себя из проекта");
            }

            // Находим запись участника
            var member = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == memberUser.Id);

            if (member == null)
            {
                throw new KeyNotFoundException("Участник не найден");
            }

            // Сохраняем имя удаляемого для уведомлений
            var removedUserName = memberUser.Name;
            var removedUserEmail = memberUser.Email;
            var removedUserId = memberUser.Id;
            var projectName = project.Name;
            var projectCode_ = project.PublicCode;

            // Удаляем участника
            _dbContext.ProjectMembers.Remove(member);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Пользователь {memberEmail} удален из проекта {projectCode} пользователем {userId}");

            // 📨 Уведомление удаленному пользователю
            await _notificationService.CreateNotificationAsync(
                removedUserId,
                "🚪 Вас удалили из проекта",
                $"Вас удалили из проекта '{projectName}'",
                NotificationType.MemberRemoved,
                $"/projects/{projectCode_}",
                project.Id
            );

            // 📨 Уведомление ВСЕМ участникам проекта (включая того, кто удалил)
            var projectMembers = await _dbContext.ProjectMembers
                .Where(pm => pm.ProjectId == project.Id)
                .Include(pm => pm.User)
                .ToListAsync();

            var removerName = currentUser.Name;

            foreach (var pm in projectMembers)
            {
                // Не отправляем удаленному пользователю (он уже получил уведомление)
                if (pm.UserId == removedUserId)
                    continue;

                await _notificationService.CreateNotificationAsync(
                    pm.UserId,
                    "👋 Участник удален из проекта",
                    $"{removedUserName} был удален из проекта '{projectName}' пользователем {removerName}",
                    NotificationType.MemberRemoved,
                    $"/projects/{projectCode_}/dashboard",
                    project.Id
                );
            }

            _logger.LogInformation($"📨 Уведомления об удалении участника отправлены всем участникам проекта");

            return true;
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