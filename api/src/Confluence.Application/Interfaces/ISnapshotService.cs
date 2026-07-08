namespace Confluence.Application.Interfaces;

public interface ISnapshotService
{
    Task<string?> SaveSnapshotAsync(string? base64Data, Guid tradeId, string suffix);
}
