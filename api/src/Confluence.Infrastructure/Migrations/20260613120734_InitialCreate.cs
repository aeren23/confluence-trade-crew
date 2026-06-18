using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "analyses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    timeframe = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    requested_balance = table.Column<decimal>(type: "numeric(20,8)", nullable: false),
                    requested_risk_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    overall_sentiment = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    overall_sentiment_score = table.Column<decimal>(type: "numeric(4,3)", nullable: false),
                    confidence = table.Column<decimal>(type: "numeric(4,3)", nullable: false),
                    conflicts_detected = table.Column<bool>(type: "boolean", nullable: false),
                    latest_price = table.Column<decimal>(type: "numeric(20,8)", nullable: false),
                    result_json = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analyses", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "pairs",
                columns: table => new
                {
                    symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    base_asset = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    quote_asset = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pairs", x => x.symbol);
                });

            migrationBuilder.CreateTable(
                name: "user_settings",
                columns: table => new
                {
                    id = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)1),
                    default_balance = table.Column<decimal>(type: "numeric(20,8)", nullable: false, defaultValue: 1000m),
                    default_risk_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 2.0m),
                    preferred_timeframe = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "4h"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_settings", x => x.id);
                    table.CheckConstraint("CK_UserSettings_Singleton", "id = 1");
                });

            migrationBuilder.CreateTable(
                name: "trades",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    analysis_id = table.Column<Guid>(type: "uuid", nullable: true),
                    symbol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    direction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "Open"),
                    entry_price = table.Column<decimal>(type: "numeric(20,8)", nullable: false),
                    entry_amount = table.Column<decimal>(type: "numeric(20,8)", nullable: false),
                    leverage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 1.0m),
                    stop_loss = table.Column<decimal>(type: "numeric(20,8)", nullable: true),
                    take_profit = table.Column<decimal>(type: "numeric(20,8)", nullable: true),
                    entry_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    exit_price = table.Column<decimal>(type: "numeric(20,8)", nullable: true),
                    exit_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    pnl_quote = table.Column<decimal>(type: "numeric(20,8)", nullable: true),
                    pnl_percentage = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trades", x => x.id);
                    table.CheckConstraint("CK_Trade_Direction", "direction IN ('Long', 'Short')");
                    table.CheckConstraint("CK_Trade_Status", "status IN ('Open', 'Closed')");
                    table.ForeignKey(
                        name: "FK_trades_analyses_analysis_id",
                        column: x => x.analysis_id,
                        principalTable: "analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "pairs",
                columns: new[] { "symbol", "base_asset", "created_at", "is_active", "quote_asset" },
                values: new object[,]
                {
                    { "BTC/USDT", "BTC", new DateTime(2026, 6, 13, 12, 7, 34, 35, DateTimeKind.Utc).AddTicks(3339), true, "USDT" },
                    { "ETH/USDT", "ETH", new DateTime(2026, 6, 13, 12, 7, 34, 35, DateTimeKind.Utc).AddTicks(3341), true, "USDT" }
                });

            migrationBuilder.InsertData(
                table: "user_settings",
                columns: new[] { "id", "default_balance", "default_risk_percentage", "preferred_timeframe", "updated_at" },
                values: new object[] { (short)1, 1000m, 2.0m, "4h", new DateTime(2026, 6, 13, 12, 7, 34, 35, DateTimeKind.Utc).AddTicks(3612) });

            migrationBuilder.CreateIndex(
                name: "IX_analyses_created_at",
                table: "analyses",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_analyses_result_json",
                table: "analyses",
                column: "result_json")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(
                name: "IX_analyses_symbol_created_at",
                table: "analyses",
                columns: new[] { "symbol", "created_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_trades_analysis_id",
                table: "trades",
                column: "analysis_id");

            migrationBuilder.CreateIndex(
                name: "IX_trades_status_entry_at",
                table: "trades",
                columns: new[] { "status", "entry_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_trades_status_symbol",
                table: "trades",
                columns: new[] { "status", "symbol" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pairs");

            migrationBuilder.DropTable(
                name: "trades");

            migrationBuilder.DropTable(
                name: "user_settings");

            migrationBuilder.DropTable(
                name: "analyses");
        }
    }
}
