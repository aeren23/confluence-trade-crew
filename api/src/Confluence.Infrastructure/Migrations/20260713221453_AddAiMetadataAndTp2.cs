using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiMetadataAndTp2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TakeProfit2",
                table: "trades",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HtfAlignment",
                table: "analyses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LiquidityPoolBias",
                table: "analyses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TradeMode",
                table: "analyses",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 7, 13, 22, 14, 52, 558, DateTimeKind.Utc).AddTicks(504));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 7, 13, 22, 14, 52, 558, DateTimeKind.Utc).AddTicks(508));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 7, 13, 22, 14, 52, 558, DateTimeKind.Utc).AddTicks(1022));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TakeProfit2",
                table: "trades");

            migrationBuilder.DropColumn(
                name: "HtfAlignment",
                table: "analyses");

            migrationBuilder.DropColumn(
                name: "LiquidityPoolBias",
                table: "analyses");

            migrationBuilder.DropColumn(
                name: "TradeMode",
                table: "analyses");

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 29, 12, 12, 42, 99, DateTimeKind.Utc).AddTicks(8175));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 29, 12, 12, 42, 99, DateTimeKind.Utc).AddTicks(8178));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 6, 29, 12, 12, 42, 99, DateTimeKind.Utc).AddTicks(8331));
        }
    }
}
