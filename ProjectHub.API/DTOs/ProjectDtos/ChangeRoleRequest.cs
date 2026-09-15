// DTOs/ChangeRoleRequest.cs

namespace ProjectHub.API.DTOs.ProjectDtos
{
    public class ChangeRoleRequest
    {
        public string NewRole { get; set; } = string.Empty; // "Admin" или "Member"
    }
}

