// DTOs/ChatDto.cs

namespace ProjectHub.API.DTOs;

public class ChatDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Name { get; set; }
    public Guid? ProjectId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }

    /// <summary>
    /// Для личных чатов — информация о собеседнике
    /// </summary>
    public ChatUserDto? OtherUser { get; set; }

    /// <summary>
    /// Последнее сообщение (для превью в списке чатов)
    /// </summary>
    public ChatMessageDto? LastMessage { get; set; }

    /// <summary>
    /// Количество непрочитанных сообщений
    /// </summary>
    public int UnreadCount { get; set; }
    public int ParticipantsCount { get; set; }
}

public class ChatUserDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
}

public class ChatMessageDto
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string Type { get; set; } = "Text";
    public string? Text { get; set; }
    public string? AttachmentUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? SenderRole { get; set; } // роль отправителя в проекте
    public bool IsReadByAll { get; set; }

    // 📌 НОВОЕ: сколько прочитало / всего (для отладки/UI)
    public int ReadCount { get; set; }
    public int TotalParticipants { get; set; }
}

public class SendMessageDto
{
    public string Text { get; set; } = string.Empty;
}

public class CreateChatDto
{
    /// <summary>
    /// Email собеседника (для личного чата)
    /// </summary>
    public string Email { get; set; } = string.Empty;
}

public class ChatListDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Name { get; set; }
    public ChatUserDto? OtherUser { get; set; }
    public ChatMessageDto? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public DateTime? LastMessageAt { get; set; }
}