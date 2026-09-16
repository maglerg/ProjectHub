namespace ProjectHub.API.DTOs.TaskDtos
{
    public class ProjectProgressDto
    {
        /// <summary>Прогресс в процентах, 0..100, округлён до 0.1</summary>
        public double ProgressPercent { get; set; }

        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int NotStartedTasks { get; set; }
    }
}