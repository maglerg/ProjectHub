namespace ProjectHub.API.DTOs.TaskDtos
{
    public class CreateTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        // Опционально: в какую колонку. Если null — первая колонка "Не начато".
        public Guid? ColumnId { get; set; }
    }

}
