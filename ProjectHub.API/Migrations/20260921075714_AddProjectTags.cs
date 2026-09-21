using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Color = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTags_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProjectTagLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AddedById = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTagLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTagLinks_ProjectTags_TagId",
                        column: x => x.TagId,
                        principalTable: "ProjectTags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectTagLinks_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectTagLinks_Users_AddedById",
                        column: x => x.AddedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTagLinks_AddedById",
                table: "ProjectTagLinks",
                column: "AddedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTagLinks_ProjectId_TagId",
                table: "ProjectTagLinks",
                columns: new[] { "ProjectId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTagLinks_TagId",
                table: "ProjectTagLinks",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTags_CreatedById",
                table: "ProjectTags",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTags_Name",
                table: "ProjectTags",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectTagLinks");

            migrationBuilder.DropTable(
                name: "ProjectTags");
        }
    }
}
