namespace ProjectHub.API.DTOs.FriendDtos
{
    public class FriendRequestStatusDto
    {
        public string Status { get; set; } = string.Empty;  // "None", "Pending", "Friend"
        public Guid? RequestId { get; set; }
        public bool IsFriend { get; set; }
    }
}
