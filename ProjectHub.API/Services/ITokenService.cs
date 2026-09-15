// ProjectHub.API/Services/ITokenService.cs

namespace ProjectHub.API.Services;

public interface ITokenService
{
    string GenerateToken(Guid userId, string email, string name, string role);
    Guid? GetUserIdFromToken(string token);
    bool ValidateToken(string token);
}