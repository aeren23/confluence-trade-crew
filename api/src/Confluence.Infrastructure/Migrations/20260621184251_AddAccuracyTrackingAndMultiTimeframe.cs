using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAccuracyTrackingAndMultiTimeframe : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "confluence_alignment",
                table: "analyses",
                type: "character varying(15)",
                maxLength: 15,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "confluence_score",
                table: "analyses",
                type: "numeric(4,3)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "timeframes_analyzed",
                table: "analyses",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "analysis_accuracies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    analysis_id = table.Column<Guid>(type: "uuid", nullable: false),
                    check_interval = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    price_at_check = table.Column<decimal>(type: "numeric(20,8)", nullable: false),
                    price_change_pct = table.Column<decimal>(type: "numeric(10,4)", nullable: false),
                    predicted_direction = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    is_accurate = table.Column<bool>(type: "boolean", nullable: false),
                    was_missed_opportunity = table.Column<bool>(type: "boolean", nullable: false),
                    potential_pnl_pct = table.Column<decimal>(type: "numeric(10,4)", nullable: true),
                    checked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analysis_accuracies", x => x.id);
                    table.ForeignKey(
                        name: "FK_analysis_accuracies_analyses_analysis_id",
                        column: x => x.analysis_id,
                        principalTable: "analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 21, 18, 42, 50, 257, DateTimeKind.Utc).AddTicks(3227));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 21, 18, 42, 50, 257, DateTimeKind.Utc).AddTicks(3230));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 6, 21, 18, 42, 50, 257, DateTimeKind.Utc).AddTicks(3398));

            migrationBuilder.CreateIndex(
                name: "IX_analysis_accuracies_analysis_id_check_interval",
                table: "analysis_accuracies",
                columns: new[] { "analysis_id", "check_interval" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_analysis_accuracies_checked_at",
                table: "analysis_accuracies",
                column: "checked_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analysis_accuracies");

            migrationBuilder.DropColumn(
                name: "confluence_alignment",
                table: "analyses");

            migrationBuilder.DropColumn(
                name: "confluence_score",
                table: "analyses");

            migrationBuilder.DropColumn(
                name: "timeframes_analyzed",
                table: "analyses");

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 13, 12, 7, 34, 35, DateTimeKind.Utc).AddTicks(3339));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 13, 12, 7, 34, 35, DateTimeKind.Utc).AddTicks(3341));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 6, 13, 12, 7, 34, 35, DateTimeKind.Utc).AddTicks(3612));
        }
    }
}
