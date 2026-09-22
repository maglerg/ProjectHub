// DTOs/TaskDtos/ReorderColumnsDto.cs

namespace ProjectHub.API.DTOs.TaskDtos
{
    public class ReorderColumnsDto
    {
        public List<ColumnOrderItem> Orders { get; set; } = new();
    }

    public class ColumnOrderItem
    {
        public Guid ColumnId { get; set; }
        public int Order { get; set; }
    }
}