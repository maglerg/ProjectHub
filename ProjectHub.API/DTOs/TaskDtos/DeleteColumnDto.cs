// DTOs/TaskDtos/DeleteColumnDto.cs

namespace ProjectHub.API.DTOs.TaskDtos
{
    public class DeleteColumnDto
    {
        /// <summary>
        /// Куда перенести задачи из удаляемой колонки.
        /// Обязательно, если в колонке есть задачи.
        /// </summary>
        public Guid? MoveTasksToColumnId { get; set; }
    }
}