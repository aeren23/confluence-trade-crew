using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTradeReviewsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trade_reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    trade_id = table.Column<Guid>(type: "uuid", nullable: false),
                    verdict = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    execution_score = table.Column<decimal>(type: "numeric(3,2)", nullable: false),
                    plan_adherence = table.Column<bool>(type: "boolean", nullable: false),
                    plan_adherence_explanation = table.Column<string>(type: "text", nullable: false),
                    sl_tp_rational = table.Column<bool>(type: "boolean", nullable: false),
                    sl_tp_analysis = table.Column<string>(type: "text", nullable: false),
                    timing_verdict = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    timing_explanation = table.Column<string>(type: "text", nullable: false),
                    improvement_advice = table.Column<string>(type: "text", nullable: false),
                    full_review_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trade_reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_trade_reviews_trades_trade_id",
                        column: x => x.trade_id,
                        principalTable: "trades",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateIndex(
                name: "IX_trade_reviews_trade_id",
                table: "trade_reviews",
                column: "trade_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trade_reviews");

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "BTC/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 22, 10, 36, 36, 404, DateTimeKind.Utc).AddTicks(8380));

            migrationBuilder.UpdateData(
                table: "pairs",
                keyColumn: "symbol",
                keyValue: "ETH/USDT",
                column: "created_at",
                value: new DateTime(2026, 6, 22, 10, 36, 36, 404, DateTimeKind.Utc).AddTicks(8382));

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 6, 22, 10, 36, 36, 404, DateTimeKind.Utc).AddTicks(8529));
        }
    }
}
