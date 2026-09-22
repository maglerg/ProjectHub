// DTOs/TaskDtos/TaskCommentDto.cs

public class TaskCommentDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;

    public Guid AuthorId { get; set; }
    public string AuthorEmail { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorSpecialization { get; set; }
    public string? AuthorAvatarUrl { get; set; }   // 🆕 если есть

    // 🆕 Ответы
    public Guid? ParentCommentId { get; set; }
    public Guid? ReplyToUserId { get; set; }        // на кого отвечают
    public string? ReplyToUserName { get; set; }    // имя для «@user»

    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }

    public List<TaskCommentDto> Replies { get; set; } = new();
}