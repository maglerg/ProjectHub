// DTOs/TaskDtos/CreateTaskCommentDto.cs — обновить

using System.ComponentModel.DataAnnotations;

public class CreateTaskCommentDto
{
    [Required]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;

    // 🆕 Если это ответ — ID родительского комментария
    public Guid? ParentCommentId { get; set; }

    // 🆕 Если хотим явно указать, кому отвечаем
    //    (например, ответ на ответ — всё равно прикрепится к корню)
    public Guid? ReplyToUserId { get; set; }
}