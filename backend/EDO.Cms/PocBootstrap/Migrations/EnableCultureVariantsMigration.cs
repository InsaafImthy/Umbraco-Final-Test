using System.Text.Json;
using System.Text.Json.Nodes;
using EDO.Cms.PocBootstrap.Constants;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Extensions;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace EDO.Cms.PocBootstrap.Migrations;

/// <summary>
/// Moves the completed invariant POC schema to Umbraco-native en/ar culture variants.
/// Existing values are retained as English; only a deliberately small Arabic proof set is seeded.
/// </summary>
public sealed class EnableCultureVariantsMigration : AsyncMigrationBase
{
    public const string EnglishCulture = "en";
    public const string ArabicCulture = "ar";

    private const int UserId = UmbracoConstants.Security.SuperUserId;
    private readonly IContentTypeService _contentTypeService;
    private readonly IContentService _contentService;
    private readonly ILanguageService _languageService;
    private readonly ILogger<EnableCultureVariantsMigration> _logger;

    private static readonly IReadOnlyDictionary<string, IReadOnlySet<string>> CultureProperties =
        new Dictionary<string, IReadOnlySet<string>>(StringComparer.Ordinal)
        {
            [EdoAliases.ContentTypes.NavigationItem] = Set(EdoAliases.Properties.Label, EdoAliases.Properties.Link),
            [EdoAliases.ContentTypes.StrategicStatement] = Set(EdoAliases.Properties.Heading, EdoAliases.Properties.Description),
            [EdoAliases.ContentTypes.MilestoneItem] = Set(EdoAliases.Properties.DateLabel, EdoAliases.Properties.Description),
            [EdoAliases.ContentTypes.SubsidiaryItem] = Set(EdoAliases.Properties.Name, EdoAliases.Properties.Description, EdoAliases.Properties.Link),
            [EdoAliases.ContentTypes.LeadershipPerson] = Set(EdoAliases.Properties.Name, EdoAliases.Properties.Position, EdoAliases.Properties.Biography),
            [EdoAliases.ContentTypes.QuickLink] = Set(EdoAliases.Properties.Label, EdoAliases.Properties.Link),

            [EdoAliases.ContentTypes.HomePage] = Set(
                EdoAliases.Properties.MetaTitle, EdoAliases.Properties.MetaDescription,
                EdoAliases.Properties.HeroTitle, EdoAliases.Properties.HeroSubtitle, EdoAliases.Properties.HeroCta,
                EdoAliases.Properties.StrategicStatements, EdoAliases.Properties.MilestonesHeading, EdoAliases.Properties.Milestones,
                EdoAliases.Properties.SubsidiariesHeading, EdoAliases.Properties.Subsidiaries,
                EdoAliases.Properties.ClosingHeading, EdoAliases.Properties.ClosingText),
            [EdoAliases.ContentTypes.SiteSettings] = Set(
                EdoAliases.Properties.SiteName, EdoAliases.Properties.Navigation, EdoAliases.Properties.Address,
                EdoAliases.Properties.PoBox, EdoAliases.Properties.FooterLinks, EdoAliases.Properties.CopyrightText),
            [EdoAliases.ContentTypes.AboutPage] = Set(
                EdoAliases.Properties.PageTitle, EdoAliases.Properties.IntroHeading, EdoAliases.Properties.IntroBody,
                EdoAliases.Properties.VisionHeading, EdoAliases.Properties.VisionText,
                EdoAliases.Properties.MissionHeading, EdoAliases.Properties.MissionText,
                EdoAliases.Properties.CeoMessage, EdoAliases.Properties.CeoName, EdoAliases.Properties.CeoPosition,
                EdoAliases.Properties.BoardHeading, EdoAliases.Properties.BoardMembers,
                EdoAliases.Properties.ManagementHeading, EdoAliases.Properties.ManagementMembers),
            [EdoAliases.ContentTypes.CareersPage] = Set(
                EdoAliases.Properties.PageTitle, EdoAliases.Properties.Heading, EdoAliases.Properties.Body, EdoAliases.Properties.Cta),
            [EdoAliases.ContentTypes.MediaListingPage] = Set(EdoAliases.Properties.PageTitle, EdoAliases.Properties.Introduction),
            [EdoAliases.ContentTypes.NewsArticle] = Set(
                EdoAliases.Properties.Headline, EdoAliases.Properties.Summary, EdoAliases.Properties.Body, EdoAliases.Properties.Category),
            [EdoAliases.ContentTypes.InvestorRelationsPage] = Set(
                EdoAliases.Properties.PageTitle, EdoAliases.Properties.Introduction, EdoAliases.Properties.QuickLinks,
                EdoAliases.Properties.KeyFiguresHeading, EdoAliases.Properties.KeyFiguresText),
            [EdoAliases.ContentTypes.InvestorDocument] = Set(EdoAliases.Properties.Title, EdoAliases.Properties.Description),
            [EdoAliases.ContentTypes.ContactPage] = Set(
                EdoAliases.Properties.PageTitle, EdoAliases.Properties.Introduction)
        };

    private static readonly IReadOnlySet<string> BlockListProperties = Set(
        EdoAliases.Properties.Navigation, EdoAliases.Properties.FooterLinks,
        EdoAliases.Properties.StrategicStatements, EdoAliases.Properties.Milestones,
        EdoAliases.Properties.Subsidiaries, EdoAliases.Properties.BoardMembers,
        EdoAliases.Properties.ManagementMembers, EdoAliases.Properties.QuickLinks);

    public EnableCultureVariantsMigration(
        IMigrationContext context,
        IContentTypeService contentTypeService,
        IContentService contentService,
        ILanguageService languageService,
        ILogger<EnableCultureVariantsMigration> logger)
        : base(context)
    {
        _contentTypeService = contentTypeService;
        _contentService = contentService;
        _languageService = languageService;
        _logger = logger;
    }

    protected override async Task MigrateAsync()
    {
        await EnsureLanguagesAsync();

        ContentSnapshot[] snapshots = SnapshotDocuments().ToArray();
        await EnableSchemaVariantsAsync();
        await RestoreEnglishAndSeedArabicAsync(snapshots);
        VerifySchema();

        _logger.LogInformation(
            "EDO culture variants enabled for {ContentTypeCount} content types using cultures {EnglishCulture} and {ArabicCulture}.",
            CultureProperties.Count, EnglishCulture, ArabicCulture);
    }

    private async Task EnsureLanguagesAsync()
    {
        if (await _languageService.GetAsync(EnglishCulture) is null)
        {
            await _languageService.CreateAsync(
                new Language(EnglishCulture, "English") { IsMandatory = true },
                UmbracoConstants.Security.SuperUserKey);
        }

        if (await _languageService.GetAsync(ArabicCulture) is null)
        {
            await _languageService.CreateAsync(
                new Language(ArabicCulture, "Arabic") { FallbackIsoCode = EnglishCulture },
                UmbracoConstants.Security.SuperUserKey);
        }
    }

    private IEnumerable<ContentSnapshot> SnapshotDocuments()
    {
        foreach (IContent content in _contentService.GetRootContent().SelectMany(DescendantsAndSelf))
        {
            if (!CultureProperties.TryGetValue(content.ContentType.Alias, out IReadOnlySet<string>? aliases) ||
                content.ContentType.IsElement)
            {
                continue;
            }

            bool contentTypeAlreadyVaries = content.ContentType.VariesByCulture();
            string englishName = contentTypeAlreadyVaries
                ? content.GetCultureName(EnglishCulture) ?? content.Name ?? content.Key.ToString()
                : content.Name ?? content.Key.ToString();
            var values = new Dictionary<string, object?>(StringComparer.Ordinal);
            foreach (string alias in aliases)
            {
                IPropertyType propertyType = content.Properties.Single(x => x.Alias == alias).PropertyType;
                values[alias] = propertyType.VariesByCulture()
                    ? content.GetValue(alias, EnglishCulture)
                    : content.GetValue(alias);
            }

            yield return new ContentSnapshot(content.Key, englishName, values);
        }
    }

    private async Task EnableSchemaVariantsAsync()
    {
        foreach ((string contentTypeAlias, IReadOnlySet<string> aliases) in CultureProperties)
        {
            IContentType contentType = _contentTypeService.Get(contentTypeAlias)
                ?? throw new InvalidOperationException($"EDO culture migration stopped: content type '{contentTypeAlias}' is missing.");

            contentType.Variations = ContentVariation.Culture;
            foreach (IPropertyType propertyType in contentType.PropertyTypes)
            {
                propertyType.Variations = aliases.Contains(propertyType.Alias)
                    ? ContentVariation.Culture
                    : ContentVariation.Nothing;
            }

            await _contentTypeService.UpdateAsync(contentType, UmbracoConstants.Security.SuperUserKey);
        }
    }

    private async Task RestoreEnglishAndSeedArabicAsync(IEnumerable<ContentSnapshot> snapshots)
    {
        var blocks = new BlockListValueBuilder(_contentTypeService);
        foreach (ContentSnapshot snapshot in snapshots)
        {
            IContent content = _contentService.GetById(snapshot.Key)
                ?? throw new InvalidOperationException($"EDO culture migration stopped: content {snapshot.Key} disappeared.");

            content.SetCultureName(snapshot.Name, EnglishCulture);
            content.SetCultureName(ArabicName(content, snapshot.Name), ArabicCulture);

            foreach ((string alias, object? value) in snapshot.Values)
            {
                if (value is null)
                {
                    continue;
                }

                object englishValue = BlockListProperties.Contains(alias)
                    ? AddBlockCulture(value.ToString()!, EnglishCulture)
                    : value;
                content.SetValue(alias, englishValue, EnglishCulture);
            }

            SeedArabicValues(content, blocks);

            OperationResult save = _contentService.Save(content, UserId);
            if (!save.Success)
            {
                throw new InvalidOperationException($"EDO culture migration could not save '{snapshot.Name}': {save.Result}.");
            }

            PublishResult englishPublish = _contentService.Publish(content, [EnglishCulture], UserId);
            PublishResult arabicPublish = _contentService.Publish(content, [ArabicCulture], UserId);
            if (!englishPublish.Success || !arabicPublish.Success)
            {
                throw new InvalidOperationException(
                    $"EDO culture migration could not publish '{snapshot.Name}': en={englishPublish.Result}, ar={arabicPublish.Result}.");
            }
        }

        await Task.CompletedTask;
    }

    private static void SeedArabicValues(IContent content, BlockListValueBuilder blocks)
    {
        if (content.ContentType.Alias == EdoAliases.ContentTypes.HomePage)
        {
            SetArabic(content, EdoAliases.Properties.MetaTitle, "شركة تنمية طاقة عُمان | مستقبل مستدام للطاقة");
            SetArabic(content, EdoAliases.Properties.MetaDescription, "تدير شركة تنمية طاقة عُمان استثمارات قطاع الطاقة في السلطنة وتنميها بكفاءة واستدامة.");
            SetArabic(content, EdoAliases.Properties.HeroTitle, "شركة تنمية طاقة عُمان");
            SetArabic(content, EdoAliases.Properties.HeroSubtitle, "شركة حكومية تعمل على إدارة قطاع الطاقة في عُمان وتنميته.");
            SetArabic(content, EdoAliases.Properties.MilestonesHeading, "محطات رئيسية في مسيرة الشركة");
            SetArabic(content, EdoAliases.Properties.Milestones, blocks.BuildForCulture(
                EdoKeys.ContentTypes.MilestoneItem,
                "home-milestones-ar",
                ArabicCulture,
                Block("december-2020", (EdoAliases.Properties.DateLabel, "ديسمبر 2020"),
                    (EdoAliases.Properties.SequenceNumber, 1),
                    (EdoAliases.Properties.Description, "تأسست شركة تنمية طاقة عُمان بموجب المرسوم السلطاني رقم 128/2020."))));
        }
        else if (content.ContentType.Alias == EdoAliases.ContentTypes.SiteSettings)
        {
            SetArabic(content, EdoAliases.Properties.SiteName, "شركة تنمية طاقة عُمان");
            SetArabic(content, EdoAliases.Properties.Address, "ميناء الفحل، مسقط، سلطنة عُمان");
            SetArabic(content, EdoAliases.Properties.PoBox, "ص.ب 828، الرمز البريدي 116، ميناء الفحل");
            SetArabic(content, EdoAliases.Properties.Navigation, ArabicNavigation(blocks, "main-navigation-ar"));
            SetArabic(content, EdoAliases.Properties.FooterLinks, ArabicNavigation(blocks, "footer-navigation-ar"));
            SetArabic(content, EdoAliases.Properties.CopyrightText, $"حقوق النشر © {DateTime.UtcNow.Year} شركة تنمية طاقة عُمان");
        }
        else if (content.ContentType.Alias == EdoAliases.ContentTypes.AboutPage)
        {
            SetArabic(content, EdoAliases.Properties.PageTitle, "من نحن");
            SetArabic(content, EdoAliases.Properties.IntroHeading, "شركة تنمية طاقة عُمان");
            SetArabic(content, EdoAliases.Properties.IntroBody, RichText("تأسست شركة تنمية طاقة عُمان في ديسمبر 2020 لتحقيق الكفاءة واستكشاف فرص نمو جديدة في قطاع الطاقة."));
            SetArabic(content, EdoAliases.Properties.VisionHeading, "رؤيتنا");
            SetArabic(content, EdoAliases.Properties.BoardHeading, "مجلس الإدارة");
        }
    }

    private static string ArabicNavigation(BlockListValueBuilder blocks, string stableId) => blocks.BuildForCulture(
        EdoKeys.ContentTypes.NavigationItem,
        stableId,
        ArabicCulture,
        Block("home", (EdoAliases.Properties.Label, "الرئيسية"), (EdoAliases.Properties.Link, Link("الرئيسية", "/"))),
        Block("about", (EdoAliases.Properties.Label, "من نحن"), (EdoAliases.Properties.Link, Link("من نحن", "/about-us/"))),
        Block("careers", (EdoAliases.Properties.Label, "الوظائف"), (EdoAliases.Properties.Link, Link("الوظائف", "/careers/"))),
        Block("media", (EdoAliases.Properties.Label, "الأخبار"), (EdoAliases.Properties.Link, Link("الأخبار", "/media/"))),
        Block("investor-relations", (EdoAliases.Properties.Label, "علاقات المستثمرين"), (EdoAliases.Properties.Link, Link("علاقات المستثمرين", "/investor-relations/"))),
        Block("contact", (EdoAliases.Properties.Label, "اتصل بنا"), (EdoAliases.Properties.Link, Link("اتصل بنا", "/contact-us/"))));

    private static string AddBlockCulture(string json, string culture)
    {
        JsonObject root = JsonNode.Parse(json)?.AsObject()
            ?? throw new InvalidOperationException("EDO culture migration encountered an invalid block-list value.");

        foreach (JsonNode? contentNode in root["contentData"]?.AsArray() ?? [])
        {
            JsonObject content = contentNode!.AsObject();
            if (!Guid.TryParse(content["contentTypeKey"]?.ToString(), out Guid elementKey))
            {
                continue;
            }

            string? elementAlias = ElementAlias(elementKey);
            if (elementAlias is null || !CultureProperties.TryGetValue(elementAlias, out IReadOnlySet<string>? varyingAliases))
            {
                continue;
            }

            foreach (JsonNode? valueNode in content["values"]?.AsArray() ?? [])
            {
                JsonObject value = valueNode!.AsObject();
                if (varyingAliases.Contains(value["alias"]?.ToString() ?? string.Empty))
                {
                    value["culture"] = culture;
                }
            }
        }

        foreach (JsonNode? exposeNode in root["expose"]?.AsArray() ?? [])
        {
            exposeNode!.AsObject()["culture"] = culture;
        }

        return root.ToJsonString();
    }

    private void VerifySchema()
    {
        foreach ((string contentTypeAlias, IReadOnlySet<string> aliases) in CultureProperties)
        {
            IContentType contentType = _contentTypeService.Get(contentTypeAlias)
                ?? throw new InvalidOperationException($"EDO culture verification failed: '{contentTypeAlias}' is missing.");
            if (!contentType.VariesByCulture())
            {
                throw new InvalidOperationException($"EDO culture verification failed: '{contentTypeAlias}' is invariant.");
            }

            foreach (string alias in aliases)
            {
                IPropertyType property = contentType.PropertyTypes.Single(x => x.Alias == alias);
                if (!property.VariesByCulture())
                {
                    throw new InvalidOperationException($"EDO culture verification failed: '{contentTypeAlias}.{alias}' is invariant.");
                }
            }
        }
    }

    private IEnumerable<IContent> DescendantsAndSelf(IContent parent)
    {
        yield return parent;
        long total;
        foreach (IContent child in _contentService.GetPagedChildren(parent.Id, 0, int.MaxValue, out total))
        {
            foreach (IContent descendant in DescendantsAndSelf(child))
            {
                yield return descendant;
            }
        }
    }

    private static string ArabicName(IContent content, string fallback) => content.ContentType.Alias switch
    {
        EdoAliases.ContentTypes.HomePage => "الرئيسية",
        EdoAliases.ContentTypes.AboutPage => "من نحن",
        EdoAliases.ContentTypes.CareersPage => "الوظائف",
        EdoAliases.ContentTypes.MediaListingPage => "الأخبار",
        EdoAliases.ContentTypes.InvestorRelationsPage => "علاقات المستثمرين",
        EdoAliases.ContentTypes.ContactPage => "اتصل بنا",
        EdoAliases.ContentTypes.SiteSettings => "إعدادات الموقع",
        _ => fallback
    };

    private static string? ElementAlias(Guid key) => key switch
    {
        var value when value == EdoKeys.ContentTypes.NavigationItem => EdoAliases.ContentTypes.NavigationItem,
        var value when value == EdoKeys.ContentTypes.StrategicStatement => EdoAliases.ContentTypes.StrategicStatement,
        var value when value == EdoKeys.ContentTypes.MilestoneItem => EdoAliases.ContentTypes.MilestoneItem,
        var value when value == EdoKeys.ContentTypes.SubsidiaryItem => EdoAliases.ContentTypes.SubsidiaryItem,
        var value when value == EdoKeys.ContentTypes.LeadershipPerson => EdoAliases.ContentTypes.LeadershipPerson,
        var value when value == EdoKeys.ContentTypes.QuickLink => EdoAliases.ContentTypes.QuickLink,
        _ => null
    };

    private static IReadOnlySet<string> Set(params string[] aliases) => aliases.ToHashSet(StringComparer.Ordinal);

    private static void SetArabic(IContent content, string alias, object value) =>
        content.SetValue(alias, value, ArabicCulture);

    private static BlockListValueBuilder.BlockSeed Block(string stableId, params (string Alias, object? Value)[] values) =>
        new(stableId, values.ToDictionary(x => x.Alias, x => x.Value, StringComparer.Ordinal));

    private static string RichText(string text) => JsonSerializer.Serialize(new
    {
        markup = $"<p>{System.Net.WebUtility.HtmlEncode(text)}</p>",
        blocks = (object?)null
    });

    private static string Link(string title, string url) => JsonSerializer.Serialize(new[]
    {
        new { name = title, target = (string?)null, url, queryString = (string?)null, type = "External" }
    });

    private sealed record ContentSnapshot(Guid Key, string Name, IReadOnlyDictionary<string, object?> Values);
}
