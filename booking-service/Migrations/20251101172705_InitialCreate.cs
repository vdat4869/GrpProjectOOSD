using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace booking_service.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CoOwners",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    OwnershipRatio = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    UsageCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoOwners", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VehicleId = table.Column<int>(type: "int", nullable: false),
                    CoOwnerId = table.Column<int>(type: "int", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bookings_CoOwners_CoOwnerId",
                        column: x => x.CoOwnerId,
                        principalTable: "CoOwners",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Bookings_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "CoOwners",
                columns: new[] { "Id", "Name", "OwnershipRatio", "UsageCount" },
                values: new object[,]
                {
                    { 1, "Ngô Hoàng Thức", 60m, 3 },
                    { 2, "Nguyễn Văn A", 40m, 2 }
                });

            migrationBuilder.InsertData(
                table: "Vehicles",
                columns: new[] { "Id", "IsActive", "Name" },
                values: new object[,]
                {
                    { 1, true, "Xe Mercedes" },
                    { 2, true, "Xe VinFast" }
                });

            migrationBuilder.InsertData(
                table: "Bookings",
                columns: new[] { "Id", "CoOwnerId", "EndTime", "Note", "StartTime", "Status", "VehicleId" },
                values: new object[,]
                {
                    { 1, 1, new DateTime(2025, 11, 1, 11, 0, 0, 0, DateTimeKind.Unspecified), "Chuyến công tác", new DateTime(2025, 11, 1, 8, 0, 0, 0, DateTimeKind.Unspecified), "Approved", 1 },
                    { 2, 2, new DateTime(2025, 11, 2, 13, 0, 0, 0, DateTimeKind.Unspecified), "Chờ xác nhận", new DateTime(2025, 11, 2, 9, 0, 0, 0, DateTimeKind.Unspecified), "Pending", 2 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_CoOwnerId",
                table: "Bookings",
                column: "CoOwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_VehicleId",
                table: "Bookings",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropTable(
                name: "CoOwners");

            migrationBuilder.DropTable(
                name: "Vehicles");
        }
    }
}
