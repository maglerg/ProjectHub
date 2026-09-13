// Services/ChatService.cs

using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Data;
using ProjectHub.API.DTOs;
using ProjectHub.API.Models;
using ProjectHub.API.Models.Enums;
using ProjectHub.Models;

namespace ProjectHub.API.Services;

public class ChatService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ChatService> _logger;
    private readonly NotificationService _notificationService;

    public ChatService(
        AppDbContext dbContext,
        ILogger<ChatService> logger,
        NotificationService notificationService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationService = notificationService;
    }

    // 📌 Получить все чаты пользователя
    public async Task<List<ChatListDto>> GetUserChatsAsync(Guid userId)
    {
        var chats = await _dbContext.Chats
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync();

        var result = new List<ChatListDto>();

        foreach (var chat in chats)
        {
            var participant = chat.Participants.FirstOrDefault(p => p.UserId == userId);
            var otherParticipant = chat.Type == ChatType.Personal
                ? chat.Participants.FirstOrDefault(p => p.UserId != userId)
                : null;

            var lastMessage = chat.Messages
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefault();

            var unreadCount = 0;
            if (participant?.LastReadAt != null)
            {
                unreadCount = chat.Messages
                    .Count(m => m.CreatedAt > participant.LastReadAt && m.SenderId != userId && !m.IsDeleted);
            }
            else
            {
                unreadCount = chat.Messages.Count(m => m.SenderId != userId && !m.IsDeleted);
            }

            result.Add(new ChatListDto
            {
                Id = chat.Id,
                Type = chat.Type.ToString(),
                Name = chat.Name,
                OtherUser = otherParticipant != null ? MapUserToDto(otherParticipant.User) : null,
                LastMessage = lastMessage != null ? MapMessageToDto(lastMessage) : null,
                UnreadCount = unreadCount,
                LastMessageAt = chat.LastMessageAt
            });
        }

        return result;
    }

    // 📌 Получить или создать личный чат с пользователем
    public async Task<ChatDto> GetOrCreatePersonalChatAsync(Guid userId, string otherEmail)
    {
        var otherUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == otherEmail);

        if (otherUser == null)
            throw new KeyNotFoundException("Пользователь не найден");

        if (otherUser.Id == userId)
            throw new InvalidOperationException("Нельзя создать чат с самим собой");

        var existingChat = await _dbContext.Chats
            .Where(c => c.Type == ChatType.Personal)
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c =>
                c.Participants.Any(p => p.UserId == userId) &&
                c.Participants.Any(p => p.UserId == otherUser.Id));

        if (existingChat == null)
        {
            if (otherUser.ChatPrivacy == ChatPrivacy.FriendsOnly)
            {
                var isFriend = await _dbContext.Friends
                    .AnyAsync(f => f.UserId == otherUser.Id &&
                                   f.FriendId == userId &&
                                   f.Status == FriendStatus.Accepted);

                if (!isFriend)
                {
                    throw new InvalidOperationException(
                        "Этот пользователь принимает сообщения только от друзей. " +
                        "Отправьте ему заявку в друзья.");
                }
            }

            var chat = new Chat
            {
                Id = Guid.NewGuid(),
                Type = ChatType.Personal,
                CreatedAt = DateTime.UtcNow
            };

            await _dbContext.Chats.AddAsync(chat);
            await _dbContext.SaveChangesAsync();

            var participants = new List<ChatParticipant>
            {
                new ChatParticipant
                {
                    Id = Guid.NewGuid(),
                    ChatId = chat.Id,
                    UserId = userId,
                    JoinedAt = DateTime.UtcNow
                },
                new ChatParticipant
                {
                    Id = Guid.NewGuid(),
                    ChatId = chat.Id,
                    UserId = otherUser.Id,
                    JoinedAt = DateTime.UtcNow
                }
            };

            await _dbContext.ChatParticipants.AddRangeAsync(participants);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation($"Создан личный чат {chat.Id} между {userId} и {otherUser.Id}");

            var createdChat = await _dbContext.Chats
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Sender)
                .FirstAsync(c => c.Id == chat.Id);

            return await MapChatToDtoAsync(createdChat, userId);
        }

        return await MapChatToDtoAsync(existingChat, userId);
    }

    // 📌 Получить или создать чат проекта по публичному коду
    public async Task<ChatDto> GetOrCreateProjectChatByCodeAsync(string publicCode, Guid userId)
    {
        var project = await _dbContext.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.PublicCode == publicCode);

        if (project == null)
            throw new KeyNotFoundException("Проект не найден");

        var isMember = project.OwnerId == userId ||
                       project.Members.Any(m => m.UserId == userId);

        if (!isMember)
            throw new UnauthorizedAccessException("Вы не участник этого проекта");

        var existingChat = await _dbContext.Chats
            .Where(c => c.Type == ChatType.Project && c.ProjectId == project.Id)
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync();

        if (existingChat != null)
            return await MapChatToDtoAsync(existingChat, userId);

        // Создаём чат
        var chat = new Chat
        {
            Id = Guid.NewGuid(),
            Type = ChatType.Project,
            ProjectId = project.Id,
            Name = project.Name,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Chats.AddAsync(chat);
        await _dbContext.SaveChangesAsync();

        // Все участники проекта + владелец
        var participantIds = new HashSet<Guid> { project.OwnerId };
        foreach (var m in project.Members)
            participantIds.Add(m.UserId);

        var participants = participantIds.Select(uid => new ChatParticipant
        {
            Id = Guid.NewGuid(),
            ChatId = chat.Id,
            UserId = uid,
            JoinedAt = DateTime.UtcNow
        }).ToList();

        await _dbContext.ChatParticipants.AddRangeAsync(participants);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation($"Создан чат проекта {chat.Id} для проекта {project.Id} ({publicCode})");

        var createdChat = await _dbContext.Chats
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .FirstAsync(c => c.Id == chat.Id);

        return await MapChatToDtoAsync(createdChat, userId);
    }

    // 📌 Получить чат по ID
    public async Task<ChatDto> GetChatByIdAsync(Guid chatId, Guid userId)
    {
        var chat = await _dbContext.Chats
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c => c.Id == chatId);

        if (chat == null)
            throw new KeyNotFoundException("Чат не найден");

        if (!chat.Participants.Any(p => p.UserId == userId))
            throw new UnauthorizedAccessException("У вас нет доступа к этому чату");

        return await MapChatToDtoAsync(chat, userId);
    }

    // 📌 Получить сообщения чата
    public async Task<List<ChatMessageDto>> GetChatMessagesAsync(Guid chatId, Guid userId, int skip = 0, int take = 50)
    {
        var chat = await _dbContext.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == chatId);

        if (chat == null)
            throw new KeyNotFoundException("Чат не найден");

        if (!chat.Participants.Any(p => p.UserId == userId))
            throw new UnauthorizedAccessException("У вас нет доступа к этому чату");

        // 📌 Загружаем сообщения с прочтениями
        var messages = await _dbContext.ChatMessages
            .Where(m => m.ChatId == chatId && !m.IsDeleted)
            .Include(m => m.Sender)
            .Include(m => m.Reads)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        // 📌 Помечаем непрочитанные как прочитанные текущим пользователем
        var unreadMessages = await _dbContext.ChatMessages
            .Where(m => m.ChatId == chatId && m.SenderId != userId && !m.IsDeleted)
            .Where(m => !m.Reads.Any(r => r.UserId == userId))
            .ToListAsync();

        if (unreadMessages.Any())
        {
            var now = DateTime.UtcNow;
            var reads = unreadMessages.Select(m => new ChatMessageRead
            {
                Id = Guid.NewGuid(),
                ChatMessageId = m.Id,
                UserId = userId,
                ReadAt = now
            }).ToList();

            await _dbContext.ChatMessageReads.AddRangeAsync(reads);

            // Для личных чатов — поддерживаем старые поля
            if (chat.Type == ChatType.Personal)
            {
                foreach (var msg in unreadMessages)
                {
                    msg.IsRead = true;
                    msg.ReadAt = now;
                }
            }
        }

        var participant = chat.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant != null)
            participant.LastReadAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        await _notificationService.DeleteChatMessageNotificationsAsync(userId, chatId);

        // 📌 Роли отправителей (для группового чата)
        var senderRoles = await GetSenderRolesForChatAsync(chat);
        var totalParticipants = chat.Participants.Count;

        return messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => MapMessageToDto(m, senderRoles, totalParticipants))
            .ToList();
    }

    // 📌 Отправить сообщение
    public async Task<ChatMessageDto> SendMessageAsync(Guid chatId, Guid senderId, SendMessageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            throw new InvalidOperationException("Сообщение не может быть пустым");

        var chat = await _dbContext.Chats
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.Id == chatId);

        if (chat == null)
            throw new KeyNotFoundException("Чат не найден");

        if (!chat.Participants.Any(p => p.UserId == senderId))
            throw new UnauthorizedAccessException("У вас нет доступа к этому чату");

        if (chat.Type == ChatType.Personal)
        {
            var otherParticipant = chat.Participants.FirstOrDefault(p => p.UserId != senderId);
            if (otherParticipant != null)
            {
                var otherUser = otherParticipant.User;

                if (otherUser.ChatPrivacy == ChatPrivacy.FriendsOnly)
                {
                    var isFriend = await _dbContext.Friends
                        .AnyAsync(f => f.UserId == otherUser.Id &&
                                       f.FriendId == senderId &&
                                       f.Status == FriendStatus.Accepted);

                    if (!isFriend)
                    {
                        throw new InvalidOperationException(
                            $"Пользователь {otherUser.Name} принимает сообщения только от друзей. " +
                            $"Отправьте заявку в друзья, чтобы начать общение.");
                    }
                }
            }
        }

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatId = chatId,
            SenderId = senderId,
            Type = MessageType.Text,
            Text = dto.Text.Trim(),
            CreatedAt = DateTime.UtcNow,
            IsRead = false,
            ReadAt = null
        };

        await _dbContext.ChatMessages.AddAsync(message);
        chat.LastMessageAt = message.CreatedAt;
        await _dbContext.SaveChangesAsync();

        var sender = await _dbContext.Users.FindAsync(senderId);
        message.Sender = sender!;

        _logger.LogInformation($"Сообщение отправлено в чат {chatId} от {senderId}");

        // 📌 Уведомления
        var activeThreshold = DateTime.UtcNow.AddSeconds(-10);

        foreach (var participant in chat.Participants.Where(p => p.UserId != senderId))
        {
            if (participant.LastReadAt.HasValue && participant.LastReadAt.Value >= activeThreshold)
            {
                _logger.LogInformation($"Пользователь {participant.UserId} активен в чате — уведомление не отправлено");
                continue;
            }

            await _notificationService.CreateNotificationAsync(
                participant.UserId,
                $"💬 Новое сообщение",
                $"{sender?.Name}: {(message.Text?.Length > 50 ? message.Text.Substring(0, 50) + "..." : message.Text)}",
                NotificationType.NewMessage,
                $"/chats/{chatId}",
                chatId
            );
        }

        // 📌 Роли и количество участников
        var senderRoles = await GetSenderRolesForChatAsync(chat);
        var totalParticipants = chat.Participants.Count;

        return MapMessageToDto(message, senderRoles, totalParticipants);
    }

    // 📌 Вспомогательные методы
    private ChatMessageDto MapMessageToDto(
        ChatMessage message,
        Dictionary<Guid, string>? senderRoles = null,
        int totalParticipants = 0)
    {
        string? role = null;
        if (senderRoles != null && senderRoles.TryGetValue(message.SenderId, out var r))
            role = r;

        var readUserIds = message.Reads?.Select(r => r.UserId).ToHashSet() ?? new HashSet<Guid>();
        int readCount = readUserIds.Count;

        bool isReadByAll;
        if (totalParticipants > 1)
        {
            // Считаем, что отправитель тоже "прочитал" своё сообщение
            readUserIds.Add(message.SenderId);
            isReadByAll = readUserIds.Count >= totalParticipants;
        }
        else
        {
            isReadByAll = message.IsRead;
        }

        return new ChatMessageDto
        {
            Id = message.Id,
            ChatId = message.ChatId,
            SenderId = message.SenderId,
            SenderName = message.Sender?.Name ?? string.Empty,
            SenderEmail = message.Sender?.Email ?? string.Empty,
            SenderRole = role,
            Type = message.Type.ToString(),
            Text = message.Text,
            AttachmentUrl = message.AttachmentUrl,
            CreatedAt = message.CreatedAt,
            EditedAt = message.EditedAt,
            IsDeleted = message.IsDeleted,
            IsRead = message.IsRead,
            ReadAt = message.ReadAt,
            IsReadByAll = isReadByAll,
            ReadCount = readCount,
            TotalParticipants = totalParticipants
        };
    }

    private ChatUserDto MapUserToDto(User user)
    {
        return new ChatUserDto
        {
            Name = user.Name,
            Email = user.Email,
            Specialization = user.Specialization.ToString(),
            IsOnline = user.IsOnline
        };
    }

    private async Task<ChatDto> MapChatToDtoAsync(Chat chat, Guid currentUserId)
    {
        var participant = chat.Participants.FirstOrDefault(p => p.UserId == currentUserId);
        var otherParticipant = chat.Type == ChatType.Personal
            ? chat.Participants.FirstOrDefault(p => p.UserId != currentUserId)
            : null;

        var lastMessage = chat.Messages
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefault();

        var unreadCount = 0;
        if (participant?.LastReadAt != null)
        {
            unreadCount = chat.Messages
                .Count(m => m.CreatedAt > participant.LastReadAt && m.SenderId != currentUserId && !m.IsDeleted);
        }
        else
        {
            unreadCount = chat.Messages.Count(m => m.SenderId != currentUserId && !m.IsDeleted);
        }

        return new ChatDto
        {
            Id = chat.Id,
            Type = chat.Type.ToString(),
            Name = chat.Name,
            ProjectId = chat.ProjectId,
            CreatedAt = chat.CreatedAt,
            LastMessageAt = chat.LastMessageAt,
            OtherUser = otherParticipant != null ? MapUserToDto(otherParticipant.User) : null,
            LastMessage = lastMessage != null ? MapMessageToDto(lastMessage) : null,
            UnreadCount = unreadCount,
            ParticipantsCount = chat.Participants.Count
        };
    }

    // 📌 Роли участников в проекте
    private async Task<Dictionary<Guid, string>> GetSenderRolesForChatAsync(Chat chat)
    {
        if (chat.Type != ChatType.Project || chat.ProjectId == null)
            return new Dictionary<Guid, string>();

        var project = await _dbContext.Projects
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == chat.ProjectId);

        if (project == null)
            return new Dictionary<Guid, string>();

        var roles = new Dictionary<Guid, string>();

        roles[project.OwnerId] = "Owner";

        foreach (var m in project.Members)
        {
            roles[m.UserId] = m.Role.ToString();
        }

        return roles;
    }
}