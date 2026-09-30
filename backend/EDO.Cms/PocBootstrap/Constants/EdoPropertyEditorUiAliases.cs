using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace EDO.Cms.PocBootstrap.Constants;

/// <summary>
/// Maps server-side property editor schemas to their Umbraco 17 backoffice UI manifests.
/// These aliases are intentionally different: "Umbraco.*" identifies the schema while
/// "Umb.PropertyEditorUi.*" identifies the web component used to edit its value.
/// </summary>
public static class EdoPropertyEditorUiAliases
{
    public const string RichText = "Umb.PropertyEditorUi.Tiptap";
    public const string MediaPicker = "Umb.PropertyEditorUi.MediaPicker";
    public const string MultiUrlPicker = "Umb.PropertyEditorUi.MultiUrlPicker";
    public const string DateOnlyPicker = "Umb.PropertyEditorUi.DateOnlyPicker";
    public const string Integer = "Umb.PropertyEditorUi.Integer";
    public const string Dropdown = "Umb.PropertyEditorUi.Dropdown";
    public const string BlockList = "Umb.PropertyEditorUi.BlockList";

    public static string ForEditor(string editorAlias) => editorAlias switch
    {
        UmbracoConstants.PropertyEditors.Aliases.RichText => RichText,
        UmbracoConstants.PropertyEditors.Aliases.MediaPicker3 => MediaPicker,
        UmbracoConstants.PropertyEditors.Aliases.MultiUrlPicker => MultiUrlPicker,
        UmbracoConstants.PropertyEditors.Aliases.DateOnly => DateOnlyPicker,
        UmbracoConstants.PropertyEditors.Aliases.Integer => Integer,
        UmbracoConstants.PropertyEditors.Aliases.DropDownListFlexible => Dropdown,
        UmbracoConstants.PropertyEditors.Aliases.BlockList => BlockList,
        _ => throw new ArgumentOutOfRangeException(
            nameof(editorAlias),
            editorAlias,
            "No Umbraco backoffice UI alias is configured for this property editor.")
    };
}
