using OfficeOpenXml;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Text.Json;
using System.Text.Json.Nodes;
using ReportService.DTOs;

namespace ReportService.Services;

public interface IExportService
{
    Task<byte[]> ExportToExcelAsync(AnalyticsReportDto report);
    Task<byte[]> ExportToPdfAsync(AnalyticsReportDto report);
}

public class ExportService : IExportService
{
    private readonly ILogger<ExportService> _logger;

    public ExportService(ILogger<ExportService> logger)
    {
        _logger = logger;
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> ExportToExcelAsync(AnalyticsReportDto report)
    {
        try
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add(report.ReportType);

            // Header
            worksheet.Cells[1, 1].Value = "Report Type";
            worksheet.Cells[1, 2].Value = report.ReportType;
            worksheet.Cells[2, 1].Value = "Period";
            worksheet.Cells[2, 2].Value = $"{report.PeriodStart:yyyy-MM-dd} to {report.PeriodEnd:yyyy-MM-dd}";
            worksheet.Cells[3, 1].Value = "Generated At";
            worksheet.Cells[3, 2].Value = report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss");

            // Parse report data
            Dictionary<string, object>? reportData = null;
            try
            {
                if (!string.IsNullOrEmpty(report.ReportData))
                {
                    var jsonNode = JsonNode.Parse(report.ReportData);
                    reportData = jsonNode?.AsObject().ToDictionary(kvp => kvp.Key, kvp => (object)(kvp.Value?.ToString() ?? ""));
                }
            }
            catch
            {
                reportData = new Dictionary<string, object> { { "RawData", report.ReportData ?? "" } };
            }
            
            if (reportData != null)
            {
                int row = 5;
                worksheet.Cells[row, 1].Value = "Key";
                worksheet.Cells[row, 2].Value = "Value";
                worksheet.Cells[row, 1, row, 2].Style.Font.Bold = true;

                row++;
                foreach (var kvp in reportData)
                {
                    worksheet.Cells[row, 1].Value = kvp.Key;
                    worksheet.Cells[row, 2].Value = kvp.Value?.ToString() ?? "";
                    row++;
                }
            }

            worksheet.Cells.AutoFitColumns();
            return await Task.FromResult(package.GetAsByteArray());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting report to Excel");
            throw;
        }
    }

    public async Task<byte[]> ExportToPdfAsync(AnalyticsReportDto report)
    {
        try
        {
            Dictionary<string, object>? reportData = null;
            try
            {
                if (!string.IsNullOrEmpty(report.ReportData))
                {
                    var jsonNode = JsonNode.Parse(report.ReportData);
                    reportData = jsonNode?.AsObject().ToDictionary(kvp => kvp.Key, kvp => (object)(kvp.Value?.ToString() ?? ""));
                }
            }
            catch
            {
                reportData = new Dictionary<string, object> { { "RawData", report.ReportData ?? "" } };
            }
            
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    page.Header()
                        .Text($"{report.ReportType} Report")
                        .SemiBold().FontSize(18).FontColor(Colors.Blue.Medium);

                    page.Content()
                        .Column(column =>
                        {
                            column.Spacing(20);

                            column.Item().Text($"Period: {report.PeriodStart:yyyy-MM-dd} to {report.PeriodEnd:yyyy-MM-dd}");
                            column.Item().Text($"Generated At: {report.GeneratedAt:yyyy-MM-dd HH:mm:ss}");

                            if (reportData != null)
                            {
                                column.Item().PaddingTop(10).Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(2);
                                        columns.RelativeColumn(3);
                                    });

                                    table.Header(header =>
                                    {
                                        header.Cell().Element(CellStyle).Text("Key").SemiBold();
                                        header.Cell().Element(CellStyle).Text("Value").SemiBold();
                                    });

                                    foreach (var kvp in reportData)
                                    {
                                        table.Cell().Element(CellStyle).Text(kvp.Key);
                                        table.Cell().Element(CellStyle).Text(kvp.Value?.ToString() ?? "");
                                    }
                                });
                            }
                        });

                    page.Footer()
                        .AlignCenter()
                        .Text(x =>
                        {
                            x.Span("Page ");
                            x.CurrentPageNumber();
                            x.Span(" of ");
                            x.TotalPages();
                        });
                });
            });

            return await Task.FromResult(document.GeneratePdf());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting report to PDF");
            throw;
        }
    }

    private static IContainer CellStyle(IContainer container)
    {
        return container
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten2)
            .PaddingVertical(5)
            .PaddingHorizontal(10);
    }
}

