// ProjectHub.API/Services/IAuthService.cs

using ProjectHub.API.Models;
using ProjectHub.Models;

namespace ProjectHub.API.Services;

public interface IAuthService
{
    string GenerateJwtToken(User user);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}