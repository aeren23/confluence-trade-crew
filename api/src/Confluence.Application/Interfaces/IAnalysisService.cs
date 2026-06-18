using Confluence.Application.Common;
using Confluence.Application.DTOs.Analysis;

namespace Confluence.Application.Interfaces;

public interface IAnalysisService
{
    Task<AnalysisResponseDto> CreateAnalysisAsync(AnalysisRequestDto request);
    Task<AnalysisResponseDto?> GetAnalysisByIdAsync(Guid id);
    Task<PagedResult<AnalysisListItemDto>> GetAnalysesAsync(string? symbol, int page, int pageSize);
}
