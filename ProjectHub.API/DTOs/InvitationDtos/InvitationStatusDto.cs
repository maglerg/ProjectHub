namespace ProjectHub.API.DTOs.InvitationDtos
{
    public class InvitationStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public Guid? InvitationId { get; set; }
    }
}
