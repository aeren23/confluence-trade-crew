using Confluence.Domain.Entities;

namespace Confluence.Application.Interfaces;

public interface IPairService
{
    Task<IEnumerable<Pair>> GetAllActivePairsAsync();
    Task<IEnumerable<Pair>> GetAllPairsAsync(bool includeInactive);
    Task<Pair> GetOrCreatePairAsync(string symbol, string baseAsset, string quoteAsset);
    Task SetPairActiveAsync(string symbol, bool isActive);
    Task SetPairFavoriteAsync(string symbol, bool isFavorite);
}
