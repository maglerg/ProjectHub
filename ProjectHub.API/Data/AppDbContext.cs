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
        }
    }
}