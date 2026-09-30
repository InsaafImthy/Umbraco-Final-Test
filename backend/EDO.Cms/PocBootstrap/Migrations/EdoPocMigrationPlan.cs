using EDO.Cms.PocBootstrap.Constants;
using Umbraco.Cms.Core.Packaging;

namespace EDO.Cms.PocBootstrap.Migrations;

public sealed class EdoPocMigrationPlan : PackageMigrationPlan
{
    public EdoPocMigrationPlan()
        : base(EdoPocMigrationIds.PackageName, EdoPocMigrationIds.PlanName)
    {
    }

    // PackageMigrationPlan ignores saved state by default; retain it for one-time POC migrations.
    public override bool IgnoreCurrentState => false;

    protected override void DefinePlan()
    {
        To<CreateEdoSchemaMigration>(EdoKeys.CreateSchemaMigration);
        To<SeedEdoContentMigration>(EdoKeys.SeedContentMigration);
        To<CorrectEdoDateValuesMigration>(EdoKeys.CorrectDateValuesMigration);
        To<EnableCultureVariantsMigration>(EdoKeys.EnableCultureVariantsMigration);
        To<CorrectPropertyEditorUiAliasesMigration>(EdoKeys.CorrectPropertyEditorUiAliasesMigration);
    }
}
