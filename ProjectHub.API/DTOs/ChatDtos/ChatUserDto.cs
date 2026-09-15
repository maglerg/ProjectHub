namespace ProjectHub.API.DTOs.ChatDtos
{
    public class ChatUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public bool IsOnline { get; set; }
    }
}
