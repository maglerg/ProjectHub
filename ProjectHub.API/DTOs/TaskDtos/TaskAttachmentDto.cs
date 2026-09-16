namespace ProjectHub.API.DTOs.TaskDtos
{
    public class TaskAttachmentDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public string UploadedByEmail { get; set; } = string.Empty;
        public string UploadedByName { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }

        /// <summary>Может ли текущий пользователь удалить вложение</summary>
        public bool CanDelete { get; set; }
    }
}