using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddVotingToProject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Votings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsMultipleChoice = table.Column<bool>(type: "boolean", nullable: false),
                    AllowRevote = table.Column<bool>(type: "boolean", nullable: false),
                    ShowResultsBeforeVote = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsClosed = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Votings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Votings_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Votings_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VotingOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VotingId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VotingOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VotingOptions_Votings_VotingId",
                        column: x => x.VotingId,
                        principalTable: "Votings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VotingVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VotingId = table.Column<Guid>(type: "uuid", nullable: false),
                    VotingOptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VotedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VotingVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VotingVotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VotingVotes_VotingOptions_VotingOptionId",
                        column: x => x.VotingOptionId,
                        principalTable: "VotingOptions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_VotingVotes_Votings_VotingId",
                        column: x => x.VotingId,
                        principalTable: "Votings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VotingOptions_VotingId",
                table: "VotingOptions",
                column: "VotingId");

            migrationBuilder.CreateIndex(
                name: "IX_Votings_CreatedById",
                table: "Votings",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Votings_ProjectId",
                table: "Votings",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_VotingVotes_UserId",
                table: "VotingVotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VotingVotes_VotingId_UserId_VotingOptionId",
                table: "VotingVotes",
                columns: new[] { "VotingId", "UserId", "VotingOptionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VotingVotes_VotingOptionId",
                table: "VotingVotes",
                column: "VotingOptionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VotingVotes");

            migrationBuilder.DropTable(
                name: "VotingOptions");

            migrationBuilder.DropTable(
                name: "Votings");
        }
    }
}
