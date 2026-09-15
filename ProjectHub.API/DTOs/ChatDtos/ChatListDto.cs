namespace ProjectHub.API.DTOs.ChatDtos
{
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
}
