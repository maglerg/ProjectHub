namespace ProjectHub.API.DTOs.VoteDtos
{
    public class CreateVotingDto
    {
        public string Title { get; set; } = string.Empty;
        /// От 2 до 10 вариантов
        public List<string> Options { get; set; } = new();

        public bool IsMultipleChoice { get; set; } = false;
        public bool AllowRevote { get; set; } = false;
        public bool ShowResultsBeforeVote { get; set; } = false;
        public bool IsAnonymous { get; set; } = false;
        public DateTime? EndsAt { get; set; }
    }
}
