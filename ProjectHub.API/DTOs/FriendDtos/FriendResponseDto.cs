namespace ProjectHub.API.DTOs.FriendDtos
{
    public class FriendResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public FriendDto? Friend { get; set; }
    }
}
