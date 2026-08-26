// ProjectHub.API/Services/ITokenService.cs

namespace ProjectHub.API.Services;

public interface ITokenService
{
    string GenerateToken(int userId, string email, string name, string role);
    int? GetUserIdFromToken(string token);
    bool ValidateToken(string token);
}