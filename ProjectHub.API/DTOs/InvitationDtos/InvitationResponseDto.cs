// DTOs/InvitationDto.cs

namespace ProjectHub.API.DTOs.InvitationDtos
{
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
        public string? InviterAvatarUrl { get; set; }
        public string? InviteeAvatarUrl { get; set; }
        public DateTime? ProcessedAt { get; set; }
    }
}



