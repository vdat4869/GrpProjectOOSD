using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnershipService.Migrations
{
    /// <inheritdoc />
    public partial class AddFileFieldsToEContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FilePath",
                table: "EContracts",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "EContracts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileType",
                table: "EContracts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "EContracts",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FilePath",
                table: "EContracts");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "EContracts");

            migrationBuilder.DropColumn(
                name: "FileType",
                table: "EContracts");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "EContracts");
        }
    }
}

