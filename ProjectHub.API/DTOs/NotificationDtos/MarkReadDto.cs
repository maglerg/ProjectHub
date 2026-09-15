namespace ProjectHub.API.DTOs.NotificationDtos
{
    public class MarkReadDto
    {
        public bool All { get; set; }
        public Guid? NotificationId { get; set; }
    }
}
