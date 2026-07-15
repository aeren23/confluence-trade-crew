# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first (layer caching optimization)
COPY Confluence.slnx ./
COPY src/Confluence.Domain/Confluence.Domain.csproj src/Confluence.Domain/
COPY src/Confluence.Application/Confluence.Application.csproj src/Confluence.Application/
COPY src/Confluence.Infrastructure/Confluence.Infrastructure.csproj src/Confluence.Infrastructure/
COPY src/Confluence.API/Confluence.API.csproj src/Confluence.API/

# Restore dependencies directly via the main API project
RUN dotnet restore src/Confluence.API/Confluence.API.csproj

# Copy all source files and build
COPY . .
RUN dotnet publish src/Confluence.API/Confluence.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=build /app/publish .

# Create directory for snapshots and set permissions for appuser
RUN mkdir -p wwwroot/snapshots && chown -R appuser:appgroup wwwroot

USER appuser

EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000

ENTRYPOINT ["dotnet", "Confluence.API.dll"]
