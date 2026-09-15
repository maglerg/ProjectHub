namespace ProjectHub.API.DTOs.VoteDtos
{
    public class VoteDto
    {
        /// id вариантов, за которые голосуем
        public List<Guid> OptionIds { get; set; } = new();
    }
}
