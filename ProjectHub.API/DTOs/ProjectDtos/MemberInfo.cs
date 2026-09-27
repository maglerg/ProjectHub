namespace ProjectHub.API.DTOs.ProjectDtos
{
    public class MemberInfo
    {
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
        public string? AvatarUrl { get; set; }

        public bool IsOnline { get; set; }
    }
}
