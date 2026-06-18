using Confluence.Domain.Entities;

namespace Confluence.Application.Interfaces;

public interface IPairService
{
    Task<IEnumerable<Pair>> GetAllActivePairsAsync();
    Task<Pair> GetOrCreatePairAsync(string symbol, string baseAsset, string quoteAsset);
}
