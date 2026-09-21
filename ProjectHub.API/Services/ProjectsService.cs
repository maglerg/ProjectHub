// Services/ProjectsService.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs.ProjectDtos;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;

namespace ProjectHub.API.Services
{
    public class ProjectsService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ProjectsService> _logger;
        private readonly CodeGeneratorService _codeGenerator;
        private readonly NotificationService _notificationService;
        private readonly ActivityService _activity;

        private const int MaxAttempts = 100;

        public ProjectsService(
            AppDbContext dbContext,
            ILogger<ProjectsService> logger,
            CodeGeneratorService codeGenerator,
            NotificationService notificationService,
            ActivityService activity)
        {
            _dbContext = dbContext;
            _logger = logger;
            _codeGenerator = codeGenerator;
            _notificationService = notificationService;
            _activity = activity;
        }

        // ═══════════════════════════════════════════════════════════
        //  СОЗДАНИЕ ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

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
                OwnerId = userId,
                IsArchived = false
            };

            _dbContext.Projects.Add(projectEntity);
            await _dbContext.SaveChangesAsync();

            var ownerMember = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = projectEntity.Id,
                UserId = userId,
                Role = ProjectMemberRole.Owner,
                JoinedAt = DateTime.UtcNow
            };
            _dbContext.ProjectMembers.Add(ownerMember);
            await _dbContext.SaveChangesAsync();

            // ── Создаём системные колонки задач ──
            var defaultColumns = new List<TaskColumn>
            {
                new() { Id = Guid.NewGuid(), ProjectId = projectEntity.Id, Name = "Не начато",  Order = 0, IsDefault = true, SystemKey = TaskService.KeyNotStarted, ProgressWeight = 0.0 },
                new() { Id = Guid.NewGuid(), ProjectId = projectEntity.Id, Name = "В процессе", Order = 1, IsDefault = true, SystemKey = TaskService.KeyInProgress, ProgressWeight = 0.5 },
                new() { Id = Guid.NewGuid(), ProjectId = projectEntity.Id, Name = "Завершено",  Order = 2, IsDefault = true, SystemKey = TaskService.KeyCompleted,  ProgressWeight = 1.0 }
            };

            _dbContext.TaskColumns.AddRange(defaultColumns);

            await _activity.LogAsync(
                projectEntity.Id,
                userId,
                ActivityType.ProjectCreated,
                summary: $"Создан проект: {projectEntity.Name}",
                link: $"/projects/{projectEntity.PublicCode}",
                relatedEntityId: projectEntity.Id
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Создан проект с кодом: {publicCode}");

            var projectWithMembers = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .FirstAsync(p => p.Id == projectEntity.Id);

            return MapToResponse(projectWithMembers);
        }

        // ═══════════════════════════════════════════════════════════
        //  ВСТУПЛЕНИЕ В ПРОЕКТ
        // ═══════════════════════════════════════════════════════════

        public async Task<bool> JoinProjectAsync(string publicCode, Guid userId)
        {
            _logger.LogInformation($"Попытка присоединения к проекту {publicCode} пользователем {userId}");

            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == publicCode
                                          && p.Visibility == ProjectVisibility.Public
                                          && !p.IsArchived);

            if (project == null)
            {
                _logger.LogWarning($"Проект с кодом {publicCode} не найден или архивирован");
                return false;
            }

            var existingMember = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId);

            if (existingMember != null)
                throw new InvalidOperationException("Вы уже являетесь участником этого проекта");

            if (project.OwnerId == userId)
                throw new InvalidOperationException("Вы являетесь владельцем этого проекта");

            var member = new ProjectMember
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                UserId = userId,
                Role = ProjectMemberRole.Member,
                JoinedAt = DateTime.UtcNow
            };

            _dbContext.ProjectMembers.Add(member);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.MemberJoined,
                summary: "Присоединился к проекту",
                link: $"/projects/{project.PublicCode}/dashboard",
                relatedEntityId: userId
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Пользователь {userId} успешно присоединился к проекту {publicCode}");
            return true;
        }

        // ═══════════════════════════════════════════════════════════
        //  ИЗБРАННОЕ
        // ═══════════════════════════════════════════════════════════

        public async Task<bool> IsProjectFavoriteAsync(Guid projectId, Guid userId)
        {
            return await _dbContext.Favorites
                .AnyAsync(f => f.ProjectId == projectId && f.UserId == userId);
        }

        public async Task<bool> ToggleFavoriteAsync(Guid projectId, Guid userId)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId)
                ?? throw new KeyNotFoundException("Проект не найден");

            var favorite = await _dbContext.Favorites
                .FirstOrDefaultAsync(f => f.ProjectId == projectId && f.UserId == userId);

            if (favorite != null)
            {
                _dbContext.Favorites.Remove(favorite);
                project.FavoritesCount = Math.Max(0, project.FavoritesCount - 1);
                await _dbContext.SaveChangesAsync();
                return false;
            }

            var newFavorite = new Favorite
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.Favorites.Add(newFavorite);
            project.FavoritesCount += 1;
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<List<ProjectResponse>> GetUserFavoritesAsync(Guid userId)
        {
            var favoriteProjects = await _dbContext.Favorites
                .Where(f => f.UserId == userId)
                .Select(f => f.Project)
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .Where(p => !p.IsArchived)   // ← архивные не показываем в избранном
                .OrderByDescending(p => p.FavoritesCount)
                .ToListAsync();

            var responses = favoriteProjects.Select(MapToResponse).ToList();

            foreach (var response in responses)
            {
                response.IsFavorite = true;
            }

            return responses;
        }

        // ═══════════════════════════════════════════════════════════
        //  СПИСКИ ПРОЕКТОВ
        // ═══════════════════════════════════════════════════════════

        public async Task<List<ProjectResponse>> GetUserProjectsAsync(Guid userId, bool archived = false)
        {
            var ownedProjects = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .Where(p => p.OwnerId == userId && p.IsArchived == archived)
                .ToListAsync();

            var memberProjects = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .Where(p => p.Members.Any(m => m.UserId == userId)
                            && p.IsArchived == archived)
                .ToListAsync();

            var allProjects = ownedProjects
                .Union(memberProjects)
                .DistinctBy(p => p.Id)
                .OrderByDescending(p => p.IsArchived ? (p.ArchivedAt ?? p.CreatedAt) : p.CreatedAt)
                .ToList();

            if (!allProjects.Any())
            {
                _logger.LogInformation($"Пользователь {userId} не участвует ни в одном проекте");
                return new List<ProjectResponse>();
            }

            var responses = new List<ProjectResponse>();

            foreach (var project in allProjects)
            {
                var response = MapToResponse(project);
                response.IsFavorite = await IsProjectFavoriteAsync(project.Id, userId);
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
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Where(p => !p.IsArchived)
                .AsQueryable();

            if (category.HasValue)
                query = query.Where(p => p.Category == category.Value);

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
                query = query.Where(p => p.Visibility == ProjectVisibility.Public);

                if (visibility.HasValue)
                    query = query.Where(p => p.Visibility == visibility.Value);
            }

            query = query.OrderByDescending(p => p.CreatedAt);

            var projects = await query.ToListAsync();
            var responses = projects.Select(MapToResponse).ToList();

            if (favoritesOnly)
            {
                foreach (var r in responses)
                    r.IsFavorite = true;
            }

            return responses;
        }

        // ═══════════════════════════════════════════════════════════
        //  ПОЛУЧЕНИЕ ПРОЕКТА ПО КОДУ
        // ═══════════════════════════════════════════════════════════

        public async Task<ProjectResponse> GetProjectByCodeAsync(string code, Guid? currentUserId = null)
        {
            var projectEntity = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .FirstOrDefaultAsync(p => p.PublicCode == code
                                          && p.Visibility == ProjectVisibility.Public
                                          && !p.IsArchived);

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

        public async Task<ProjectResponse> GetProjectByCodeForMemberAsync(string code, Guid userId)
        {
            var projectEntity = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .Include(p => p.Favorites)
                .FirstOrDefaultAsync(p => p.PublicCode == code);

            if (projectEntity == null)
                return null;

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

        // ═══════════════════════════════════════════════════════════
        //  ИЗМЕНЕНИЕ РОЛИ УЧАСТНИКА
        // ═══════════════════════════════════════════════════════════

        public async Task<bool> ChangeMemberRoleByCodeAndEmailAsync(
            string projectCode, Guid ownerId, string memberEmail, string newRole)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == projectCode)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            if (project.OwnerId != ownerId)
                throw new UnauthorizedAccessException("Только владелец может изменять роли");

            var memberUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Email == memberEmail)
                ?? throw new KeyNotFoundException("Пользователь с таким email не найден");

            if (memberUser.Id == ownerId)
                throw new InvalidOperationException("Нельзя изменить роль владельца");

            var member = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == memberUser.Id)
                ?? throw new KeyNotFoundException("Участник не найден");

            if (!Enum.TryParse<ProjectMemberRole>(newRole, true, out var role))
                throw new InvalidOperationException("Некорректная роль");

            var oldRole = member.Role;
            member.Role = role;

            await _activity.LogAsync(
                project.Id,
                ownerId,
                ActivityType.MemberRoleChanged,
                summary: $"{memberUser.Name}: {oldRole} → {role}",
                link: $"/projects/{project.PublicCode}/dashboard",
                relatedEntityId: memberUser.Id
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Роль участника {memberEmail} изменена на {role} в проекте {projectCode}");

            var roleNames = new Dictionary<ProjectMemberRole, string>
            {
                { ProjectMemberRole.Admin, "администратора" },
                { ProjectMemberRole.Member, "участника" }
            };

            await _notificationService.CreateNotificationAsync(
                memberUser.Id,
                "🔄 Ваша роль в проекте изменена",
                $"Вас назначили {roleNames.GetValueOrDefault(role, role.ToString())} в проекте '{project.Name}'",
                NotificationType.RoleChanged,
                $"/projects/{project.PublicCode}/dashboard",
                project.Id
            );

            return true;
        }

        // ═══════════════════════════════════════════════════════════
        //  ИЗБРАННОЕ ПО КОДУ
        // ═══════════════════════════════════════════════════════════

        public async Task<bool> ToggleFavoriteByCodeAsync(string code, Guid userId)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            return await ToggleFavoriteAsync(project.Id, userId);
        }

        // ═══════════════════════════════════════════════════════════
        //  ОБНОВЛЕНИЕ ПРОЕКТА
        // ═══════════════════════════════════════════════════════════

        public async Task<ProjectResponse> UpdateProjectByCodeAsync(
            string code, Guid userId, UpdateProjectRequest request)
        {
            var project = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .FirstOrDefaultAsync(p => p.PublicCode == code)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            var isOwner = project.OwnerId == userId;
            var isAdmin = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId && pm.Role == ProjectMemberRole.Admin);

            if (!isOwner && !isAdmin)
                throw new UnauthorizedAccessException("У вас нет прав для редактирования проекта");

            var oldName = project.Name;
            var oldDeadline = project.Deadline;
            var oldVisibility = project.Visibility;

            if (!string.IsNullOrWhiteSpace(request.Name) && isOwner)
                project.Name = request.Name;

            if (!string.IsNullOrWhiteSpace(request.Description) && (isOwner || isAdmin))
                project.Description = request.Description;

            if (request.Category.HasValue && isOwner)
                project.Category = request.Category.Value;

            if (request.Visibility.HasValue && isOwner)
                project.Visibility = request.Visibility.Value;

            if (request.Status.HasValue && isOwner)
                project.Status = request.Status.Value;

            if (request.Deadline.HasValue && isOwner)
                project.Deadline = request.Deadline.Value;

            project.UpdatedAt = DateTime.UtcNow;

            // Логируем точечные изменения
            if (oldName != project.Name)
            {
                await _activity.LogAsync(
                    project.Id, userId,
                    ActivityType.ProjectUpdated,
                    summary: $"Название проекта: {oldName} → {project.Name}",
                    link: $"/projects/{project.PublicCode}",
                    relatedEntityId: project.Id
                );
            }

            if (oldDeadline != project.Deadline)
            {
                await _activity.LogAsync(
                    project.Id, userId,
                    ActivityType.ProjectDeadlineChanged,
                    summary: $"Дедлайн проекта изменён: {oldDeadline:dd.MM.yyyy} → {project.Deadline:dd.MM.yyyy}",
                    link: $"/projects/{project.PublicCode}",
                    relatedEntityId: project.Id
                );
            }

            if (oldVisibility != project.Visibility)
            {
                await _activity.LogAsync(
                    project.Id, userId,
                    ActivityType.ProjectVisibilityChanged,
                    summary: $"Видимость проекта: {oldVisibility} → {project.Visibility}",
                    link: $"/projects/{project.PublicCode}",
                    relatedEntityId: project.Id
                );
            }

            await _activity.LogAsync(
                project.Id, userId,
                ActivityType.ProjectUpdated,
                summary: "Проект обновлён",
                link: $"/projects/{project.PublicCode}",
                relatedEntityId: project.Id
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Проект {code} обновлен пользователем {userId}");

            return MapToResponse(project);
        }

        // ═══════════════════════════════════════════════════════════
        //  АРХИВИРОВАНИЕ
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Архивировать проект. Только владелец.
        ///   • pending-заявки отклоняются и удаляются;
        ///   • pending-приглашения отменяются и удаляются;
        ///   • активные голосования закрываются;
        ///   • пишется событие в историю.
        /// </summary>
        public async Task<ProjectResponse> ArchiveProjectAsync(string code, Guid userId)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            if (project.OwnerId != userId)
                throw new UnauthorizedAccessException(
                    "Архивировать проект может только владелец");

            if (project.IsArchived)
                throw new InvalidOperationException("Проект уже находится в архиве");

            var now = DateTime.UtcNow;

            project.IsArchived = true;
            project.ArchivedAt = now;
            project.ArchivedById = userId;
            project.UpdatedAt = now;

            // ── Отменяем pending-заявки ──
            var pendingApplications = await _dbContext.Applications
                .Where(a => a.ProjectId == project.Id
                            && a.Status == ApplicationStatus.Pending)
                .ToListAsync();

            foreach (var app in pendingApplications)
            {
                try
                {
                    await _notificationService.CreateNotificationAsync(
                        app.UserId,
                        "❌ Проект переведён в архив",
                        $"Ваша заявка в проект '{project.Name}' отклонена: проект архивирован владельцем",
                        NotificationType.ApplicationRejected,
                        $"/projects/{project.PublicCode}",
                        project.Id
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Не удалось отправить уведомление заявителю");
                }
            }

            if (pendingApplications.Any())
                _dbContext.Applications.RemoveRange(pendingApplications);

            // ── Отменяем pending-приглашения ──
            var pendingInvitations = await _dbContext.Invitations
                .Where(i => i.ProjectId == project.Id
                            && i.Status == InvitationStatus.Pending)
                .ToListAsync();

            foreach (var inv in pendingInvitations)
            {
                try
                {
                    await _notificationService.CreateNotificationAsync(
                        inv.InviteeId,
                        "❌ Приглашение отменено",
                        $"Приглашение в проект '{project.Name}' отменено: проект переведён в архив",
                        NotificationType.InvitationRejected,
                        $"/projects/{project.PublicCode}",
                        project.Id
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Не удалось отправить уведомление приглашённому");
                }
            }

            if (pendingInvitations.Any())
                _dbContext.Invitations.RemoveRange(pendingInvitations);

            // ── Закрываем активные голосования ──
            var activeVotings = await _dbContext.Votings
                .Where(v => v.ProjectId == project.Id && !v.IsClosed)
                .ToListAsync();

            foreach (var v in activeVotings)
            {
                v.IsClosed = true;
            }

            // ── Событие в историю ──
            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.ProjectArchived,
                summary: $"Проект архивирован: {project.Name}",
                link: $"/projects/{project.PublicCode}",
                relatedEntityId: project.Id
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"Проект {code} архивирован пользователем {userId}. " +
                $"Отменено заявок: {pendingApplications.Count}, " +
                $"приглашений: {pendingInvitations.Count}, " +
                $"закрыто голосований: {activeVotings.Count}");

            var withMembers = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .FirstAsync(p => p.Id == project.Id);

            return MapToResponse(withMembers);
        }

        /// <summary>
        /// Восстановить проект из архива. Только владелец.
        /// Заявки и приглашения не возвращаются.
        /// </summary>
        public async Task<ProjectResponse> UnarchiveProjectAsync(string code, Guid userId)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == code)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            if (project.OwnerId != userId)
                throw new UnauthorizedAccessException(
                    "Восстанавливать проект может только владелец");

            if (!project.IsArchived)
                throw new InvalidOperationException("Проект не находится в архиве");

            project.IsArchived = false;
            project.ArchivedAt = null;
            project.ArchivedById = null;
            project.UpdatedAt = DateTime.UtcNow;

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.ProjectUnarchived,
                summary: $"Проект восстановлен из архива: {project.Name}",
                link: $"/projects/{project.PublicCode}",
                relatedEntityId: project.Id
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                $"Проект {code} восстановлен из архива пользователем {userId}");

            var withMembers = await _dbContext.Projects
                .Include(p => p.Members).ThenInclude(m => m.User)
                .FirstAsync(p => p.Id == project.Id);

            return MapToResponse(withMembers);
        }

        // ═══════════════════════════════════════════════════════════
        //  УДАЛЕНИЕ УЧАСТНИКА
        // ═══════════════════════════════════════════════════════════

        public async Task<bool> RemoveMemberFromProjectAsync(
            string projectCode, Guid userId, string memberEmail)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.PublicCode == projectCode)
                ?? throw new KeyNotFoundException("Проект с таким кодом не найден");

            var currentUser = await _dbContext.Users.FindAsync(userId)
                ?? throw new KeyNotFoundException("Пользователь не найден");

            var isOwner = project.OwnerId == userId;
            var isAdmin = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == userId && pm.Role == ProjectMemberRole.Admin);

            if (!isOwner && !isAdmin)
                throw new UnauthorizedAccessException("У вас нет прав для удаления участников");

            var memberUser = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Email == memberEmail)
                ?? throw new KeyNotFoundException("Пользователь с таким email не найден");

            if (memberUser.Id == project.OwnerId)
                throw new InvalidOperationException("Нельзя удалить владельца проекта");

            if (isAdmin && !isOwner)
            {
                var isTargetAdmin = await _dbContext.ProjectMembers
                    .AnyAsync(pm => pm.ProjectId == project.Id && pm.UserId == memberUser.Id && pm.Role == ProjectMemberRole.Admin);

                if (isTargetAdmin)
                    throw new UnauthorizedAccessException("Администратор не может удалять других администраторов");
            }

            if (memberUser.Id == userId)
                throw new InvalidOperationException("Нельзя удалить себя из проекта");

            var member = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == memberUser.Id)
                ?? throw new KeyNotFoundException("Участник не найден");

            var removedUserName = memberUser.Name;
            var removedUserId = memberUser.Id;
            var projectName = project.Name;
            var projectPublicCode = project.PublicCode;

            _dbContext.ProjectMembers.Remove(member);

            await _activity.LogAsync(
                project.Id,
                userId,
                ActivityType.MemberRemoved,
                summary: $"{removedUserName} удалён из проекта",
                link: $"/projects/{project.PublicCode}/dashboard",
                relatedEntityId: removedUserId
            );

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Пользователь {memberEmail} удален из проекта {projectCode} пользователем {userId}");

            await _notificationService.CreateNotificationAsync(
                removedUserId,
                "🚪 Вас удалили из проекта",
                $"Вас удалили из проекта '{projectName}'",
                NotificationType.MemberRemoved,
                $"/projects/{projectPublicCode}",
                project.Id
            );

            var projectMembers = await _dbContext.ProjectMembers
                .Where(pm => pm.ProjectId == project.Id)
                .Include(pm => pm.User)
                .ToListAsync();

            var removerName = currentUser.Name;

            foreach (var pm in projectMembers)
            {
                if (pm.UserId == removedUserId)
                    continue;

                await _notificationService.CreateNotificationAsync(
                    pm.UserId,
                    "👋 Участник удален из проекта",
                    $"{removedUserName} был удален из проекта '{projectName}' пользователем {removerName}",
                    NotificationType.MemberRemoved,
                    $"/projects/{projectPublicCode}/dashboard",
                    project.Id
                );
            }

            _logger.LogInformation("📨 Уведомления об удалении участника отправлены всем участникам проекта");

            return true;
        }

        // ═══════════════════════════════════════════════════════════
        //  ВСПОМОГАТЕЛЬНЫЕ
        // ═══════════════════════════════════════════════════════════

        private async Task<UserProjectStatus> GetUserProjectStatusAsync(Guid projectId, Guid userId)
        {
            var project = await _dbContext.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId);

            if (project != null && project.OwnerId == userId)
                return UserProjectStatus.Owner;

            var member = await _dbContext.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);

            if (member != null)
                return member.Role == ProjectMemberRole.Admin
                    ? UserProjectStatus.Admin
                    : UserProjectStatus.Member;

            var pendingApplication = await _dbContext.Applications
                .FirstOrDefaultAsync(a => a.ProjectId == projectId &&
                                          a.UserId == userId &&
                                          a.Status == ApplicationStatus.Pending);

            if (pendingApplication != null)
                return UserProjectStatus.Pending;

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
                    return formattedCode;
                attempts++;
            }
            throw new InvalidOperationException(
                $"Не удалось сгенерировать уникальный код после {MaxAttempts} попыток");
        }

        // ═══════════════════════════════════════════════════════════
        //  МАППЕР
        // ═══════════════════════════════════════════════════════════

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
                IsArchived = entity.IsArchived,
                ArchivedAt = entity.ArchivedAt,
                ArchivedByName = entity.ArchivedBy?.Name,
                Members = entity.Members.Select(m => new MemberInfo
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