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

            // Считаем непрочитанные
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

        // 📌 Проверяем, есть ли уже чат между пользователями
        var existingChat = await _dbContext.Chats
            .Where(c => c.Type == ChatType.Personal)
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c =>
                c.Participants.Any(p => p.UserId == userId) &&
                c.Participants.Any(p => p.UserId == otherUser.Id));

        // 📌 Если чата нет — проверяем настройку приватности получателя
        if (existingChat == null)
        {
            if (otherUser.ChatPrivacy == ChatPrivacy.FriendsOnly)
            {
                // Проверяем, являются ли пользователи друзьями
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

            // Создаем новый чат
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

        // Проверяем, что пользователь является участником
        if (!chat.Participants.Any(p => p.UserId == userId))
            throw new UnauthorizedAccessException("У вас нет доступа к этому чату");

        return await MapChatToDtoAsync(chat, userId);
    }

    // 📌 Получить сообщения чата
    public async Task<List<ChatMessageDto>> GetChatMessagesAsync(Guid chatId, Guid userId, int skip = 0, int take = 50)
    {
        // Проверяем доступ
        var chat = await _dbContext.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == chatId);

        if (chat == null)
            throw new KeyNotFoundException("Чат не найден");

        if (!chat.Participants.Any(p => p.UserId == userId))
            throw new UnauthorizedAccessException("У вас нет доступа к этому чату");

        // 📌 Загружаем сообщения
        var messages = await _dbContext.ChatMessages
            .Where(m => m.ChatId == chatId && !m.IsDeleted)
            .Include(m => m.Sender)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        // 📌 Помечаем все сообщения собеседника как прочитанные
        var unreadMessages = await _dbContext.ChatMessages
            .Where(m => m.ChatId == chatId && m.SenderId != userId && !m.IsRead)
            .ToListAsync();

        if (unreadMessages.Any())
        {
            var now = DateTime.UtcNow;
            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
                msg.ReadAt = now;
            }
        }

        // 📌 Обновляем LastReadAt для текущего пользователя
        var participant = chat.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant != null)
        {
            participant.LastReadAt = DateTime.UtcNow;
        }

        // 📌 Один SaveChanges на всё
        await _dbContext.SaveChangesAsync();

        // 📌 Удаляем уведомления о новых сообщениях в этом чате
        //    (они уже неактуальны — пользователь только что прочитал чат)
        await _notificationService.DeleteChatMessageNotificationsAsync(userId, chatId);

        return messages
            .OrderBy(m => m.CreatedAt)
            .Select(MapMessageToDto)
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

        // Загружаем отправителя
        var sender = await _dbContext.Users.FindAsync(senderId);
        message.Sender = sender!;

        _logger.LogInformation($"Сообщение отправлено в чат {chatId} от {senderId}");

        // 📌 Уведомление всем участникам (кроме отправителя и тех, кто сейчас в чате)
        // Если пользователь читал чат последние N секунд — считаем, что он онлайн в чате
        var activeThreshold = DateTime.UtcNow.AddSeconds(-10); // 10 секунд — окно активности

        foreach (var participant in chat.Participants.Where(p => p.UserId != senderId))
        {
            // 📌 Пропускаем уведомление, если пользователь недавно был в чате
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

        return MapMessageToDto(message);
    }

    // 📌 Вспомогательные методы
    private ChatMessageDto MapMessageToDto(ChatMessage message)
    {
        return new ChatMessageDto
        {
            Id = message.Id,
            ChatId = message.ChatId,
            SenderId = message.SenderId,
            SenderName = message.Sender?.Name ?? string.Empty,
            SenderEmail = message.Sender?.Email ?? string.Empty,
            Type = message.Type.ToString(),
            Text = message.Text,
            AttachmentUrl = message.AttachmentUrl,
            CreatedAt = message.CreatedAt,
            EditedAt = message.EditedAt,
            IsDeleted = message.IsDeleted,
            IsRead = message.IsRead,
            ReadAt = message.ReadAt
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
            UnreadCount = unreadCount
        };
    }
}