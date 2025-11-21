# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies (cache layer)
COPY ["ReportService.csproj", "."]
RUN dotnet restore "ReportService.csproj" --no-cache

# Copy source code
COPY . .

# Build and publish
RUN dotnet publish "ReportService.csproj" -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published files
COPY --from=build /app/publish .

EXPOSE 80
ENTRYPOINT ["dotnet", "ReportService.dll"]
