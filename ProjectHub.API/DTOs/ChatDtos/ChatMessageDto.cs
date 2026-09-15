namespace ProjectHub.API.DTOs.ChatDtos
{
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

        // сколько прочитало / всего (для отладки/UI)
        public int ReadCount { get; set; }
        public int TotalParticipants { get; set; }
    }
}
