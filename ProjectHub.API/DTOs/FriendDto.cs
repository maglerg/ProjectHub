// DTOs/FriendDto.cs

namespace ProjectHub.API.DTOs;

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
}

public class FriendRequestDto
{
    public string Email { get; set; } = string.Empty;  // Email друга
}

public class FriendResponseDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public FriendDto? Friend { get; set; }
}