using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSnapshotsAndExecutionQuality : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "entry_slippage_pct",
                table: "trades",
                type: "numeric(10,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entry_snapshot_url",
                table: "trades",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "execution_quality",
                table: "trades",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "exit_snapshot_url",
                table: "trades",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "planned_entry_price",
                table: "trades",
                type: "numeric(20,8)",
                nullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "entry_slippage_pct",
                table: "trades");

            migrationBuilder.DropColumn(
                name: "entry_snapshot_url",
                table: "trades");

            migrationBuilder.DropColumn(
                name: "execution_quality",
                table: "trades");

            migrationBuilder.DropColumn(
                name: "exit_snapshot_url",
                table: "trades");

            migrationBuilder.DropColumn(
                name: "planned_entry_price",
                table: "trades");

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 29, 11, 30, 25, 18, DateTimeKind.Utc).AddTicks(2654));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 29, 11, 30, 25, 18, DateTimeKind.Utc).AddTicks(2657));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 6, 29, 11, 30, 25, 18, DateTimeKind.Utc).AddTicks(2833));
        }
    }
}
