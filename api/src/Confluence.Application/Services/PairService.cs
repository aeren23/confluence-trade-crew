using Confluence.Application.Interfaces;
using Confluence.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Confluence.Application.Services;

public class PairService : IPairService
{
    private readonly DbContext _context;

    public PairService(DbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Pair>> GetAllActivePairsAsync()
    {
        return await GetAllPairsAsync(includeInactive: false);
    }

    public async Task<IEnumerable<Pair>> GetAllPairsAsync(bool includeInactive)
    {
        var query = _context.Set<Pair>().AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(p => p.IsActive);
        }

        return await query
            .OrderByDescending(p => p.IsFavorite)
            .ThenBy(p => p.Symbol)
            .ToListAsync();
    }

    public async Task<Pair> GetOrCreatePairAsync(string symbol, string baseAsset, string quoteAsset)
    {
        var normalizedSymbol = symbol.ToUpperInvariant().Replace("/", "");
        var pair = await _context.Set<Pair>()
            .FirstOrDefaultAsync(p => p.Symbol.ToUpper().Replace("/", "") == normalizedSymbol);
        
        if (pair == null)
        {
            pair = new Pair
            {
                Symbol = symbol.ToUpperInvariant(),
                BaseAsset = baseAsset.ToUpperInvariant(),
                QuoteAsset = quoteAsset.ToUpperInvariant(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.Set<Pair>().Add(pair);
            await _context.SaveChangesAsync();
        }
        else if (!pair.IsActive)
        {
            pair.IsActive = true;
            await _context.SaveChangesAsync();
        }
        
        return pair;
    }

    public async Task SetPairActiveAsync(string symbol, bool isActive)
    {
        var pair = await GetPairBySymbolAsync(symbol);
        pair.IsActive = isActive;
        await _context.SaveChangesAsync();
    }

    public async Task SetPairFavoriteAsync(string symbol, bool isFavorite)
    {
        var pair = await GetPairBySymbolAsync(symbol);
        pair.IsFavorite = isFavorite;
        await _context.SaveChangesAsync();
    }

    private async Task<Pair> GetPairBySymbolAsync(string symbol)
    {
        var normalizedSymbol = symbol.ToUpperInvariant().Replace("/", "");
        var pair = await _context.Set<Pair>()
            .FirstOrDefaultAsync(p => p.Symbol.ToUpper().Replace("/", "") == normalizedSymbol);

        if (pair == null)
            throw new KeyNotFoundException($"Pair '{symbol}' was not found.");

        return pair;
    }
}
