// DTOs/UpdateUserDto.cs

namespace ProjectHub.API.DTOs;

public class UpdateUserDto
{
    public string Name { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string? Description { get; set; }
}