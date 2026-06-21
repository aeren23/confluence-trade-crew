using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPairManagementSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_favorite",
                table: "pairs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "preferred_symbol",
                table: "user_settings",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "BTC/USDT");

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "is_favorite",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_favorite",
                table: "pairs");

            migrationBuilder.DropColumn(
                name: "preferred_symbol",
                table: "user_settings");
        }
    }
}
