# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies (cache layer)
COPY ["booking-service.csproj", "."]
RUN dotnet restore "booking-service.csproj" --no-cache

# Copy source code
COPY . .

# Build and publish
RUN dotnet publish "booking-service.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published files
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:80
EXPOSE 80
ENTRYPOINT ["dotnet", "booking-service.dll"]
