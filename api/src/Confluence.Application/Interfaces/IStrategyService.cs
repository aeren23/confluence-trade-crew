using Confluence.Application.DTOs.Strategy;

namespace Confluence.Application.Interfaces;

public interface IStrategyService
{
    /// <summary>Returns all strategy templates (preset and custom), ordered: presets first.</summary>
    Task<List<StrategyTemplateDto>> GetAllAsync();

    /// <summary>Returns a single strategy by ID, or null if not found.</summary>
    Task<StrategyTemplateDto?> GetByIdAsync(Guid id);

    /// <summary>Returns a single strategy by name key (e.g. "swing"), or null.</summary>
    Task<StrategyTemplateDto?> GetByNameAsync(string name);

    /// <summary>Creates a new custom strategy template.</summary>
    Task<StrategyTemplateDto> CreateAsync(CreateStrategyDto dto);

    /// <summary>Updates a custom strategy template. Throws if it's a preset.</summary>
    Task<StrategyTemplateDto> UpdateAsync(Guid id, UpdateStrategyDto dto);

    /// <summary>Deletes a custom strategy template. Throws if it's a preset.</summary>
    Task DeleteAsync(Guid id);
}
