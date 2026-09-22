using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentReplies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentCommentId",
                table: "TaskComments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskComments_ParentCommentId",
                table: "TaskComments",
                column: "ParentCommentId");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskComments_TaskComments_ParentCommentId",
                table: "TaskComments",
                column: "ParentCommentId",
                principalTable: "TaskComments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskComments_TaskComments_ParentCommentId",
                table: "TaskComments");

            migrationBuilder.DropIndex(
                name: "IX_TaskComments_ParentCommentId",
                table: "TaskComments");

            migrationBuilder.DropColumn(
                name: "ParentCommentId",
                table: "TaskComments");
        }
    }
}
