// Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using ProjectHub.API.Models;

namespace ProjectHub.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<ProjectEntity> Projects { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ProjectEntity>(entity =>
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