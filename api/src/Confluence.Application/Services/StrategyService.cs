using System.Text.Json;
using Confluence.Application.DTOs.Strategy;
using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class StrategyService : IStrategyService
{
    private readonly DbContext _context;

    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public StrategyService(DbContext context)
    {
        _context = context;
    }

    public async Task<List<StrategyTemplateDto>> GetAllAsync()
    {
        var strategies = await _context.Set<StrategyTemplate>()
            .OrderByDescending(s => s.IsPreset)
            .ThenBy(s => s.CreatedAt)
            .ToListAsync();

        return strategies.Select(MapToDto).ToList();
    }

    public async Task<StrategyTemplateDto?> GetByIdAsync(Guid id)
    {
        var strategy = await _context.Set<StrategyTemplate>().FindAsync(id);
        return strategy == null ? null : MapToDto(strategy);
    }

    public async Task<StrategyTemplateDto?> GetByNameAsync(string name)
    {
        var strategy = await _context.Set<StrategyTemplate>()
            .FirstOrDefaultAsync(s => s.Name == name);
        return strategy == null ? null : MapToDto(strategy);
    }

    public async Task<StrategyTemplateDto> CreateAsync(CreateStrategyDto dto)
    {
        // Validate name uniqueness
        var exists = await _context.Set<StrategyTemplate>()
            .AnyAsync(s => s.Name == dto.Name);
        if (exists)
            throw new InvalidOperationException($"A strategy with name '{dto.Name}' already exists.");

        var strategy = new StrategyTemplate
        {
            Name = dto.Name.ToLowerInvariant().Replace(" ", "_"),
            DisplayName = dto.DisplayName,
            Description = dto.Description,
            IsPreset = false,
            TimeframesJson = JsonSerializer.Serialize(dto.Timeframes),
            RiskProfile = dto.RiskProfile,
            MinimumRR = dto.MinimumRR,
            NewsWeight = dto.NewsWeight,
            TimeframeWeightsJson = JsonSerializer.Serialize(dto.TimeframeWeights),
            IconEmoji = dto.IconEmoji,
            ColorHex = dto.ColorHex,
        };

        _context.Set<StrategyTemplate>().Add(strategy);
        await _context.SaveChangesAsync();

        return MapToDto(strategy);
    }

    public async Task<StrategyTemplateDto> UpdateAsync(Guid id, UpdateStrategyDto dto)
    {
        var strategy = await _context.Set<StrategyTemplate>().FindAsync(id)
            ?? throw new KeyNotFoundException($"Strategy with ID {id} not found.");

        if (strategy.IsPreset)
            throw new InvalidOperationException("Preset strategies cannot be modified.");

        if (dto.DisplayName != null) strategy.DisplayName = dto.DisplayName;
        if (dto.Description != null) strategy.Description = dto.Description;
        if (dto.RiskProfile != null) strategy.RiskProfile = dto.RiskProfile;
        if (dto.MinimumRR.HasValue) strategy.MinimumRR = dto.MinimumRR.Value;
        if (dto.NewsWeight.HasValue) strategy.NewsWeight = dto.NewsWeight.Value;
        if (dto.IconEmoji != null) strategy.IconEmoji = dto.IconEmoji;
        if (dto.ColorHex != null) strategy.ColorHex = dto.ColorHex;

        if (dto.Timeframes != null)
            strategy.TimeframesJson = JsonSerializer.Serialize(dto.Timeframes);
        if (dto.TimeframeWeights != null)
            strategy.TimeframeWeightsJson = JsonSerializer.Serialize(dto.TimeframeWeights);

        strategy.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(strategy);
    }

    public async Task DeleteAsync(Guid id)
    {
        var strategy = await _context.Set<StrategyTemplate>().FindAsync(id)
            ?? throw new KeyNotFoundException($"Strategy with ID {id} not found.");

        if (strategy.IsPreset)
            throw new InvalidOperationException("Preset strategies cannot be deleted.");

        _context.Set<StrategyTemplate>().Remove(strategy);
        await _context.SaveChangesAsync();
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private static StrategyTemplateDto MapToDto(StrategyTemplate s)
    {
        var timeframes = DeserializeOrDefault<List<string>>(s.TimeframesJson, []);
        var weights = DeserializeOrDefault<Dictionary<string, decimal>>(s.TimeframeWeightsJson, []);

        return new StrategyTemplateDto
        {
            Id = s.Id,
            Name = s.Name,
            DisplayName = s.DisplayName,
            Description = s.Description,
            IsPreset = s.IsPreset,
            Timeframes = timeframes,
            RiskProfile = s.RiskProfile,
            MinimumRR = s.MinimumRR,
            NewsWeight = s.NewsWeight,
            TimeframeWeights = weights,
            IconEmoji = s.IconEmoji,
            ColorHex = s.ColorHex,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
        };
    }

    private static T DeserializeOrDefault<T>(string json, T fallback)
    {
        try
        {
            return string.IsNullOrWhiteSpace(json)
                ? fallback
                : JsonSerializer.Deserialize<T>(json, _json) ?? fallback;
        }
        catch
        {
            return fallback;
        }
    }
}
