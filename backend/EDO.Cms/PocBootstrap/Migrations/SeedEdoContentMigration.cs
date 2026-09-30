using System.Text.Json;
using EDO.Cms.PocBootstrap.Constants;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Extensions;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace EDO.Cms.PocBootstrap.Migrations;

public sealed class SeedEdoContentMigration : AsyncMigrationBase
{
    private const int UserId = UmbracoConstants.Security.SuperUserId;
    private readonly IContentService _contentService;
    private readonly IContentTypeService _contentTypeService;
    private readonly IMediaService _mediaService;
    private readonly MediaFileManager _mediaFileManager;
    private readonly MediaUrlGeneratorCollection _mediaUrlGenerators;
    private readonly IShortStringHelper _shortStringHelper;
    private readonly IContentTypeBaseServiceProvider _contentTypeBaseServiceProvider;
    private readonly IWebHostEnvironment _hostingEnvironment;
    private readonly ILogger<SeedEdoContentMigration> _logger;
    private readonly HashSet<Guid> _createdContentKeys = [];
    private BlockListValueBuilder _blocks = null!;

    public SeedEdoContentMigration(
        IMigrationContext context,
        IContentService contentService,
        IContentTypeService contentTypeService,
        IMediaService mediaService,
        MediaFileManager mediaFileManager,
        MediaUrlGeneratorCollection mediaUrlGenerators,
        IShortStringHelper shortStringHelper,
        IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
        IWebHostEnvironment hostingEnvironment,
        ILogger<SeedEdoContentMigration> logger)
        : base(context)
    {
        _contentService = contentService;
        _contentTypeService = contentTypeService;
        _mediaService = mediaService;
        _mediaFileManager = mediaFileManager;
        _mediaUrlGenerators = mediaUrlGenerators;
        _shortStringHelper = shortStringHelper;
        _contentTypeBaseServiceProvider = contentTypeBaseServiceProvider;
        _hostingEnvironment = hostingEnvironment;
        _logger = logger;
    }

    protected override Task MigrateAsync()
    {
        RequireSchema();
        _blocks = new BlockListValueBuilder(_contentTypeService);

        MediaSeed media = SeedMedia();
        IContent home = EnsureContent("Home", EdoAliases.ContentTypes.HomePage, null, content => PopulateHome(content, media));
        IContent about = EnsureContent("About Us", EdoAliases.ContentTypes.AboutPage, home, content => PopulateAbout(content, media));
        IContent careers = EnsureContent("Careers", EdoAliases.ContentTypes.CareersPage, home, PopulateCareers);
        IContent mediaPage = EnsureContent("Media", EdoAliases.ContentTypes.MediaListingPage, home, PopulateMediaPage);
        IContent investor = EnsureContent("Investor Relations", EdoAliases.ContentTypes.InvestorRelationsPage, home, PopulateInvestorPage);
        IContent contact = EnsureContent("Contact Us", EdoAliases.ContentTypes.ContactPage, home, PopulateContact);
        IContent settings = EnsureContent("Site Settings", EdoAliases.ContentTypes.SiteSettings, home, content => PopulateSettings(content, media));

        SeedNews(mediaPage, media);
        SeedInvestorDocuments(investor, media);
        VerifyTree(home, about, careers, mediaPage, investor, contact, settings);

        _logger.LogInformation(
            "EDO POC seed completed. Created and published {CreatedCount} content items; existing content was left unchanged.",
            _createdContentKeys.Count);
        return Task.CompletedTask;
    }

    private void RequireSchema()
    {
        Guid[] required =
        [
            EdoKeys.ContentTypes.HomePage, EdoKeys.ContentTypes.SiteSettings, EdoKeys.ContentTypes.AboutPage,
            EdoKeys.ContentTypes.CareersPage, EdoKeys.ContentTypes.MediaListingPage, EdoKeys.ContentTypes.NewsArticle,
            EdoKeys.ContentTypes.InvestorRelationsPage, EdoKeys.ContentTypes.InvestorDocument, EdoKeys.ContentTypes.ContactPage,
            EdoKeys.ContentTypes.NavigationItem, EdoKeys.ContentTypes.SocialLink, EdoKeys.ContentTypes.StrategicStatement,
            EdoKeys.ContentTypes.MilestoneItem, EdoKeys.ContentTypes.SubsidiaryItem, EdoKeys.ContentTypes.LeadershipPerson,
            EdoKeys.ContentTypes.QuickLink
        ];

        foreach (Guid key in required)
        {
            if (_contentTypeService.Get(key) is null)
            {
                throw new InvalidOperationException(
                    $"EDO content seed stopped because schema type {key} is missing. CreateEdoSchemaMigration must run first.");
            }
        }
    }

    private MediaSeed SeedMedia()
    {
        IMedia root = EnsureMediaFolder("EDO POC", null);
        IMedia brand = EnsureMediaFolder("Brand", root);
        IMedia home = EnsureMediaFolder("Home", root);
        IMedia leadership = EnsureMediaFolder("Leadership", root);
        IMedia news = EnsureMediaFolder("News", root);
        IMedia investor = EnsureMediaFolder("Investor", root);

        return new MediaSeed(
            EnsureMedia("Energy Oman logo", brand, "Brand/logo.png"),
            EnsureMedia("Energy Oman light logo", brand, "Brand/logo-light.png"),
            EnsureMedia("Hydrom logo", home, "Home/hydrom.png"),
            EnsureMedia("OneSupply logo", home, "Home/onesupply.png"),
            EnsureMedia("H.E. Eng. Salim bin Nasser Al Aufi", leadership, "Leadership/salim-al-aufi.jpeg"),
            EnsureMedia("H.E. Abdullah bin Salim Al Harthy", leadership, "Leadership/abdullah-al-harthy.jpeg"),
            EnsureMedia("H.E. Mulham bin Basheer Al Jarf", leadership, "Leadership/mulham-al-jarf.jpeg"),
            EnsureMedia("Eng. Mazin bin Rashid Al Lamki", leadership, "Leadership/mazin-al-lamki.jpg"),
            EnsureMedia("Eng. Sultan bin Ali Al Mamari", leadership, "Leadership/sultan-al-mamari.jpg"),
            EnsureMedia("Mr. Mohammed bin Moosa Al Harrasi", leadership, "Leadership/mohammed-al-harrasi.jpg"),
            EnsureMedia("Seven-year Sukuk press release", news, "News/sukuk.png"),
            EnsureMedia("EDO Siemens Energy MoU", news, "News/siemens.jpg"),
            EnsureMedia("Norway delegation", news, "News/norway.jpg"),
            EnsureMedia("EDO Q1 2025 financial statements", investor, "Investor/edo-q1-2025-financial-statements.pdf"));
    }

    private IMedia EnsureMediaFolder(string name, IMedia? parent)
    {
        string stablePath = parent is null ? name : $"{parent.Name}/{name}";
        Guid stableKey = StableGuid.Create($"media-folder:{stablePath}");
        IMedia? byKey = _mediaService.GetById(stableKey);
        if (byKey is not null)
        {
            ValidateMedia(byKey, name, UmbracoConstants.Conventions.MediaTypes.Folder, parent);
            return byKey;
        }

        IEnumerable<IMedia> siblings = parent is null
            ? _mediaService.GetRootMedia()
            : GetMediaChildren(parent.Id);
        IMedia? existing = siblings.FirstOrDefault(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase));
        if (existing is not null)
        {
            ValidateMedia(existing, name, UmbracoConstants.Conventions.MediaTypes.Folder, parent);
            return existing;
        }

        IMedia folder = _mediaService.CreateMedia(
            name,
            parent?.Id ?? UmbracoConstants.System.Root,
            UmbracoConstants.Conventions.MediaTypes.Folder,
            UserId);
        folder.Key = stableKey;
        SaveMedia(folder, $"media folder '{stablePath}'");
        return folder;
    }

    private IMedia EnsureMedia(string name, IMedia parent, string relativeAssetPath)
    {
        Guid stableKey = StableGuid.Create($"media:{relativeAssetPath.ToLowerInvariant()}");
        IMedia? byKey = _mediaService.GetById(stableKey);
        if (byKey is not null)
        {
            return byKey;
        }

        IMedia? existing = GetMediaChildren(parent.Id).FirstOrDefault(x =>
            string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase));
        if (existing is not null)
        {
            return existing;
        }

        string fullPath = Path.Combine(
            _hostingEnvironment.ContentRootPath,
            "PocBootstrap",
            "SeedAssets",
            relativeAssetPath.Replace('/', Path.DirectorySeparatorChar));
        if (!System.IO.File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Required EDO local seed asset is missing: {fullPath}", fullPath);
        }

        bool isPdf = string.Equals(Path.GetExtension(fullPath), ".pdf", StringComparison.OrdinalIgnoreCase);
        string mediaType = isPdf
            ? UmbracoConstants.Conventions.MediaTypes.File
            : UmbracoConstants.Conventions.MediaTypes.Image;
        IMedia media = _mediaService.CreateMedia(name, parent.Id, mediaType, UserId);
        media.Key = stableKey;
        using FileStream stream = System.IO.File.OpenRead(fullPath);
        media.SetValue(
            _mediaFileManager,
            _mediaUrlGenerators,
            _shortStringHelper,
            _contentTypeBaseServiceProvider,
            UmbracoConstants.Conventions.Media.File,
            Path.GetFileName(fullPath),
            stream,
            null,
            null);
        SaveMedia(media, $"media item '{name}'");
        return media;
    }

    private void SaveMedia(IMedia media, string description)
    {
        Attempt<OperationResult?> result = _mediaService.Save(media, UserId);
        if (!result.Success || result.Result is null || !result.Result.Success)
        {
            throw new InvalidOperationException($"EDO content seed could not save {description}.");
        }
    }

    private IEnumerable<IMedia> GetMediaChildren(int parentId)
    {
        long total;
        return _mediaService.GetPagedChildren(parentId, 0, int.MaxValue, out total);
    }

    private static void ValidateMedia(IMedia media, string name, string mediaTypeAlias, IMedia? parent)
    {
        if (!string.Equals(media.ContentType.Alias, mediaTypeAlias, StringComparison.Ordinal) ||
            media.ParentId != (parent?.Id ?? UmbracoConstants.System.Root))
        {
            throw new InvalidOperationException($"Existing media '{name}' is incompatible with the EDO seed structure.");
        }
    }

    private IContent EnsureContent(string name, string contentTypeAlias, IContent? parent, Action<IContent> populate)
    {
        string stablePath = parent is null ? name : $"{parent.Key:N}/{name}";
        Guid stableKey = StableGuid.Create($"content:{stablePath.ToLowerInvariant()}");
        IContent? byKey = _contentService.GetById(stableKey);
        if (byKey is not null)
        {
            ValidateContent(byKey, name, contentTypeAlias, parent);
            _logger.LogDebug("EDO seed retained existing content '{ContentName}' ({ContentKey}).", byKey.Name, byKey.Key);
            return byKey;
        }

        IEnumerable<IContent> siblings = parent is null
            ? _contentService.GetRootContent()
            : GetContentChildren(parent.Id);
        IContent? existing = siblings.FirstOrDefault(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase));
        if (existing is not null)
        {
            ValidateContent(existing, name, contentTypeAlias, parent);
            _logger.LogDebug("EDO seed retained existing content '{ContentName}' ({ContentKey}).", existing.Name, existing.Key);
            return existing;
        }

        IContent content = _contentService.Create(
            name,
            parent?.Id ?? UmbracoConstants.System.Root,
            contentTypeAlias,
            UserId);
        content.Key = stableKey;
        populate(content);

        OperationResult saveResult = _contentService.Save(content, UserId);
        if (!saveResult.Success)
        {
            _logger.LogError("Saving EDO seed node {Name} failed with result {Result}.", name, saveResult.Result);
            throw new InvalidOperationException($"EDO content seed could not save '{name}': {saveResult.Result}.");
        }

        PublishResult publishResult = _contentService.Publish(content, ["*"], UserId);
        if (!publishResult.Success)
        {
            _logger.LogError(
                "Publishing EDO seed node {Name} failed with result {Result}; invalid properties: {InvalidProperties}.",
                name,
                publishResult.Result,
                string.Join(", ", (publishResult.InvalidProperties ?? []).Select(x => x.Alias)));
            throw new InvalidOperationException($"EDO content seed could not publish '{name}': {publishResult.Result}.");
        }

        _createdContentKeys.Add(content.Key);
        return content;
    }

    private IEnumerable<IContent> GetContentChildren(int parentId)
    {
        long total;
        return _contentService.GetPagedChildren(parentId, 0, int.MaxValue, out total);
    }

    private static void ValidateContent(IContent content, string expectedName, string expectedAlias, IContent? parent)
    {
        if (!string.Equals(content.ContentType.Alias, expectedAlias, StringComparison.Ordinal) ||
            content.ParentId != (parent?.Id ?? UmbracoConstants.System.Root))
        {
            throw new InvalidOperationException(
                $"Existing content '{expectedName}' is incompatible with the EDO seed. " +
                $"Expected type '{expectedAlias}' under '{parent?.Name ?? "root"}'.");
        }
    }

    private void PopulateHome(IContent content, MediaSeed media)
    {
        Set(content, EdoAliases.Properties.MetaTitle, "Energy Oman | Sustainable energy for Oman");
        Set(content, EdoAliases.Properties.MetaDescription, "Energy Oman manages and grows the Sultanate's energy sector through efficient, sustainable investment.");
        Set(content, EdoAliases.Properties.HeroTitle, "Energy Oman");
        Set(content, EdoAliases.Properties.HeroSubtitle, "The first government-owned energy company to manage and grow Oman's energy sector.");
        Set(content, EdoAliases.Properties.HeroCta, Link("Discover Energy Oman", "/about-us/"));

        Set(content, EdoAliases.Properties.StrategicStatements, _blocks.Build(
            EdoKeys.ContentTypes.StrategicStatement,
            "home-strategic-statements",
            Block("independence", (EdoAliases.Properties.Heading, "Introduce independence"), (EdoAliases.Properties.Description, RichText("Essential governance and international industry best practices."))),
            Block("new-energies", (EdoAliases.Properties.Heading, "Advance new energies"), (EdoAliases.Properties.Description, RichText("Participate in Oman's global effort to reduce emissions and use its competitive advantage in new energies."))),
            Block("national-company", (EdoAliases.Properties.Heading, "Grow the energy sector"), (EdoAliases.Properties.Description, RichText("The first government-owned energy company created to manage and grow the energy sector."))),
            Block("efficiency", (EdoAliases.Properties.Heading, "Unlock potential value"), (EdoAliases.Properties.Description, RichText("Unlock potential value in oil and gas through synergies and efficiency.")))));

        Set(content, EdoAliases.Properties.MilestonesHeading, "Energy Oman Key Milestones");
        Set(content, EdoAliases.Properties.Milestones, _blocks.Build(
            EdoKeys.ContentTypes.MilestoneItem,
            "home-milestones",
            Milestone("december-2020", "December 2020", 1, "The establishment of Energy Development Oman SAOC through Royal Decree No. 128/2020."),
            Milestone("february-2021", "February 2021", 2, "The Government approved the transfer of all rights and obligations related to its shares in the Block 6 agreements in accordance with Royal Decree No. 21/2021."),
            Milestone("may-2021", "May 2021", 3, "The Block 6 gas concession agreement was signed between the Government and Energy Development Oman in accordance with Royal Decree No. 43/2021."),
            Milestone("august-2021", "August 2021", 4, "The Company secured its first US$2.5 billion financing transaction."),
            Milestone("december-2021", "December 2021", 5, "Eng. Mazin bin Rashid Al Lamki was appointed Chief Executive Officer."),
            Milestone("june-2022", "June 2022", 6, "Hydrogen Oman Company was established."),
            Milestone("august-2022", "August 2022", 7, "Fitch assigned EDO a BB rating, while Standard & Poor's assigned EDO a bbb- standalone credit profile."),
            Milestone("october-2022", "October 2022", 8, "Hydrogen Oman Co. (Hydrom) launched its brand identity and land allocation process.")));

        Set(content, EdoAliases.Properties.SubsidiariesHeading, "Our Subsidiaries");
        Set(content, EdoAliases.Properties.Subsidiaries, _blocks.Build(
            EdoKeys.ContentTypes.SubsidiaryItem,
            "home-subsidiaries",
            Block("hydrom", (EdoAliases.Properties.Name, "Hydrogen Oman (Hydrom)"), (EdoAliases.Properties.Logo, MediaPicker(media.Hydrom)), (EdoAliases.Properties.Description, "Leads the development of Oman's green hydrogen sector."), (EdoAliases.Properties.Link, Link("Visit Hydrom", "https://hydrom.om/"))),
            Block("onesupply", (EdoAliases.Properties.Name, "OneSupply"), (EdoAliases.Properties.Logo, MediaPicker(media.OneSupply)), (EdoAliases.Properties.Description, "A digital marketplace supporting efficient supply-chain participation."), (EdoAliases.Properties.Link, Link("Learn about OneSupply", "https://edoman.om/")))));
        Set(content, EdoAliases.Properties.ClosingHeading, "Powering Oman's sustainable energy future");
        Set(content, EdoAliases.Properties.ClosingText, RichText("Energy Oman pursues growth opportunities, financial independence and sustainable solutions aligned with Oman Vision 2040."));
    }

    private static BlockListValueBuilder.BlockSeed Milestone(string id, string date, int sequence, string description) =>
        Block(id,
            (EdoAliases.Properties.DateLabel, date),
            (EdoAliases.Properties.SequenceNumber, sequence),
            (EdoAliases.Properties.Description, description));

    private void PopulateAbout(IContent content, MediaSeed media)
    {
        Set(content, EdoAliases.Properties.PageTitle, "About Us");
        Set(content, EdoAliases.Properties.IntroHeading, "Energy Oman");
        Set(content, EdoAliases.Properties.IntroBody, RichText("Energy Oman was established in December 2020 by Royal Decree 128/2020 to realize efficiencies and pursue new growth opportunities in Oman's energy sector. It owns 60% of the Block 6 Oil Concession, 100% of the Block 6 Non-associated Gas Concession, and 100% of Hydrogen Oman LLC."));
        Set(content, EdoAliases.Properties.VisionHeading, "Vision");
        Set(content, EdoAliases.Properties.VisionText, "To achieve growth through global partnerships and create a sustainable future for energy in the Sultanate of Oman.");
        Set(content, EdoAliases.Properties.MissionHeading, "Mission");
        Set(content, EdoAliases.Properties.MissionText, "To create sustainable solutions that support the Sultanate's economic diversification objectives.");
        Set(content, EdoAliases.Properties.CeoMessage, RichText("At Energy Oman, we identify investment opportunities in the energy sector to maximize financial returns. We work with government and private organizations to create a conducive environment for foreign investment and support small and medium enterprises. Our principles promote transparency, mutual trust and committed engagement with all stakeholders."));
        Set(content, EdoAliases.Properties.CeoName, "Eng. Mazin bin Rashid Al Lamki");
        Set(content, EdoAliases.Properties.CeoPosition, "Chief Executive Officer");
        Set(content, EdoAliases.Properties.CeoImage, MediaPicker(media.Mazin));
        Set(content, EdoAliases.Properties.BoardHeading, "Board of Directors");
        Set(content, EdoAliases.Properties.BoardMembers, _blocks.Build(
            EdoKeys.ContentTypes.LeadershipPerson,
            "about-board",
            Person("salim-al-aufi", "H.E. Eng. Salim bin Nasser Al Aufi", "Minister of Energy and Minerals, Chairman of the Board", media.Salim, "H.E. Salim Al Aufi has more than 25 years of experience and held key government and energy-sector positions before his appointment as Minister of Energy and Minerals in June 2022. He holds a Master's degree in Petroleum Engineering from Heriot-Watt University."),
            Person("abdullah-al-harthy", "H.E. Abdullah bin Salim Al Harthy", "Undersecretary of the Ministry of Finance, Member", media.Abdullah, "H.E. Abdullah Al Harthy was appointed Undersecretary of the Ministry of Finance in July 2020 after senior finance, strategy and public-market roles. He holds an MBA from IMD and a Bachelor's degree in Finance from Sultan Qaboos University."),
            Person("mulham-al-jarf", "H.E. Mulham bin Basheer Al Jarf", "Deputy President of Oman Investment Authority for Investment, Member", media.Mulham, "Mulham Al Jarf has over 25 years of international business and finance experience, including executive roles at Oman Investment Authority and Oman Oil Company. He holds a Bachelor's degree in International Business and is registered with the Solicitors Regulation Authority in England and Wales.")));
        Set(content, EdoAliases.Properties.ManagementHeading, "Executive Management");
        Set(content, EdoAliases.Properties.ManagementMembers, _blocks.Build(
            EdoKeys.ContentTypes.LeadershipPerson,
            "about-management",
            Person("mazin-al-lamki", "Eng. Mazin bin Rashid Al Lamki", "Chief Executive Officer", media.Mazin, "Mazin Al Lamki has extensive international executive leadership experience across operational, technical and commercial roles in the oil and gas sector. He holds a Bachelor's degree in Mechanical Engineering from the University of Manchester and completed senior leadership and finance programs at IMD and London Business School."),
            Person("sultan-al-mamari", "Eng. Sultan bin Ali Al Mamari", "Chief Financial Officer", media.Sultan, "Sultan Al Mamari has nearly 20 years of experience in finance, strategy, investment and field development across major energy organizations. He holds a Bachelor's degree in Petroleum and Natural Gas Engineering from Sultan Qaboos University."),
            Person("mohammed-al-harrasi", "Mr. Mohammed bin Moosa Al Harrasi", "Chief Business and Corporate Support Officer", media.Mohammed, "Mohammed Al Harrasi has more than 17 years of leadership experience in oil, gas and investment. His work spans talent and leadership development, digital transformation, organizational design, budgeting and project management.")));
    }

    private static BlockListValueBuilder.BlockSeed Person(string id, string name, string position, IMedia photo, string biography) =>
        Block(id,
            (EdoAliases.Properties.Name, name),
            (EdoAliases.Properties.Position, position),
            (EdoAliases.Properties.Photo, MediaPicker(photo)),
            (EdoAliases.Properties.Biography, RichText(biography)));

    private static void PopulateCareers(IContent content)
    {
        Set(content, EdoAliases.Properties.PageTitle, "Careers");
        Set(content, EdoAliases.Properties.Heading, "Grow with us");
        Set(content, EdoAliases.Properties.Body, RichText("Energy Oman seeks to attract talented people who want to help build a sustainable energy future for the Sultanate. Follow our LinkedIn page for current opportunities and become part of our journey."));
        Set(content, EdoAliases.Properties.Cta, Link("View opportunities on LinkedIn", "https://www.linkedin.com/company/energy-development-oman/"));
    }

    private static void PopulateMediaPage(IContent content)
    {
        Set(content, EdoAliases.Properties.PageTitle, "Our News");
        Set(content, EdoAliases.Properties.Introduction, "Press releases and updates from Energy Oman.");
    }

    private void SeedNews(IContent parent, MediaSeed media)
    {
        EnsureContent("Energy Development Oman Successfully Issues Seven-Year US$750 Million Sukuk", EdoAliases.ContentTypes.NewsArticle, parent, content =>
        {
            Set(content, EdoAliases.Properties.Headline, "Energy Development Oman Successfully Issues Seven-Year US$750 Million Sukuk");
            Set(content, EdoAliases.Properties.PublicationDate, new DateTime(2024, 6, 28));
            Set(content, EdoAliases.Properties.Summary, "EDO announced a US$750 million Sukuk that was more than four times oversubscribed, reflecting broad international investor confidence.");
            Set(content, EdoAliases.Properties.FeaturedImage, MediaPicker(media.SukukNews));
            Set(content, EdoAliases.Properties.Body, RichText("Energy Development Oman issued a US$750 million Sukuk with a seven-year term and a profit rate of 5.662%. More than 115 orders were received from Europe, the United Kingdom, the United States, the Middle East and Asia. The transaction was EDO's second Sukuk issuance in nine months and reinforced its role as Oman's national energy champion."));
            Set(content, EdoAliases.Properties.Category, "Press Releases");
            Set(content, EdoAliases.Properties.ExternalUrl, "https://edoman.om/energy-development-oman-successfully-issues-seven-years-750-million-sukuk/");
        });

        EnsureContent("EDO Signs MoU with Siemens Energy in Oman", EdoAliases.ContentTypes.NewsArticle, parent, content =>
        {
            Set(content, EdoAliases.Properties.Headline, "EDO Signs MoU with Siemens Energy in Oman");
            Set(content, EdoAliases.Properties.PublicationDate, new DateTime(2023, 6, 1));
            Set(content, EdoAliases.Properties.Summary, "EDO and Siemens Energy agreed to accelerate research and development across sustainable energy technologies.");
            Set(content, EdoAliases.Properties.FeaturedImage, MediaPicker(media.SiemensNews));
            Set(content, EdoAliases.Properties.Body, RichText("Energy Development Oman and Siemens Energy signed a memorandum of understanding to accelerate research and development in Oman's energy sector. Their collaboration explores Power-to-X hydrogen, decarbonized heat, energy storage, fuel cells, blockchain and artificial intelligence applications, with an emphasis on practical pilot projects."));
            Set(content, EdoAliases.Properties.Category, "Press Releases");
            Set(content, EdoAliases.Properties.ExternalUrl, "https://edoman.om/edo-signs-mou-with-siemens-energy-in-oman/");
        });

        EnsureContent("Energy Development Oman Receives a Norway Delegation", EdoAliases.ContentTypes.NewsArticle, parent, content =>
        {
            Set(content, EdoAliases.Properties.Headline, "Energy Development Oman Receives a Norway Delegation");
            Set(content, EdoAliases.Properties.PublicationDate, new DateTime(2022, 9, 19));
            Set(content, EdoAliases.Properties.Summary, "EDO welcomed a Norwegian delegation for discussions on cooperation and opportunities in Oman's evolving energy sector.");
            Set(content, EdoAliases.Properties.FeaturedImage, MediaPicker(media.NorwayNews));
            Set(content, EdoAliases.Properties.Body, RichText("Energy Development Oman received a delegation from Norway as part of its engagement with international partners. The visit supported dialogue on investment, technology and collaboration opportunities connected with Oman's energy transition."));
            Set(content, EdoAliases.Properties.Category, "Press Releases");
            Set(content, EdoAliases.Properties.ExternalUrl, "https://edoman.om/our-news/");
        });
    }

    private void PopulateInvestorPage(IContent content)
    {
        Set(content, EdoAliases.Properties.PageTitle, "Investor Relations");
        Set(content, EdoAliases.Properties.Introduction, RichText("Explore investment possibilities with Energy Oman, the biggest player in the energy sector in the Sultanate. Access financial statements, ratings, presentations, funding programs, Sukuk information and ESG reporting."));
        Set(content, EdoAliases.Properties.QuickLinks, _blocks.Build(
            EdoKeys.ContentTypes.QuickLink,
            "investor-quick-links",
            Block("financial-statements", (EdoAliases.Properties.Label, EdoAliases.InvestorCategories.FinancialStatements), (EdoAliases.Properties.Link, Link(EdoAliases.InvestorCategories.FinancialStatements, "/investor-relations/#financial-statements"))),
            Block("credit-ratings", (EdoAliases.Properties.Label, EdoAliases.InvestorCategories.CreditRatings), (EdoAliases.Properties.Link, Link(EdoAliases.InvestorCategories.CreditRatings, "/investor-relations/#credit-ratings"))),
            Block("investor-presentations", (EdoAliases.Properties.Label, EdoAliases.InvestorCategories.InvestorPresentations), (EdoAliases.Properties.Link, Link(EdoAliases.InvestorCategories.InvestorPresentations, "/investor-relations/#investor-presentations"))),
            Block("investor-enquiries", (EdoAliases.Properties.Label, "Investor Enquiries"), (EdoAliases.Properties.Link, Link("Investor Enquiries", "/contact-us/")))));
        Set(content, EdoAliases.Properties.KeyFiguresHeading, "Key Numbers");
        Set(content, EdoAliases.Properties.KeyFiguresText, "Representative POC figures from the public investor page: Revenue — US$10,000 million; Adjusted EBITDA — US$5,000 million. Refer to published financial statements for authoritative reporting.");
    }

    private void SeedInvestorDocuments(IContent parent, MediaSeed media)
    {
        InvestorDocument(parent, "Q1 2025 Reviewed Financial Statements", EdoAliases.InvestorCategories.FinancialStatements, new DateTime(2025, 3, 31), "Unaudited interim condensed consolidated financial statements for the quarter ended 31 March 2025.", media.FinancialStatements, null, true);
        InvestorDocument(parent, "Fitch Affirms Energy Development Oman at BB+; Outlook Positive", EdoAliases.InvestorCategories.CreditRatings, new DateTime(2025, 8, 7), "Fitch Ratings' public rating action commentary.", null, "https://edoman.om/wp-content/uploads/2025/08/Fitch-Affirms-Energy-Development-Oman-at-BB_-Outlook-Positive.pdf", true);
        InvestorDocument(parent, "Investor Presentation — March 2025", EdoAliases.InvestorCategories.InvestorPresentations, new DateTime(2025, 3, 1), "A representative investor presentation from EDO's public investor library.", null, "https://edoman.om/investor-presentations/", true);
        InvestorDocument(parent, "EDO Sukuk Limited Trust Certificate Issuance Programme", EdoAliases.InvestorCategories.UsdPrograms, new DateTime(2024, 3, 1), "Programme information for international investors.", null, "https://edoman.om/usd-programs/", false);
        InvestorDocument(parent, "EDO OMR Sukuk Base Prospectus 2025", EdoAliases.InvestorCategories.OmrSukuk, new DateTime(2025, 9, 1), "Representative public OMR Sukuk offering documentation.", null, "https://edoman.om/wp-content/uploads/2025/09/EDO-Sukuk_Base-Prospectus_2025_Eng.pdf", true);
        InvestorDocument(parent, "PDO Sustainability Report 2024", EdoAliases.InvestorCategories.Esg, new DateTime(2025, 1, 1), "Representative ESG reporting available through EDO's investor relations site.", null, "https://edoman.om/esg/", true);
    }

    private void InvestorDocument(IContent parent, string name, string category, DateTime date, string description, IMedia? file, string? externalLink, bool featured)
    {
        EnsureContent(name, EdoAliases.ContentTypes.InvestorDocument, parent, content =>
        {
            Set(content, EdoAliases.Properties.Title, name);
            Set(content, EdoAliases.Properties.Category, DropdownValue(category));
            Set(content, EdoAliases.Properties.PublicationDate, date);
            Set(content, EdoAliases.Properties.Description, description);
            if (file is not null)
            {
                Set(content, EdoAliases.Properties.File, MediaPicker(file));
            }

            if (!string.IsNullOrWhiteSpace(externalLink))
            {
                Set(content, EdoAliases.Properties.ExternalLink, externalLink);
            }

            Set(content, EdoAliases.Properties.Featured, featured ? 1 : 0);
        });
    }

    private static void PopulateContact(IContent content)
    {
        Set(content, EdoAliases.Properties.PageTitle, "Contact Us");
        Set(content, EdoAliases.Properties.Introduction, RichText("For general enquiries, contact Energy Oman at info@edoman.om."));
        Set(content, EdoAliases.Properties.MapLatitude, "23.6169");
        Set(content, EdoAliases.Properties.MapLongitude, "58.5068");
        Set(content, EdoAliases.Properties.MapEmbedUrl, "https://www.google.com/maps?q=23.6169,58.5068&output=embed");
    }

    private void PopulateSettings(IContent content, MediaSeed media)
    {
        Set(content, EdoAliases.Properties.SiteName, "Energy Oman");
        Set(content, EdoAliases.Properties.Logo, MediaPicker(media.Logo));
        Set(content, EdoAliases.Properties.LogoLight, MediaPicker(media.LogoLight));
        Set(content, EdoAliases.Properties.Navigation, Navigation("main-navigation"));
        Set(content, EdoAliases.Properties.Address, "Mina Al-Fahal, Muscat, Sultanate of Oman");
        Set(content, EdoAliases.Properties.Telephone, "+968 22646800");
        Set(content, EdoAliases.Properties.Email, "info@edoman.om");
        Set(content, EdoAliases.Properties.PoBox, "P.O. Box 828, Postal Code 116, Mina Al Fahal");
        Set(content, EdoAliases.Properties.SocialLinks, _blocks.Build(
            EdoKeys.ContentTypes.SocialLink,
            "site-social-links",
            Block("linkedin", (EdoAliases.Properties.PlatformName, "LinkedIn"), (EdoAliases.Properties.Url, "https://www.linkedin.com/company/energy-development-oman/")),
            Block("instagram", (EdoAliases.Properties.PlatformName, "Instagram"), (EdoAliases.Properties.Url, "https://www.instagram.com/edoman.om/")),
            Block("x", (EdoAliases.Properties.PlatformName, "X"), (EdoAliases.Properties.Url, "https://x.com/EDOman_om")),
            Block("youtube", (EdoAliases.Properties.PlatformName, "YouTube"), (EdoAliases.Properties.Url, "https://www.youtube.com/@energydevelopmentoman"))));
        Set(content, EdoAliases.Properties.FooterLinks, Navigation("footer-navigation"));
        Set(content, EdoAliases.Properties.CopyrightText, $"Copyright © {DateTime.UtcNow.Year} Energy Oman");
    }

    private string Navigation(string stableId) => _blocks.Build(
        EdoKeys.ContentTypes.NavigationItem,
        stableId,
        Block("home", (EdoAliases.Properties.Label, "Home"), (EdoAliases.Properties.Link, Link("Home", "/"))),
        Block("about", (EdoAliases.Properties.Label, "About Us"), (EdoAliases.Properties.Link, Link("About Us", "/about-us/"))),
        Block("careers", (EdoAliases.Properties.Label, "Careers"), (EdoAliases.Properties.Link, Link("Careers", "/careers/"))),
        Block("media", (EdoAliases.Properties.Label, "Media"), (EdoAliases.Properties.Link, Link("Media", "/media/"))),
        Block("investor-relations", (EdoAliases.Properties.Label, "Investor Relations"), (EdoAliases.Properties.Link, Link("Investor Relations", "/investor-relations/"))),
        Block("contact", (EdoAliases.Properties.Label, "Contact Us"), (EdoAliases.Properties.Link, Link("Contact Us", "/contact-us/"))));

    private void VerifyTree(IContent home, params IContent[] expectedChildren)
    {
        IContent verifiedHome = _contentService.GetById(home.Key)
            ?? throw new InvalidOperationException("EDO content seed verification failed: Home was not found.");
        var actualChildren = GetContentChildren(verifiedHome.Id).ToArray();

        foreach (IContent expected in expectedChildren)
        {
            IContent? actual = actualChildren.SingleOrDefault(x => x.Key == expected.Key);
            if (actual is null)
            {
                throw new InvalidOperationException($"EDO content seed verification failed: '{expected.Name}' is missing beneath Home.");
            }
        }

        foreach (Guid createdKey in _createdContentKeys)
        {
            IContent created = _contentService.GetById(createdKey)
                ?? throw new InvalidOperationException($"EDO content seed verification failed: created node {createdKey} is missing.");
            if (!created.Published)
            {
                throw new InvalidOperationException($"EDO content seed verification failed: created node '{created.Name}' is not published.");
            }
        }

        VerifySeededChildren(
            expectedChildren.Single(x => x.ContentType.Alias == EdoAliases.ContentTypes.MediaListingPage),
            EdoAliases.ContentTypes.NewsArticle,
            3);
        VerifySeededChildren(
            expectedChildren.Single(x => x.ContentType.Alias == EdoAliases.ContentTypes.InvestorRelationsPage),
            EdoAliases.ContentTypes.InvestorDocument,
            6);
    }

    private void VerifySeededChildren(IContent parent, string alias, int minimum)
    {
        int count = GetContentChildren(parent.Id).Count(x => string.Equals(x.ContentType.Alias, alias, StringComparison.Ordinal));
        if (count < minimum)
        {
            throw new InvalidOperationException(
                $"EDO content seed verification failed: '{parent.Name}' has {count} '{alias}' children; expected at least {minimum}.");
        }
    }

    private static void Set(IContent content, string alias, object? value)
    {
        // Umbraco 17's DateOnly editor persists a JSON DTO, not a CLR DateTime or formatted string.
        // Normalizing here keeps seeded dates readable by the Delivery API value converter.
        if (alias == EdoAliases.Properties.PublicationDate && value is DateTime date)
        {
            value = DateOnlyValue(date);
        }

        content.SetValue(alias, value);
    }

    private static BlockListValueBuilder.BlockSeed Block(string stableId, params (string Alias, object? Value)[] values) =>
        new(stableId, values.ToDictionary(x => x.Alias, x => x.Value, StringComparer.Ordinal));

    private static string RichText(string textOrMarkup)
    {
        string markup = textOrMarkup.TrimStart().StartsWith('<')
            ? textOrMarkup
            : $"<p>{System.Net.WebUtility.HtmlEncode(textOrMarkup)}</p>";
        return JsonSerializer.Serialize(new { markup, blocks = (object?)null });
    }

    private static string Link(string title, string url) => JsonSerializer.Serialize(new[]
    {
        new { name = title, target = (string?)null, url, queryString = (string?)null, type = "External" }
    });

    private static string DropdownValue(string value) => JsonSerializer.Serialize(new[] { value });

    private static string DateOnlyValue(DateTime value) => JsonSerializer.Serialize(new
    {
        date = value.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
        timeZone = (string?)null
    });

    private static string MediaPicker(IMedia media) => JsonSerializer.Serialize(new[]
    {
        new
        {
            key = StableGuid.Create($"media-picker:{media.Key:N}"),
            mediaKey = media.Key,
            crops = Array.Empty<object>(),
            focalPoint = (object?)null
        }
    });

    private sealed record MediaSeed(
        IMedia Logo,
        IMedia LogoLight,
        IMedia Hydrom,
        IMedia OneSupply,
        IMedia Salim,
        IMedia Abdullah,
        IMedia Mulham,
        IMedia Mazin,
        IMedia Sultan,
        IMedia Mohammed,
        IMedia SukukNews,
        IMedia SiemensNews,
        IMedia NorwayNews,
        IMedia FinancialStatements);
}
