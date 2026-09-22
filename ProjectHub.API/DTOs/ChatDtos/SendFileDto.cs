// DTOs/ChatDtos/SendFileDto.cs

namespace ProjectHub.API.DTOs.ChatDtos
{
    public class SendFileDto
    {
        /// <summary>Необязательная подпись к файлу.</summary>
        public string? Caption { get; set; }
    }
}