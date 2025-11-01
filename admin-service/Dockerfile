# syntax=docker/dockerfile:1

# === Build stage ===
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy  bộ source của admin-service
COPY ./src/ ./


RUN dotnet restore "AdminService.csproj"
RUN dotnet publish "AdminService.csproj" -c Release -o /app

# === Runtime stage ===
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:5010
EXPOSE 5010
ENTRYPOINT ["dotnet","AdminService.dll"]
