using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTagsToTrades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "tags",
                table: "trades",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "tags",
                table: "trades");
        }
    }
}
