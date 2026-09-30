using System.Globalization;
using System.Text.Json;
using EDO.Cms.PocBootstrap.Constants;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace EDO.Cms.PocBootstrap.Migrations;

/// <summary>
/// Repairs only the invalid, pre-fix DateOnly values produced by the original seed migration.
/// Valid JSON values (including editor changes) are deliberately left untouched.
/// </summary>
public sealed class CorrectEdoDateValuesMigration : AsyncMigrationBase
{
    private readonly IContentService _contentService;
    private readonly ILogger<CorrectEdoDateValuesMigration> _logger;

    public CorrectEdoDateValuesMigration(
        IMigrationContext context,
        IContentService contentService,
        ILogger<CorrectEdoDateValuesMigration> logger)
        : base(context)
    {
        _contentService = contentService;
        _logger = logger;
    }

    protected override Task MigrateAsync()
    {
        int repaired = 0;
        foreach (IContent content in _contentService.GetRootContent().SelectMany(DescendantsAndSelf))
        {
            if (content.ContentType.Alias is not (EdoAliases.ContentTypes.NewsArticle or EdoAliases.ContentTypes.InvestorDocument))
            {
                continue;
            }

            object? raw = content.GetValue(EdoAliases.Properties.PublicationDate);
            if (raw is null || IsValidDateOnlyJson(raw.ToString()))
            {
                continue;
            }

            if (!TryReadLegacyDate(raw, out DateTime date))
            {
                throw new InvalidOperationException(
                    $"EDO date correction stopped: '{content.Name}' has an unrecognized publicationDate value '{raw}'.");
            }

            content.SetValue(EdoAliases.Properties.PublicationDate, DateOnlyValue(date));
            OperationResult save = _contentService.Save(content, UmbracoConstants.Security.SuperUserId);
            PublishResult publish = _contentService.Publish(content, ["*"], UmbracoConstants.Security.SuperUserId);
            if (!save.Success || !publish.Success)
            {
                throw new InvalidOperationException(
                    $"EDO date correction could not save and publish '{content.Name}': save={save.Result}, publish={publish.Result}.");
            }

            repaired++;
        }

        _logger.LogInformation("EDO DateOnly compatibility correction repaired {RepairedCount} generated content values.", repaired);
        return Task.CompletedTask;
    }

    private IEnumerable<IContent> DescendantsAndSelf(IContent parent)
    {
        yield return parent;
        long total;
        IEnumerable<IContent> children = _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out total);
        foreach (IContent child in children)
        {
            foreach (IContent descendant in DescendantsAndSelf(child))
            {
                yield return descendant;
            }
        }
    }

    private static bool IsValidDateOnlyJson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            using JsonDocument document = JsonDocument.Parse(value);
            return document.RootElement.ValueKind == JsonValueKind.Object &&
                   document.RootElement.TryGetProperty("date", out JsonElement date) &&
                   DateOnly.TryParseExact(date.GetString(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TryReadLegacyDate(object raw, out DateTime value)
    {
        if (raw is DateTime date)
        {
            value = date;
            return true;
        }

        string? text = Convert.ToString(raw, CultureInfo.InvariantCulture);
        return DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out value) ||
               DateTime.TryParse(text, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out value);
    }

    private static string DateOnlyValue(DateTime value) => JsonSerializer.Serialize(new
    {
        date = value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        timeZone = (string?)null
    });
}
