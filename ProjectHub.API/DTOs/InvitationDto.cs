// DTOs/InvitationDto.cs

namespace ProjectHub.API.DTOs;

public class CreateInvitationDto
{
    public string Email { get; set; } = string.Empty;
    public string? Message { get; set; }
}

public class InvitationResponseDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectCode { get; set; } = string.Empty;
    public Guid InviterId { get; set; }
    public string InviterName { get; set; } = string.Empty;
    public string InviterEmail { get; set; } = string.Empty;
    public Guid InviteeId { get; set; }
    public string InviteeName { get; set; } = string.Empty;
    public string InviteeEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class InvitationActionDto
{
    public bool Accept { get; set; }
    public string? Message { get; set; }
}

public class InvitationStatusDto
{
    public string Status { get; set; } = string.Empty;
    public Guid? InvitationId { get; set; }
}