using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAccuracyTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HitEntry",
                table: "analysis_accuracies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HitStopLoss",
                table: "analysis_accuracies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HitTakeProfit1",
                table: "analysis_accuracies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HitTakeProfit2",
                table: "analysis_accuracies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 7, 13, 22, 58, 54, 465, DateTimeKind.Utc).AddTicks(977));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 7, 13, 22, 58, 54, 465, DateTimeKind.Utc).AddTicks(989));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 7, 13, 22, 58, 54, 465, DateTimeKind.Utc).AddTicks(3999));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HitEntry",
                table: "analysis_accuracies");

            migrationBuilder.DropColumn(
                name: "HitStopLoss",
                table: "analysis_accuracies");

            migrationBuilder.DropColumn(
                name: "HitTakeProfit1",
                table: "analysis_accuracies");

            migrationBuilder.DropColumn(
                name: "HitTakeProfit2",
                table: "analysis_accuracies");

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
    }
}
