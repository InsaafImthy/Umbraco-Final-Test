using EDO.Cms.PocBootstrap.Constants;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Infrastructure.Migrations;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace EDO.Cms.PocBootstrap.Migrations;

public sealed class CreateEdoSchemaMigration : AsyncMigrationBase
{
    private readonly IContentTypeService _contentTypeService;
    private readonly IDataTypeService _dataTypeService;
    private readonly PropertyEditorCollection _propertyEditors;
    private readonly IConfigurationEditorJsonSerializer _configurationSerializer;
    private readonly IShortStringHelper _shortStringHelper;

    public CreateEdoSchemaMigration(
        IMigrationContext context,
        IContentTypeService contentTypeService,
        IDataTypeService dataTypeService,
        PropertyEditorCollection propertyEditors,
        IConfigurationEditorJsonSerializer configurationSerializer,
        IShortStringHelper shortStringHelper)
        : base(context)
    {
        _contentTypeService = contentTypeService;
        _dataTypeService = dataTypeService;
        _propertyEditors = propertyEditors;
        _configurationSerializer = configurationSerializer;
        _shortStringHelper = shortStringHelper;
    }

    protected override async Task MigrateAsync()
    {
        // 1. Reusable/basic data types.
        IDataType textString = await GetRequiredBuiltInDataTypeAsync(UmbracoConstants.DataTypes.Guids.TextstringGuid, "Textstring");
        IDataType textArea = await GetRequiredBuiltInDataTypeAsync(UmbracoConstants.DataTypes.Guids.TextareaGuid, "Textarea");
        IDataType trueFalse = await GetRequiredBuiltInDataTypeAsync(UmbracoConstants.DataTypes.Guids.CheckboxGuid, "True/False");

        IDataType richText = await EnsureDataTypeAsync(
            EdoKeys.DataTypes.RichText,
            EdoAliases.DataTypes.RichText,
            UmbracoConstants.PropertyEditors.Aliases.RichText,
            new RichTextConfiguration { Blocks = [] });
        IDataType mediaPicker = await EnsureDataTypeAsync(
            EdoKeys.DataTypes.MediaPicker,
            EdoAliases.DataTypes.MediaPicker,
            UmbracoConstants.PropertyEditors.Aliases.MediaPicker3,
            new MediaPicker3Configuration
            {
                Multiple = false,
                ValidationLimit = new MediaPicker3Configuration.NumberRange { Min = 0, Max = 1 },
                Crops = []
            });
        IDataType multiUrlPicker = await EnsureDataTypeAsync(
            EdoKeys.DataTypes.MultiUrlPicker,
            EdoAliases.DataTypes.MultiUrlPicker,
            UmbracoConstants.PropertyEditors.Aliases.MultiUrlPicker,
            new Dictionary<string, object> { ["minNumber"] = 0, ["maxNumber"] = 1 });
        IDataType date = await EnsureDataTypeAsync(
            EdoKeys.DataTypes.Date,
            EdoAliases.DataTypes.Date,
            UmbracoConstants.PropertyEditors.Aliases.DateOnly);
        IDataType integer = await EnsureDataTypeAsync(
            EdoKeys.DataTypes.Integer,
            EdoAliases.DataTypes.Integer,
            UmbracoConstants.PropertyEditors.Aliases.Integer);
        IDataType investorCategory = await EnsureDataTypeAsync(
            EdoKeys.DataTypes.InvestorCategory,
            EdoAliases.DataTypes.InvestorCategory,
            UmbracoConstants.PropertyEditors.Aliases.DropDownListFlexible,
            new ValueListConfiguration
            {
                Items =
                [
                    EdoAliases.InvestorCategories.FinancialStatements,
                    EdoAliases.InvestorCategories.CreditRatings,
                    EdoAliases.InvestorCategories.InvestorPresentations,
                    EdoAliases.InvestorCategories.UsdPrograms,
                    EdoAliases.InvestorCategories.OmrSukuk,
                    EdoAliases.InvestorCategories.Esg
                ]
            });

        // 2. Element types.
        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.NavigationItem,
            EdoAliases.ContentTypes.NavigationItem,
            "Navigation Item",
            true,
            false,
            "icon-link",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Label", EdoAliases.Properties.Label, textString, true),
                Property("Link", EdoAliases.Properties.Link, multiUrlPicker, true))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.SocialLink,
            EdoAliases.ContentTypes.SocialLink,
            "Social Link",
            true,
            false,
            "icon-share",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Platform", EdoAliases.Properties.PlatformName, textString),
                Property("URL", EdoAliases.Properties.Url, textString))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.StrategicStatement,
            EdoAliases.ContentTypes.StrategicStatement,
            "Strategic Statement",
            true,
            false,
            "icon-lightbulb",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Heading", EdoAliases.Properties.Heading, textString),
                Property("Description", EdoAliases.Properties.Description, richText),
                Property("Image", EdoAliases.Properties.Image, mediaPicker))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.MilestoneItem,
            EdoAliases.ContentTypes.MilestoneItem,
            "Milestone Item",
            true,
            false,
            "icon-calendar",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Date Label", EdoAliases.Properties.DateLabel, textString),
                Property("Sequence Number", EdoAliases.Properties.SequenceNumber, integer),
                Property("Description", EdoAliases.Properties.Description, textArea),
                Property("Image", EdoAliases.Properties.Image, mediaPicker))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.SubsidiaryItem,
            EdoAliases.ContentTypes.SubsidiaryItem,
            "Subsidiary Item",
            true,
            false,
            "icon-company",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Name", EdoAliases.Properties.Name, textString),
                Property("Logo", EdoAliases.Properties.Logo, mediaPicker),
                Property("Description", EdoAliases.Properties.Description, textArea),
                Property("Link", EdoAliases.Properties.Link, multiUrlPicker))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.LeadershipPerson,
            EdoAliases.ContentTypes.LeadershipPerson,
            "Leadership Person",
            true,
            false,
            "icon-user",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Name", EdoAliases.Properties.Name, textString),
                Property("Position", EdoAliases.Properties.Position, textString),
                Property("Photo", EdoAliases.Properties.Photo, mediaPicker),
                Property("Biography", EdoAliases.Properties.Biography, richText),
                Property("LinkedIn URL", EdoAliases.Properties.LinkedinUrl, textString))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.QuickLink,
            EdoAliases.ContentTypes.QuickLink,
            "Quick Link",
            true,
            false,
            "icon-link",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Label", EdoAliases.Properties.Label, textString),
                Property("Link", EdoAliases.Properties.Link, multiUrlPicker))]));

        // 3. Block list data types, after their element type dependencies exist.
        IDataType navigation = await EnsureBlockListAsync(EdoKeys.DataTypes.Navigation, EdoAliases.DataTypes.Navigation, EdoKeys.ContentTypes.NavigationItem);
        IDataType socialLinks = await EnsureBlockListAsync(EdoKeys.DataTypes.SocialLinks, EdoAliases.DataTypes.SocialLinks, EdoKeys.ContentTypes.SocialLink);
        IDataType strategicStatements = await EnsureBlockListAsync(EdoKeys.DataTypes.StrategicStatements, EdoAliases.DataTypes.StrategicStatements, EdoKeys.ContentTypes.StrategicStatement);
        IDataType milestones = await EnsureBlockListAsync(EdoKeys.DataTypes.Milestones, EdoAliases.DataTypes.Milestones, EdoKeys.ContentTypes.MilestoneItem);
        IDataType subsidiaries = await EnsureBlockListAsync(EdoKeys.DataTypes.Subsidiaries, EdoAliases.DataTypes.Subsidiaries, EdoKeys.ContentTypes.SubsidiaryItem);
        IDataType leadership = await EnsureBlockListAsync(EdoKeys.DataTypes.Leadership, EdoAliases.DataTypes.Leadership, EdoKeys.ContentTypes.LeadershipPerson);
        IDataType quickLinks = await EnsureBlockListAsync(EdoKeys.DataTypes.QuickLinks, EdoAliases.DataTypes.QuickLinks, EdoKeys.ContentTypes.QuickLink);

        // 4. Public document types. They intentionally have no templates.
        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.HomePage,
            EdoAliases.ContentTypes.HomePage,
            "Home Page",
            false,
            true,
            "icon-home",
            [
                Group("SEO", EdoAliases.Groups.Seo,
                    Property("Meta Title", EdoAliases.Properties.MetaTitle, textString),
                    Property("Meta Description", EdoAliases.Properties.MetaDescription, textArea)),
                Group("Hero", EdoAliases.Groups.Hero,
                    Property("Hero Title", EdoAliases.Properties.HeroTitle, textString),
                    Property("Hero Subtitle", EdoAliases.Properties.HeroSubtitle, textArea),
                    Property("Hero Background", EdoAliases.Properties.HeroBackground, mediaPicker),
                    Property("Hero Video", EdoAliases.Properties.HeroVideo, mediaPicker),
                    Property("Hero CTA", EdoAliases.Properties.HeroCta, multiUrlPicker)),
                Group("Strategic Statements", EdoAliases.Groups.StrategicStatements,
                    Property("Strategic Statements", EdoAliases.Properties.StrategicStatements, strategicStatements)),
                Group("Milestones", EdoAliases.Groups.Milestones,
                    Property("Milestones Heading", EdoAliases.Properties.MilestonesHeading, textString),
                    Property("Milestones", EdoAliases.Properties.Milestones, milestones)),
                Group("Subsidiaries", EdoAliases.Groups.Subsidiaries,
                    Property("Subsidiaries Heading", EdoAliases.Properties.SubsidiariesHeading, textString),
                    Property("Subsidiaries", EdoAliases.Properties.Subsidiaries, subsidiaries)),
                Group("Closing", EdoAliases.Groups.Closing,
                    Property("Closing Heading", EdoAliases.Properties.ClosingHeading, textString),
                    Property("Closing Text", EdoAliases.Properties.ClosingText, richText),
                    Property("Closing Media", EdoAliases.Properties.ClosingMedia, mediaPicker))
            ]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.SiteSettings,
            EdoAliases.ContentTypes.SiteSettings,
            "Site Settings",
            false,
            false,
            "icon-settings",
            [
                Group("Site Identity", EdoAliases.Groups.SiteIdentity,
                    Property("Site Name", EdoAliases.Properties.SiteName, textString),
                    Property("Logo", EdoAliases.Properties.Logo, mediaPicker),
                    Property("Logo Light", EdoAliases.Properties.LogoLight, mediaPicker)),
                Group("Header", EdoAliases.Groups.Header,
                    Property("Navigation", EdoAliases.Properties.Navigation, navigation)),
                Group("Contact", EdoAliases.Groups.Contact,
                    Property("Address", EdoAliases.Properties.Address, textArea),
                    Property("Telephone", EdoAliases.Properties.Telephone, textString),
                    Property("Email", EdoAliases.Properties.Email, textString),
                    Property("PO Box", EdoAliases.Properties.PoBox, textString)),
                Group("Social", EdoAliases.Groups.Social,
                    Property("Social Links", EdoAliases.Properties.SocialLinks, socialLinks)),
                Group("Footer", EdoAliases.Groups.Footer,
                    Property("Footer Links", EdoAliases.Properties.FooterLinks, navigation),
                    Property("Copyright Text", EdoAliases.Properties.CopyrightText, textString))
            ]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.AboutPage,
            EdoAliases.ContentTypes.AboutPage,
            "About Page",
            false,
            false,
            "icon-info",
            [
                Group("Introduction", EdoAliases.Groups.Introduction,
                    Property("Page Title", EdoAliases.Properties.PageTitle, textString),
                    Property("Introduction Heading", EdoAliases.Properties.IntroHeading, textString),
                    Property("Introduction Body", EdoAliases.Properties.IntroBody, richText),
                    Property("Introduction Media", EdoAliases.Properties.IntroMedia, mediaPicker)),
                Group("Vision / Mission", EdoAliases.Groups.VisionMission,
                    Property("Vision Heading", EdoAliases.Properties.VisionHeading, textString),
                    Property("Vision Text", EdoAliases.Properties.VisionText, textArea),
                    Property("Mission Heading", EdoAliases.Properties.MissionHeading, textString),
                    Property("Mission Text", EdoAliases.Properties.MissionText, textArea)),
                Group("CEO", EdoAliases.Groups.Ceo,
                    Property("CEO Message", EdoAliases.Properties.CeoMessage, richText),
                    Property("CEO Name", EdoAliases.Properties.CeoName, textString),
                    Property("CEO Position", EdoAliases.Properties.CeoPosition, textString),
                    Property("CEO Image", EdoAliases.Properties.CeoImage, mediaPicker)),
                Group("Leadership", EdoAliases.Groups.Leadership,
                    Property("Board Heading", EdoAliases.Properties.BoardHeading, textString),
                    Property("Board Members", EdoAliases.Properties.BoardMembers, leadership),
                    Property("Management Heading", EdoAliases.Properties.ManagementHeading, textString),
                    Property("Management Members", EdoAliases.Properties.ManagementMembers, leadership))
            ]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.CareersPage,
            EdoAliases.ContentTypes.CareersPage,
            "Careers Page",
            false,
            false,
            "icon-people",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Page Title", EdoAliases.Properties.PageTitle, textString),
                Property("Heading", EdoAliases.Properties.Heading, textString),
                Property("Body", EdoAliases.Properties.Body, richText),
                Property("Image", EdoAliases.Properties.Image, mediaPicker),
                Property("CTA", EdoAliases.Properties.Cta, multiUrlPicker))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.MediaListingPage,
            EdoAliases.ContentTypes.MediaListingPage,
            "Media Listing Page",
            false,
            false,
            "icon-newspaper",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Page Title", EdoAliases.Properties.PageTitle, textString),
                Property("Introduction", EdoAliases.Properties.Introduction, textArea))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.NewsArticle,
            EdoAliases.ContentTypes.NewsArticle,
            "News Article",
            false,
            false,
            "icon-newspaper",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Headline", EdoAliases.Properties.Headline, textString),
                Property("Publication Date", EdoAliases.Properties.PublicationDate, date),
                Property("Summary", EdoAliases.Properties.Summary, textArea),
                Property("Featured Image", EdoAliases.Properties.FeaturedImage, mediaPicker),
                Property("Body", EdoAliases.Properties.Body, richText),
                Property("Category", EdoAliases.Properties.Category, textString),
                Property("Document Attachment", EdoAliases.Properties.DocumentAttachment, mediaPicker),
                Property("External URL", EdoAliases.Properties.ExternalUrl, textString))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.InvestorRelationsPage,
            EdoAliases.ContentTypes.InvestorRelationsPage,
            "Investor Relations Page",
            false,
            false,
            "icon-coins",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Page Title", EdoAliases.Properties.PageTitle, textString),
                Property("Introduction", EdoAliases.Properties.Introduction, richText),
                Property("Quick Links", EdoAliases.Properties.QuickLinks, quickLinks),
                Property("Key Figures Heading", EdoAliases.Properties.KeyFiguresHeading, textString),
                Property("Key Figures Text", EdoAliases.Properties.KeyFiguresText, textArea))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.InvestorDocument,
            EdoAliases.ContentTypes.InvestorDocument,
            "Investor Document",
            false,
            false,
            "icon-document",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Title", EdoAliases.Properties.Title, textString),
                Property("Category", EdoAliases.Properties.Category, investorCategory),
                Property("Publication Date", EdoAliases.Properties.PublicationDate, date),
                Property("Description", EdoAliases.Properties.Description, textArea),
                Property("File", EdoAliases.Properties.File, mediaPicker),
                Property("Thumbnail", EdoAliases.Properties.Thumbnail, mediaPicker),
                Property("External Link", EdoAliases.Properties.ExternalLink, textString),
                Property("Featured", EdoAliases.Properties.Featured, trueFalse))]));

        await EnsureContentTypeAsync(new ContentTypeDefinition(
            EdoKeys.ContentTypes.ContactPage,
            EdoAliases.ContentTypes.ContactPage,
            "Contact Page",
            false,
            false,
            "icon-map-location",
            [Group("Content", EdoAliases.Groups.Content,
                Property("Page Title", EdoAliases.Properties.PageTitle, textString),
                Property("Introduction", EdoAliases.Properties.Introduction, richText),
                Property("Map Latitude", EdoAliases.Properties.MapLatitude, textString),
                Property("Map Longitude", EdoAliases.Properties.MapLongitude, textString),
                Property("Map Embed URL", EdoAliases.Properties.MapEmbedUrl, textString))]));

        // 5. Parent/child restrictions, after every referenced document type exists.
        await SetAllowedChildrenAsync(EdoKeys.ContentTypes.HomePage,
            (EdoKeys.ContentTypes.AboutPage, EdoAliases.ContentTypes.AboutPage),
            (EdoKeys.ContentTypes.CareersPage, EdoAliases.ContentTypes.CareersPage),
            (EdoKeys.ContentTypes.MediaListingPage, EdoAliases.ContentTypes.MediaListingPage),
            (EdoKeys.ContentTypes.InvestorRelationsPage, EdoAliases.ContentTypes.InvestorRelationsPage),
            (EdoKeys.ContentTypes.ContactPage, EdoAliases.ContentTypes.ContactPage),
            (EdoKeys.ContentTypes.SiteSettings, EdoAliases.ContentTypes.SiteSettings));
        await SetAllowedChildrenAsync(EdoKeys.ContentTypes.MediaListingPage,
            (EdoKeys.ContentTypes.NewsArticle, EdoAliases.ContentTypes.NewsArticle));
        await SetAllowedChildrenAsync(EdoKeys.ContentTypes.InvestorRelationsPage,
            (EdoKeys.ContentTypes.InvestorDocument, EdoAliases.ContentTypes.InvestorDocument));

    }

    private Task<IDataType> EnsureBlockListAsync(Guid key, string name, Guid elementTypeKey) =>
        EnsureDataTypeAsync(
            key,
            name,
            UmbracoConstants.PropertyEditors.Aliases.BlockList,
            new BlockListConfiguration
            {
                Blocks = [new BlockListConfiguration.BlockConfiguration { ContentElementTypeKey = elementTypeKey }],
                ValidationLimit = new BlockListConfiguration.NumberRange { Min = 0 },
            });

    private async Task<IDataType> EnsureDataTypeAsync(Guid key, string name, string editorAlias, object? configuration = null)
    {
        string editorUiAlias = EdoPropertyEditorUiAliases.ForEditor(editorAlias);
        IDataType? byKey = await _dataTypeService.GetAsync(key);
        IDataType? byName = await _dataTypeService.GetAsync(name);

        if (byKey is not null && !string.Equals(byKey.Name, name, StringComparison.Ordinal))
        {
            throw Incompatible($"Data type key {key} is already used by '{byKey.Name}', expected '{name}'.");
        }

        if (byName is not null && byName.Key != key)
        {
            throw Incompatible($"Data type name '{name}' already exists with key {byName.Key}, expected {key}.");
        }

        IDataType? existing = byKey ?? byName;
        if (existing is not null)
        {
            if (!string.Equals(existing.EditorAlias, editorAlias, StringComparison.Ordinal))
            {
                throw Incompatible($"Data type '{name}' uses editor '{existing.EditorAlias}', expected '{editorAlias}'.");
            }

            if (!string.Equals(existing.EditorUiAlias, editorUiAlias, StringComparison.Ordinal))
            {
                existing.EditorUiAlias = editorUiAlias;
                await _dataTypeService.UpdateAsync(existing, UmbracoConstants.Security.SuperUserKey);
            }

            ValidateExistingDataTypeConfiguration(existing, configuration);
            return await _dataTypeService.GetAsync(key)
                ?? throw Incompatible($"Data type '{name}' was not found after it was updated.");
        }

        if (!_propertyEditors.TryGet(editorAlias, out IDataEditor? editor) || editor is null)
        {
            throw Incompatible($"Required built-in property editor '{editorAlias}' is not registered.");
        }

        object configurationObject = configuration ?? editor.DefaultConfiguration ?? new Dictionary<string, object>();
        var dataType = new DataType(editor, _configurationSerializer, UmbracoConstants.System.Root)
        {
            Key = key,
            Name = name,
            EditorUiAlias = editorUiAlias,
            DatabaseType = ValueTypes.ToStorageType(editor.GetValueEditor().ValueType),
            ConfigurationData = editor.GetConfigurationEditor().FromConfigurationObject(configurationObject, _configurationSerializer)
        };

        IEnumerable<System.ComponentModel.DataAnnotations.ValidationResult> validationErrors =
            _dataTypeService.ValidateConfigurationData(dataType);
        string[] messages = validationErrors
            .Where(x => x != System.ComponentModel.DataAnnotations.ValidationResult.Success)
            .Select(x => x.ErrorMessage ?? "Unknown configuration error")
            .ToArray();
        if (messages.Length > 0)
        {
            throw Incompatible($"Data type '{name}' has invalid configuration: {string.Join("; ", messages)}");
        }

        await _dataTypeService.CreateAsync(dataType, UmbracoConstants.Security.SuperUserKey);
        return await _dataTypeService.GetAsync(key)
            ?? throw Incompatible($"Data type '{name}' was not found after it was saved.");
    }

    private async Task<IDataType> GetRequiredBuiltInDataTypeAsync(Guid key, string description) =>
        await _dataTypeService.GetAsync(key)
        ?? throw Incompatible($"Required built-in {description} data type ({key}) was not found.");

    private static void ValidateExistingDataTypeConfiguration(IDataType existing, object? expected)
    {
        switch (expected)
        {
            case BlockListConfiguration expectedBlocks
                when existing.ConfigurationObject is not BlockListConfiguration actualBlocks ||
                     actualBlocks.Blocks.Select(x => x.ContentElementTypeKey)
                         .SequenceEqual(expectedBlocks.Blocks.Select(x => x.ContentElementTypeKey)) is false:
                throw Incompatible($"Block list data type '{existing.Name}' has incompatible element type references.");

            case ValueListConfiguration expectedValues
                when existing.ConfigurationObject is not ValueListConfiguration actualValues ||
                     actualValues.Items.SequenceEqual(expectedValues.Items, StringComparer.Ordinal) is false:
                throw Incompatible($"Value-list data type '{existing.Name}' has incompatible values.");

            case MediaPicker3Configuration expectedMedia
                when existing.ConfigurationObject is not MediaPicker3Configuration actualMedia ||
                     actualMedia.Multiple != expectedMedia.Multiple ||
                     actualMedia.ValidationLimit.Max != expectedMedia.ValidationLimit.Max:
                throw Incompatible($"Media picker data type '{existing.Name}' has incompatible selection limits.");

            case IDictionary<string, object> expectedDictionary:
                foreach ((string key, object expectedValue) in expectedDictionary)
                {
                    if (!existing.ConfigurationData.TryGetValue(key, out object? actualValue) ||
                        !string.Equals(Convert.ToString(actualValue), Convert.ToString(expectedValue), StringComparison.Ordinal))
                    {
                        throw Incompatible($"Data type '{existing.Name}' has incompatible configuration value '{key}'.");
                    }
                }

                break;
        }
    }

    private async Task<IContentType> EnsureContentTypeAsync(ContentTypeDefinition definition)
    {
        IContentType? byKey = _contentTypeService.Get(definition.Key);
        IContentType? byAlias = _contentTypeService.Get(definition.Alias);

        if (byKey is not null && !string.Equals(byKey.Alias, definition.Alias, StringComparison.Ordinal))
        {
            throw Incompatible($"Content type key {definition.Key} is already used by alias '{byKey.Alias}', expected '{definition.Alias}'.");
        }

        if (byAlias is not null && byAlias.Key != definition.Key)
        {
            throw Incompatible($"Content type alias '{definition.Alias}' already exists with key {byAlias.Key}, expected {definition.Key}.");
        }

        bool isNew = byKey is null && byAlias is null;
        IContentType contentType = byKey ?? byAlias ?? new ContentType(_shortStringHelper, UmbracoConstants.System.Root)
        {
            Key = definition.Key,
            Alias = definition.Alias,
            Name = definition.Name,
            Icon = definition.Icon,
            IsElement = definition.IsElement,
            AllowedAsRoot = definition.AllowedAsRoot,
            Variations = ContentVariation.Nothing,
            AllowedTemplates = []
        };

        if (contentType.IsElement != definition.IsElement)
        {
            throw Incompatible($"Content type '{definition.Alias}' has IsElement={contentType.IsElement}, expected {definition.IsElement}.");
        }

        if (!string.Equals(contentType.Name, definition.Name, StringComparison.Ordinal))
        {
            throw Incompatible($"Content type '{definition.Alias}' is named '{contentType.Name}', expected '{definition.Name}'.");
        }

        var seenAliases = new HashSet<string>(StringComparer.Ordinal);
        foreach (PropertyGroupDefinition group in definition.Groups)
        {
            PropertyGroup? existingGroup = contentType.PropertyGroups.FirstOrDefault(x =>
                string.Equals(x.Alias, group.Alias, StringComparison.Ordinal));
            if (existingGroup is null)
            {
                contentType.AddPropertyGroup(group.Name, group.Alias);
            }
            else if (!string.Equals(existingGroup.Name, group.Name, StringComparison.Ordinal))
            {
                throw Incompatible($"Group '{group.Alias}' on '{definition.Alias}' is named '{existingGroup.Name}', expected '{group.Name}'.");
            }

            int sortOrder = 0;
            foreach (PropertyDefinition property in group.Properties)
            {
                if (!seenAliases.Add(property.Alias))
                {
                    throw Incompatible($"Schema definition for '{definition.Alias}' repeats property alias '{property.Alias}'.");
                }

                IPropertyType? existingProperty = contentType.PropertyTypes.FirstOrDefault(x =>
                    string.Equals(x.Alias, property.Alias, StringComparison.Ordinal));
                if (existingProperty is not null)
                {
                    if (existingProperty.DataTypeKey != property.DataType.Key || existingProperty.Mandatory != property.Mandatory)
                    {
                        throw Incompatible(
                            $"Property '{definition.Alias}.{property.Alias}' is incompatible. " +
                            $"Expected data type {property.DataType.Key} and mandatory={property.Mandatory}; " +
                            $"found {existingProperty.DataTypeKey} and mandatory={existingProperty.Mandatory}.");
                    }

                    continue;
                }

                var propertyType = new PropertyType(_shortStringHelper, property.DataType)
                {
                    Name = property.Name,
                    Alias = property.Alias,
                    Mandatory = property.Mandatory,
                    SortOrder = sortOrder++
                };
                contentType.AddPropertyType(propertyType, group.Name, group.Alias);
            }
        }

        if (isNew)
        {
            await _contentTypeService.CreateAsync(contentType, UmbracoConstants.Security.SuperUserKey);
        }
        else
        {
            await _contentTypeService.UpdateAsync(contentType, UmbracoConstants.Security.SuperUserKey);
        }

        return _contentTypeService.Get(definition.Key)
            ?? throw Incompatible($"Content type '{definition.Alias}' was not found after it was saved.");
    }

    private async Task SetAllowedChildrenAsync(Guid parentKey, params (Guid Key, string Alias)[] children)
    {
        IContentType parent = _contentTypeService.Get(parentKey)
            ?? throw Incompatible($"Cannot configure children because parent content type {parentKey} does not exist.");
        parent.AllowedContentTypes = children
            .Select((child, index) => new ContentTypeSort(child.Key, index, child.Alias))
            .ToArray();
        await _contentTypeService.UpdateAsync(parent, UmbracoConstants.Security.SuperUserKey);
    }

    private static InvalidOperationException Incompatible(string message) =>
        new($"EDO schema migration stopped: {message}");

    private static PropertyDefinition Property(string name, string alias, IDataType dataType, bool mandatory = false) =>
        new(name, alias, dataType, mandatory);

    private static PropertyGroupDefinition Group(string name, string alias, params PropertyDefinition[] properties) =>
        new(name, alias, properties);

    private sealed record PropertyDefinition(string Name, string Alias, IDataType DataType, bool Mandatory);
    private sealed record PropertyGroupDefinition(string Name, string Alias, IReadOnlyList<PropertyDefinition> Properties);
    private sealed record ContentTypeDefinition(
        Guid Key,
        string Alias,
        string Name,
        bool IsElement,
        bool AllowedAsRoot,
        string Icon,
        IReadOnlyList<PropertyGroupDefinition> Groups);
}
