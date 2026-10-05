// DTOs/NotificationDtos/DoNotDisturbDto.cs

namespace ProjectHub.API.DTOs.NotificationDtos;

/// <summary>
/// Запрос на включение/выключение «Не беспокоить».
/// Duration: "off" | "hour" | "untilMorning" | "day" | "week"
/// </summary>
public class DoNotDisturbDto
{
    /// <summary>Один из вариантов: off, hour, untilMorning, day, week.</summary>
    public string Duration { get; set; } = "off";
}