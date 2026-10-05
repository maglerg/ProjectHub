using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSettings1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserNotificationSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    NewMessages = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FriendRequests = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    ProjectInvitations = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    ProjectChanges = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TaskComments = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Votings = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    TaskDeadlines = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    DeadlineDaysBefore = table.Column<int>(type: "integer", nullable: false, defaultValue: 3),
                    Applications = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    DoNotDisturbUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InAppEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    EmailEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserNotificationSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserNotificationSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserNotificationSettings_UserId",
                table: "UserNotificationSettings",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserNotificationSettings");
        }
    }
}
