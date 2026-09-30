using EDO.Cms.PocBootstrap.Constants;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Migrations;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace EDO.Cms.PocBootstrap.Migrations;

/// <summary>
/// Repairs data types created before the schema bootstrap distinguished property
/// editor schema aliases from their backoffice UI manifest aliases.
/// </summary>
public sealed class CorrectPropertyEditorUiAliasesMigration : AsyncMigrationBase
{
    private readonly IDataTypeService _dataTypeService;
    private readonly ILogger<CorrectPropertyEditorUiAliasesMigration> _logger;

    private static readonly (Guid Key, string UiAlias)[] Corrections =
    [
        (EdoKeys.DataTypes.RichText, EdoPropertyEditorUiAliases.RichText),
        (EdoKeys.DataTypes.MediaPicker, EdoPropertyEditorUiAliases.MediaPicker),
        (EdoKeys.DataTypes.MultiUrlPicker, EdoPropertyEditorUiAliases.MultiUrlPicker),
        (EdoKeys.DataTypes.Date, EdoPropertyEditorUiAliases.DateOnlyPicker),
        (EdoKeys.DataTypes.Integer, EdoPropertyEditorUiAliases.Integer),
        (EdoKeys.DataTypes.InvestorCategory, EdoPropertyEditorUiAliases.Dropdown),
        (EdoKeys.DataTypes.Navigation, EdoPropertyEditorUiAliases.BlockList),
        (EdoKeys.DataTypes.SocialLinks, EdoPropertyEditorUiAliases.BlockList),
        (EdoKeys.DataTypes.StrategicStatements, EdoPropertyEditorUiAliases.BlockList),
        (EdoKeys.DataTypes.Milestones, EdoPropertyEditorUiAliases.BlockList),
        (EdoKeys.DataTypes.Subsidiaries, EdoPropertyEditorUiAliases.BlockList),
        (EdoKeys.DataTypes.Leadership, EdoPropertyEditorUiAliases.BlockList),
        (EdoKeys.DataTypes.QuickLinks, EdoPropertyEditorUiAliases.BlockList)
    ];

    public CorrectPropertyEditorUiAliasesMigration(
        IMigrationContext context,
        IDataTypeService dataTypeService,
        ILogger<CorrectPropertyEditorUiAliasesMigration> logger)
        : base(context)
    {
        _dataTypeService = dataTypeService;
        _logger = logger;
    }

    protected override async Task MigrateAsync()
    {
        int repaired = 0;
        foreach ((Guid key, string uiAlias) in Corrections)
        {
            IDataType dataType = await _dataTypeService.GetAsync(key)
                ?? throw new InvalidOperationException($"EDO property editor UI correction stopped: data type {key} is missing.");

            if (string.Equals(dataType.EditorUiAlias, uiAlias, StringComparison.Ordinal))
            {
                continue;
            }

            dataType.EditorUiAlias = uiAlias;
            await _dataTypeService.UpdateAsync(dataType, UmbracoConstants.Security.SuperUserKey);
            repaired++;
        }

        _logger.LogInformation(
            "EDO property editor UI correction repaired {RepairedCount} generated data types.",
            repaired);
    }
}
