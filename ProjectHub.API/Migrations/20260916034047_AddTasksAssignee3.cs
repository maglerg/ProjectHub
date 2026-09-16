using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTasksAssignee3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskAttachments_ProjectTasks_ProjectTaskId",
                table: "TaskAttachments");

            migrationBuilder.DropIndex(
                name: "IX_TaskAttachments_ProjectTaskId",
                table: "TaskAttachments");

            migrationBuilder.DropColumn(
                name: "ProjectTaskId",
                table: "TaskAttachments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProjectTaskId",
                table: "TaskAttachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskAttachments_ProjectTaskId",
                table: "TaskAttachments",
                column: "ProjectTaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskAttachments_ProjectTasks_ProjectTaskId",
                table: "TaskAttachments",
                column: "ProjectTaskId",
                principalTable: "ProjectTasks",
                principalColumn: "Id");
        }
    }
}
