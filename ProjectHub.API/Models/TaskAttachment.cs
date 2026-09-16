using ProjectHub.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjectHub.API.Models
{
    [Table("TaskAttachments")]
    public class TaskAttachment
    {
        [Key]
        public Guid Id { get; set; }

        public Guid TaskId { get; set; }

        [ForeignKey(nameof(TaskId))]
        public virtual ProjectTask Task { get; set; } = null!;

        public Guid UploadedById { get; set; }

        [ForeignKey(nameof(UploadedById))]
        public virtual User UploadedBy { get; set; } = null!;

        /// <summary>Оригинальное имя файла, которое видит пользователь</summary>
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>Уникальное имя файла на диске (Guid + расширение)</summary>
        [Required]
        [MaxLength(255)]
        public string StoredFileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ContentType { get; set; } = string.Empty;

        public long SizeBytes { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}