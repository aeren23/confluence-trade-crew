using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Confluence.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTimeframeToAnalyses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Stores the JSON array of analyzed timeframes, e.g. '["15m","1h","4h","1d"]'
            migrationBuilder.AddColumn<string>(
                name: "timeframes_analyzed",
                table: "analyses",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // Weighted confluence score across all timeframes (-1.000 to 1.000)
            migrationBuilder.AddColumn<decimal>(
                name: "confluence_score",
                table: "analyses",
                type: "numeric(4,3)",
                nullable: true);

            // Alignment classification: 'aligned', 'mixed', 'conflicting'
            migrationBuilder.AddColumn<string>(
                name: "confluence_alignment",
                table: "analyses",
                type: "character varying(15)",
                maxLength: 15,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "confluence_alignment", table: "analyses");
            migrationBuilder.DropColumn(name: "confluence_score", table: "analyses");
            migrationBuilder.DropColumn(name: "timeframes_analyzed", table: "analyses");
        }
    }
}
