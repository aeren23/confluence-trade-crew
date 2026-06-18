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
        return await _context.Set<Pair>()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Symbol)
            .ToListAsync();
    }

    public async Task<Pair> GetOrCreatePairAsync(string symbol, string baseAsset, string quoteAsset)
    {
        var pair = await _context.Set<Pair>().FirstOrDefaultAsync(p => p.Symbol == symbol);
        
        if (pair == null)
        {
            pair = new Pair
            {
                Symbol = symbol,
                BaseAsset = baseAsset,
                QuoteAsset = quoteAsset,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.Set<Pair>().Add(pair);
            await _context.SaveChangesAsync();
        }
        
        return pair;
    }
}
