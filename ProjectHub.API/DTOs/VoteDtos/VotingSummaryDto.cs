namespace ProjectHub.API.DTOs.VoteDtos
{
    public class VotingSummaryDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsClosed { get; set; }
        public bool IsExpired { get; set; }
        public bool HasVoted { get; set; }
    }
}
