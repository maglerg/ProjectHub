// DTOs/UserDtos/ChangePasswordDto.cs

using System.ComponentModel.DataAnnotations;

namespace ProjectHub.API.DTOs.UserDtos;

public class ChangePasswordDto
{
    [Required(ErrorMessage = "Укажите текущий пароль")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите новый пароль")]
    [MinLength(6, ErrorMessage = "Пароль должен содержать минимум 6 символов")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Повторите новый пароль")]
    public string ConfirmPassword { get; set; } = string.Empty;
}