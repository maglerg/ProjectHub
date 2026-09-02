// ProjectHub.API/Services/IAuthService.cs

using ProjectHub.API.Models;
using ProjectHub.Models;

namespace ProjectHub.API.Services;

public interface IAuthService
{
    string GenerateJwtToken(User user); // Генерация JWT
    string HashPassword(string password); // Хеширование пароля
    bool VerifyPassword(string password, string hash); // Проверка пароля
}