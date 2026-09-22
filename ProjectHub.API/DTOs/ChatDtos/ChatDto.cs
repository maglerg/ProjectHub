// DTOs/ChatDto.cs

namespace ProjectHub.API.DTOs.ChatDtos
{
    public class ChatDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Name { get; set; }
        public Guid? ProjectId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastMessageAt { get; set; }
        // Для личных чатов — информация о собеседнике
        public ChatUserDto? OtherUser { get; set; }
        /// Последнее сообщение (для превью в списке чатов)
        public ChatMessageDto? LastMessage { get; set; }
        /// Количество непрочитанных сообщений
        public int UnreadCount { get; set; }
        public int ParticipantsCount { get; set; }
        // 🆕 Обложка чата. Для Project-чатов = coverImageUrl проекта;
        //    для Personal — null (там показывается аватар собеседника).
        public string? CoverImageUrl { get; set; }

        // 🆕 PublicCode проекта — чтобы фронт мог строить fallback-инициалы
        //    и понимать, к какому проекту чат относится.
        public string? ProjectPublicCode { get; set; }
    }
}


