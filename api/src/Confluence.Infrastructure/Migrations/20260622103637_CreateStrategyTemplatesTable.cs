using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CreateStrategyTemplatesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "strategy_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    is_preset = table.Column<bool>(type: "boolean", nullable: false),
                    timeframes_json = table.Column<string>(type: "jsonb", nullable: false),
                    risk_profile = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    minimum_rr = table.Column<decimal>(type: "numeric(4,2)", nullable: false),
                    news_weight = table.Column<decimal>(type: "numeric(4,3)", nullable: false),
                    timeframe_weights_json = table.Column<string>(type: "jsonb", nullable: false),
                    icon_emoji = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    color_hex = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_strategy_templates", x => x.id);
                });

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

            migrationBuilder.InsertData(
                table: "strategy_templates",
                columns: new[] { "id", "color_hex", "created_at", "description", "display_name", "icon_emoji", "is_preset", "minimum_rr", "name", "news_weight", "risk_profile", "timeframe_weights_json", "timeframes_json", "updated_at" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111101"), "#F59E0B", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Ultra short-term trades. Focuses on 15m momentum with 5m/1m timing. High frequency, tight stops, aggressive risk profile.", "Scalp Trading", "⚡", true, 1.5m, "scalp", 0.05m, "aggressive", "{\"15m\":0.50,\"5m\":0.30,\"1m\":0.20}", "[\"1m\",\"5m\",\"15m\"]", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-1111-1111-111111111102"), "#60A5FA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Same-day trades. Uses 4h trend, 1h setup, 15m entry timing. Balanced risk with news awareness.", "Intraday", "📊", true, 1.2m, "intraday", 0.15m, "moderate", "{\"4h\":0.40,\"1h\":0.35,\"15m\":0.25}", "[\"15m\",\"1h\",\"4h\"]", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-1111-1111-111111111103"), "#34D399", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Multi-day trades. Daily macro trend with 4h setup and 1h entry. Higher R:R targets, significant news weight.", "Swing Trading", "📈", true, 2.0m, "swing", 0.25m, "moderate", "{\"1d\":0.40,\"4h\":0.35,\"1h\":0.25}", "[\"1h\",\"4h\",\"1d\"]", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-1111-1111-111111111104"), "#A78BFA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Long-term trend following. Weekly macro + daily setup. Conservative risk, high R:R requirements, fundamental-heavy.", "Position Trading", "🏛️", true, 3.0m, "position", 0.35m, "conservative", "{\"1w\":0.40,\"1d\":0.35,\"4h\":0.25}", "[\"4h\",\"1d\",\"1w\"]", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.UpdateData(
                table: "user_settings",
                keyColumn: "id",
                keyValue: (short)1,
                column: "updated_at",
                value: new DateTime(2026, 6, 22, 10, 36, 36, 404, DateTimeKind.Utc).AddTicks(8529));

            migrationBuilder.CreateIndex(
                name: "IX_strategy_templates_is_preset",
                table: "strategy_templates",
                column: "is_preset");

            migrationBuilder.CreateIndex(
                name: "IX_strategy_templates_name",
                table: "strategy_templates",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "strategy_templates");

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
        }
    }
}
