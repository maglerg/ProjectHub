// Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Models;
using ProjectHub.Models;

namespace ProjectHub.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<ProjectMember> ProjectMembers { get; set; }
        public DbSet<Application> Applications { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Favorite> Favorites { get; set; }
        public DbSet<Friend> Friends { get; set; }
        public DbSet<FriendRequest> FriendRequests { get; set; }
        public DbSet<Invitation> Invitations { get; set; }
        public DbSet<Chat> Chats { get; set; }
        public DbSet<ChatParticipant> ChatParticipants { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatMessageRead> ChatMessageReads { get; set; }
        public DbSet<Voting> Votings { get; set; }
        public DbSet<VotingOption> VotingOptions { get; set; }
        public DbSet<VotingVote> VotingVotes { get; set; }

        public DbSet<ProjectTask> ProjectTasks { get; set; }
        public DbSet<TaskAssignee> TaskAssignees { get; set; }
        public DbSet<TaskColumn> TaskColumns { get; set; }
        public DbSet<TaskComment> TaskComments { get; set; }
        public DbSet<TaskCommentRead> TaskCommentReads { get; set; }
        public DbSet<TaskAttachment> TaskAttachments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Уникальный email
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Связь Project -> User (Owner)
            modelBuilder.Entity<Project>()
                .HasOne(p => p.Owner)
                .WithMany(u => u.OwnedProjects)
                .HasForeignKey(p => p.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Связь ProjectMember -> User
            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.User)
                .WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Связь ProjectMember -> Project
            modelBuilder.Entity<ProjectMember>()
                .HasOne(pm => pm.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // Уникальная пара (ProjectId, UserId)
            modelBuilder.Entity<ProjectMember>()
                .HasIndex(pm => new { pm.ProjectId, pm.UserId })
                .IsUnique();
            // Уникальная пара (ProjectId, UserId) для заявок
            modelBuilder.Entity<Application>()
                .HasIndex(a => new { a.ProjectId, a.UserId })
                .IsUnique();
            modelBuilder.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.ProjectId })
            .IsUnique();
            modelBuilder.Entity<Friend>()
           .HasIndex(f => new { f.UserId, f.FriendId })
           .IsUnique();
            modelBuilder.Entity<Invitation>()
           .HasIndex(i => new { i.ProjectId, i.InviteeId })
           .IsUnique();
            // Уникальная пара (SenderId, ReceiverId) для заявок
            modelBuilder.Entity<FriendRequest>()
                .HasIndex(fr => new { fr.SenderId, fr.ReceiverId })
                .IsUnique();
            // Уникальная пара (ChatId, UserId) для участников
            modelBuilder.Entity<ChatParticipant>()
                .HasIndex(cp => new { cp.ChatId, cp.UserId })
                .IsUnique();
            modelBuilder.Entity<ChatMessageRead>()
    .HasIndex(r => new { r.ChatMessageId, r.UserId })
    .IsUnique();

            modelBuilder.Entity<Project>(entity =>
            {
                // Первичный ключ
                entity.HasKey(e => e.Id);

                // Настройка полей
                entity.Property(e => e.Id)
                    .HasDefaultValueSql("gen_random_uuid()");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.Property(e => e.PublicCode)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.UpdatedAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                // Индексы
                entity.HasIndex(e => e.PublicCode)
                    .IsUnique()
                    .HasDatabaseName("IX_Projects_PublicCode");

                entity.HasIndex(e => e.Category)
                    .HasDatabaseName("IX_Projects_Category");

                entity.HasIndex(e => e.Visibility)
                    .HasDatabaseName("IX_Projects_Visibility");
            });
            // 📌 Уникальность голоса: один пользователь — один вариант на голосование
            modelBuilder.Entity<VotingVote>()
                .HasIndex(v => new { v.VotingId, v.UserId, v.VotingOptionId })
                .IsUnique();

            // 📌 Каскадное удаление опций
            modelBuilder.Entity<Voting>()
                .HasMany(v => v.Options)
                .WithOne(o => o.Voting)
                .HasForeignKey(o => o.VotingId)
                .OnDelete(DeleteBehavior.Cascade);

            // 📌 Каскадное удаление голосов при удалении голосования
            modelBuilder.Entity<Voting>()
                .HasMany(v => v.Votes)
                .WithOne(v => v.Voting)
                .HasForeignKey(v => v.VotingId)
                .OnDelete(DeleteBehavior.Cascade);

            // 📌 Голоса привязываются к опции
            modelBuilder.Entity<VotingOption>()
                .HasMany(o => o.Votes)
                .WithOne(v => v.VotingOption)
                .HasForeignKey(v => v.VotingOptionId)
                .OnDelete(DeleteBehavior.NoAction); // чтобы не было конфликта каскадов
                                                    // ───── Колонки задач ─────
            modelBuilder.Entity<TaskColumn>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(c => c.Project)
                      .WithMany()
                      .HasForeignKey(c => c.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(c => new { c.ProjectId, c.Order });
                entity.Property(c => c.ProgressWeight)
          .HasDefaultValue(0.0);
            });

            // ───── Задачи ─────
            modelBuilder.Entity<ProjectTask>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(t => t.Project)
                      .WithMany()
                      .HasForeignKey(t => t.ProjectId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(t => t.Column)
                      .WithMany(c => c.Tasks)
                      .HasForeignKey(t => t.ColumnId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.CreatedBy)
                      .WithMany()
                      .HasForeignKey(t => t.CreatedById)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ───── Исполнители ─────
            modelBuilder.Entity<TaskAssignee>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(a => a.Task)
                      .WithMany(t => t.Assignees)
                      .HasForeignKey(a => a.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(a => a.User)
                      .WithMany()
                      .HasForeignKey(a => a.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Один пользователь — одна запись на задачу
                entity.HasIndex(a => new { a.TaskId, a.UserId }).IsUnique();
            });
            modelBuilder.Entity<TaskComment>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(c => c.Task)
                      .WithMany(t => t.Comments)
                      .HasForeignKey(c => c.TaskId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(c => c.Author)
                      .WithMany()
                      .HasForeignKey(c => c.AuthorId)
                      .OnDelete(DeleteBehavior.Restrict); // чтобы нельзя было случайно удалить автора вместе с комментариями

                entity.HasIndex(c => new { c.TaskId, c.CreatedAt });
            });
            modelBuilder.Entity<TaskCommentRead>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(r => r.TaskComment)
                      .WithMany()
                      .HasForeignKey(r => r.TaskCommentId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(r => r.User)
                      .WithMany()
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(r => new { r.TaskCommentId, r.UserId }).IsUnique();
            });
            modelBuilder.Entity<TaskAttachment>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(a => a.Task)
                      .WithMany(t => t.Attachments)   
                      .HasForeignKey(a => a.TaskId)   
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(a => a.UploadedBy)
                      .WithMany()
                      .HasForeignKey(a => a.UploadedById)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(a => a.TaskId);
            });
        }
    }
}