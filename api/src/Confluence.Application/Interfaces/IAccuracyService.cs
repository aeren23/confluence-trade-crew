using Confluence.Domain.Entities;

namespace Confluence.Application.Interfaces;

public interface IAccuracyService
{
    /// <summary>
    /// Evaluates the accuracy of a single analysis by checking the current market price
    /// against its original prediction, and saves the result as an AnalysisAccuracy record.
    /// </summary>
    /// <param name="analysisId">The ID of the analysis to evaluate.</param>
    /// <param name="intervalLabel">Label for this check, e.g., "on-demand", "1h", "4h".</param>
    /// <returns>The created AnalysisAccuracy record.</returns>
    Task<AnalysisAccuracy> EvaluateAnalysisAccuracyAsync(Guid analysisId, string intervalLabel);

    /// <summary>
    /// Retrieves all accuracy records for a specific analysis.
    /// </summary>
    Task<IEnumerable<AnalysisAccuracy>> GetAccuracyForAnalysisAsync(Guid analysisId);

    /// <summary>
    /// Retrieves aggregate accuracy statistics (win rate, total evaluated) across all analyses.
    /// </summary>
    Task<object> GetGlobalAccuracyStatsAsync();
}
