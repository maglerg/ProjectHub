namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskColumnDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Order { get; set; }
        public string? SystemKey { get; set; }
        public List<TaskDto> Tasks { get; set; } = new();
        /// <summary>Системная колонка — нельзя удалять/переименовывать</summary>
        public bool IsDefault { get; set; }

        /// <summary>Вес колонки в прогрессе проекта (0..1)</summary>
        public double ProgressWeight { get; set; }


        /// <summary>Количество задач в колонке (даже если Tasks не загружены)</summary>
        public int TasksCount { get; set; }
    }
}
