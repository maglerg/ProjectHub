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

        // Ищем существующий личный чат между двумя пользователями
        var existingChat = await _dbContext.Chats
            .Where(c => c.Type == ChatType.Personal)
            .Include(c => c.Participants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages)
                .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c =>
                c.Participants.Any(p => p.UserId == userId) &&
                c.Participants.Any(p => p.UserId == otherUser.Id));

        if (existingChat != null)
        {
            return await MapChatToDtoAsync(existingChat, userId);
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

        // Добавляем участников
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

        // Перезагружаем с навигационными свойствами
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

        var messages = await _dbContext.ChatMessages
            .Where(m => m.ChatId == chatId && !m.IsDeleted)
            .Include(m => m.Sender)
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        // Отмечаем как прочитанные
        var participant = await _dbContext.ChatParticipants
            .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

        if (participant != null)
        {
            participant.LastReadAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
        }

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

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatId = chatId,
            SenderId = senderId,
            Type = MessageType.Text,
            Text = dto.Text.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.ChatMessages.AddAsync(message);
        chat.LastMessageAt = message.CreatedAt;
        await _dbContext.SaveChangesAsync();

        // Загружаем отправителя
        var sender = await _dbContext.Users.FindAsync(senderId);
        message.Sender = sender!;

        _logger.LogInformation($"Сообщение отправлено в чат {chatId} от {senderId}");

        // 📨 Уведомление всем участникам (кроме отправителя)
        foreach (var participant in chat.Participants.Where(p => p.UserId != senderId))
        {
            await _notificationService.CreateNotificationAsync(
                participant.UserId,
                $"💬 Новое сообщение",
                $"{sender?.Name}: {message.Text?.Substring(0, Math.Min(50, message.Text.Length))}...",
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
            IsDeleted = message.IsDeleted
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