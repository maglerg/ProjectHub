namespace ProjectHub.API.DTOs.TaskDtos
{
    public class RemoveAssigneeDto
    {
        // Email исполнителя, которого нужно снять. Если null — снять себя.
        public string? Email { get; set; }
    }
}
