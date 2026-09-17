namespace ProjectHub.API.DTOs.TaskDtos
{
  
    public class TaskDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        public Guid ColumnId { get; set; }
        public string ColumnName { get; set; } = string.Empty;

        public string CreatedByEmail { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public bool CanEdit { get; set; }

        public bool IsOwner { get; set; }
        public List<TaskAssigneeDto> Assignees { get; set; } = new();

        
        public int AttachmentsCount { get; set; }

        // Может ли текущий пользователь прикреплять файлы (owner или assignee)
        public bool CanUploadAttachments { get; set; }
        public List<TaskAttachmentDto> Attachments { get; set; } = new();
        public List<TaskSubtaskDto> Subtasks { get; set; } = new();
        public bool HasSubtasks { get; set; }
        public int TotalSubtasksCount { get; set; }
        public int CompletedSubtasksCount { get; set; }
        public string Priority { get; set; } = "None";
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }
        public DateTime? ProjectDeadline { get; set; }
        public DateTime? EffectiveDueDate { get; set; }    // ← новое
        public bool IsDueDateFixed { get; set; }            // ← новое
    }
    
    
    
}