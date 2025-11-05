FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["booking-service.csproj", "."]
RUN dotnet restore "booking-service.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "booking-service.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "booking-service.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "booking-service.dll"]

