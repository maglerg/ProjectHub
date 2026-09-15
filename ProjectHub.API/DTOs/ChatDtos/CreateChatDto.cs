namespace ProjectHub.API.DTOs.ChatDtos
{
    public class CreateChatDto
    {
        /// Email собеседника (для личного чата)
        public string Email { get; set; } = string.Empty;
    }
}
