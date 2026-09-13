using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProjectHub.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAnonimosVoting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "Votings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "Votings");
        }
    }
}
