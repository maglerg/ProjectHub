// ProjectHub.API/Services/IUserService.cs

using ProjectHub.API.Models;
using ProjectHub.Models;

namespace ProjectHub.API.Services;

public interface IUserService
{
    Task<User?> GetUserByIdAsync(Guid id);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User> CreateUserAsync(User user);
    Task UpdateUserAsync(User user);
    Task<bool> UserExistsAsync(string email);
}