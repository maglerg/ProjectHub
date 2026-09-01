// Server/DTOs/UserResponseDto.cs

using ProjectHub.Models.Enums;

namespace ProjectHub.DTOs;

public class UserResponseDto
{
    public Guid Id { get; set; } // потом убрать отправку айди
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsOnline { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Token { get; set; } // JWT токен (для ответа на логин)
    public int ProjectsCount { get; set; }
    public int CompletedProjectsCount { get; set; }
}