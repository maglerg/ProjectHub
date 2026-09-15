namespace ProjectHub.API.DTOs.VoteDtos
{
    public class VotingOptionDto
    {
        public Guid Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public int Order { get; set; }
        public int VotesCount { get; set; }
        /// Процент от числа проголосовавших
        public double Percent { get; set; }
        /// Проголосовал ли текущий пользователь за этот вариант
        public bool IsSelectedByCurrentUser { get; set; }
        // список проголосовавших за этот вариант
        public List<VotingVoterDto> Voters { get; set; } = new();
    }
}
