namespace ProjectHub.API.DTOs.InvitationDtos
{
    public class CreateInvitationDto
    {
        public string Email { get; set; } = string.Empty;
        public string? Message { get; set; }
    }
}
