// DTOs/FriendDto.cs

namespace ProjectHub.API.DTOs.FriendDtos
{

    public class FriendDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsOnline { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime FriendSince { get; set; }
        public string? AvatarUrl { get; set; }
    }
}




