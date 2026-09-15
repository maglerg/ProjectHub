namespace ProjectHub.API.DTOs.VoteDtos
{
    public class VotingVoterDto
    {
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Specialization { get; set; }
        public DateTime VotedAt { get; set; }
    }

}
