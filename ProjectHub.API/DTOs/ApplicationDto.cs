// DTOs/ApplicationDto.cs

using ProjectHub.API.Models.Enums;

namespace ProjectHub.API.DTOs;

public class CreateApplicationDto
{
    public string? Message { get; set; }
}

public class ApplicationResponseDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string? UserSpecialization { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class ApplicationActionDto
{
    public bool Approve { get; set; }
    public string? Message { get; set; }
}