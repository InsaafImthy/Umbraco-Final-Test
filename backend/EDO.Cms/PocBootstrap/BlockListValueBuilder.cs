using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Services;
using Umbraco.Extensions;

namespace EDO.Cms.PocBootstrap;

/// <summary>
/// Produces the Umbraco 17 block editor persistence model. This intentionally only covers
/// the simple, settings-free block lists used by the POC schema.
/// </summary>
internal sealed class BlockListValueBuilder
{
    private readonly IContentTypeService _contentTypeService;

    public BlockListValueBuilder(IContentTypeService contentTypeService) =>
        _contentTypeService = contentTypeService;

    public string Build(Guid elementTypeKey, string stableListId, params BlockSeed[] blocks)
        => Build(elementTypeKey, stableListId, null, blocks);

    public string BuildForCulture(Guid elementTypeKey, string stableListId, string culture, params BlockSeed[] blocks)
        => Build(elementTypeKey, stableListId, culture, blocks);

    private string Build(Guid elementTypeKey, string stableListId, string? culture, params BlockSeed[] blocks)
    {
        IContentType elementType = _contentTypeService.Get(elementTypeKey)
            ?? throw new InvalidOperationException($"Element type {elementTypeKey} is missing while building '{stableListId}'.");

        var layouts = new List<BlockListLayoutItem>(blocks.Length);
        var contentData = new List<BlockItemData>(blocks.Length);
        var expose = new List<BlockItemVariation>(blocks.Length);

        for (int index = 0; index < blocks.Length; index++)
        {
            BlockSeed block = blocks[index];
            Guid contentKey = StableGuid.Create($"block:{stableListId}:{block.StableId}");
            layouts.Add(new BlockListLayoutItem(contentKey));
            expose.Add(new BlockItemVariation(contentKey, culture, null));

            var values = new List<BlockPropertyValue>(block.Values.Count);
            foreach ((string alias, object? value) in block.Values)
            {
                IPropertyType propertyType = elementType.PropertyTypes.SingleOrDefault(x =>
                    string.Equals(x.Alias, alias, StringComparison.Ordinal))
                    ?? throw new InvalidOperationException($"Property '{elementType.Alias}.{alias}' is missing.");

                string? propertyCulture = propertyType.VariesByCulture() ? culture : null;
                values.Add(new BlockPropertyValue
                {
                    PropertyType = propertyType,
                    Culture = propertyCulture,
                    Segment = null,
                    Alias = alias,
                    Value = value
                });
            }

            contentData.Add(new BlockItemData(contentKey, elementTypeKey, elementType.Alias)
            {
                Values = values
            });
        }

        var blockValue = new BlockListValue(layouts)
        {
            ContentData = contentData,
            SettingsData = [],
            Expose = expose
        };

        return JsonSerializer.Serialize(blockValue, SerializerOptions);
    }

    public sealed record BlockSeed(string StableId, IReadOnlyDictionary<string, object?> Values);

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}

internal static class StableGuid
{
    private static readonly Guid Namespace = new("604429ee-aace-5f17-823c-6f18fd6052d2");

    public static Guid Create(string value)
    {
        Span<byte> namespaceBytes = stackalloc byte[16];
        Namespace.TryWriteBytes(namespaceBytes, bigEndian: true, out _);
        byte[] valueBytes = Encoding.UTF8.GetBytes(value);
        byte[] input = new byte[namespaceBytes.Length + valueBytes.Length];
        namespaceBytes.CopyTo(input);
        valueBytes.CopyTo(input, namespaceBytes.Length);

        byte[] hash = SHA1.HashData(input);
        hash[6] = (byte)((hash[6] & 0x0f) | 0x50);
        hash[8] = (byte)((hash[8] & 0x3f) | 0x80);
        return new Guid(hash.AsSpan(0, 16), bigEndian: true);
    }
}
