using System.Text.RegularExpressions;
using Confluence.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace Confluence.API.Services;

public class SnapshotService : ISnapshotService
{
    private readonly IWebHostEnvironment _env;

    public SnapshotService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string?> SaveSnapshotAsync(string? base64Data, Guid tradeId, string suffix)
    {
        if (string.IsNullOrWhiteSpace(base64Data))
            return null;

        try
        {
            // Remove data URI scheme prefix if present
            var base64String = Regex.Replace(base64Data, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
            
            var bytes = Convert.FromBase64String(base64String);
            
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var snapshotsDir = Path.Combine(webRoot, "snapshots");
            
            if (!Directory.Exists(snapshotsDir))
            {
                Directory.CreateDirectory(snapshotsDir);
            }
            
            var fileName = $"{tradeId}_{suffix}.png";
            var filePath = Path.Combine(snapshotsDir, fileName);
            
            await File.WriteAllBytesAsync(filePath, bytes);
            
            return $"/snapshots/{fileName}";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to save snapshot for trade {tradeId}: {ex.Message}");
            return null;
        }
    }
}
