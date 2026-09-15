// DTOs/FavoriteDto.cs

namespace ProjectHub.API.DTOs.FavoriteDtos
{
    public class FavoriteDto
    {
        public Guid ProjectId { get; set; }
        public string PublicCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Visibility { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int FavoritesCount { get; set; }
        public bool IsFavorite { get; set; }
    }
}



