using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTasksProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "ProgressWeight",
                table: "TaskColumns",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            // 📌 Проставляем веса для уже существующих системных колонок
            migrationBuilder.Sql(@"
                UPDATE ""TaskColumns""
                SET ""ProgressWeight"" = CASE
                    WHEN ""SystemKey"" = 'Completed'  THEN 1.0
                    WHEN ""SystemKey"" = 'InProgress' THEN 0.5
                    ELSE 0.0
                END
                WHERE ""SystemKey"" IS NOT NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProgressWeight",
                table: "TaskColumns");
        }
    }
}