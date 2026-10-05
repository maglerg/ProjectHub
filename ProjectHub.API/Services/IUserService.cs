// ProjectHub.API/Services/IUserService.cs

using ProjectHub.API.DTOs.UserDtos;
using ProjectHub.Models;

namespace ProjectHub.API.Services;

public interface IUserService
{
    Task<User?> GetUserByIdAsync(Guid id);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User> CreateUserAsync(User user);
    Task UpdateUserAsync(User user);
    Task<bool> UserExistsAsync(string email);

    Task<UserResponseDto> RegisterUserAsync(RegisterDto dto);
    Task<UserResponseDto> LoginUserAsync(LoginDto dto);
    Task<UserResponseDto> GetCurrentUserAsync(Guid userId);
    Task LogoutUserAsync(Guid userId);

    Task<UserResponseDto> UpdateUserAsync(Guid userId, UpdateUserDto dto);

    // 🆕 Добавлен viewerId — чей контекст
    Task<UserResponseDto?> GetUserProfileByEmailAsync(string email, Guid? viewerId);

    Task<UserResponseDto> UploadAvatarAsync(Guid userId, IFormFile file);
    Task<UserResponseDto> DeleteAvatarAsync(Guid userId);

    Task ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
}