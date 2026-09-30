using EDO.Cms.PocBootstrap.Migrations;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace EDO.Cms.PocBootstrap;

public sealed class EdoPocComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder) => builder.PackageMigrationPlans().Add(typeof(EdoPocMigrationPlan));
}
