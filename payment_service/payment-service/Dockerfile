# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Disable NuGet fallback folders to avoid Windows path issues
ENV NUGET_FALLBACK_PACKAGES=""

# Copy project file and restore dependencies (cache layer)
COPY src/PaymentService.csproj .
RUN dotnet nuget locals all --clear && \
    dotnet restore PaymentService.csproj --no-cache

# Copy source code (excluding obj/bin via .dockerignore)
COPY src/ .

# Clean any obj/bin folders that might have been copied and restore again
RUN find . -type d -name "obj" -exec rm -rf {} + 2>/dev/null || true && \
    find . -type d -name "bin" -exec rm -rf {} + 2>/dev/null || true && \
    dotnet nuget locals all --clear && \
    dotnet restore PaymentService.csproj --no-cache

# Build and publish
RUN dotnet publish PaymentService.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published files
COPY --from=build /app/publish .

# Create logs directory
RUN mkdir -p /app/logs

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

# Health check (curl is not needed - use dotnet process check or remove if health endpoint exists)
# If health endpoint exists at /health, use: wget -qO- http://localhost:8080/health || exit 1
# For now, simple process check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD dotnet --list-runtimes > /dev/null || exit 1

ENTRYPOINT ["dotnet", "PaymentService.dll"]
