# English and Arabic variants

The POC uses Umbraco's native culture-variant model and Content Delivery API. It does not introduce a translation table, custom localization controller, or client-side machine translation.

## Migration history

`EdoPocMigrationPlan` retains its completed states and appends one new state:

```text
CREATE_SCHEMA -> SEED_CONTENT -> CORRECT_DATE_VALUES -> ENABLE_CULTURE_VARIANTS
```

`EnableCultureVariantsMigration` is keyed by `f33dc126-6b7b-4f78-81cd-635f09aaed04`. It uses `ILanguageService` to ensure the exact cultures `en` and `ar` exist. A newly created Arabic language falls back to English for content that editors have not translated yet.

Before changing the schema, the migration snapshots every existing culture-capable value. It then:

1. enables `ContentVariation.Culture` on the EDO document and text-bearing element types;
2. enables culture variation only on the selected properties;
3. restores current values as the `en` variants, including culture-aware Block List persistence data;
4. gives every document an `en` and `ar` culture name and publishes both variants;
5. seeds a deliberately small Arabic proof set.

This preserves edits made since the original seed and avoids changing the meaning of any completed migration state.
The snapshot also detects properties already converted to `en`, allowing a deployment interrupted before the migration state is committed to resume without losing the values converted by the first attempt.

## Property decisions

Culture-varying properties include:

- SEO titles and descriptions, headings, subtitles, summaries, rich text, addresses and copyright text;
- CTA and picker values whose visible labels or localized target routes can change;
- navigation and footer links;
- strategic statements, milestones, subsidiaries, quick links and leadership Block Lists;
- element text such as labels, milestone dates/descriptions, names, positions and biographies;
- news headlines/body/category and investor document titles/descriptions.

Invariant properties include:

- images, video, logos, files, thumbnails and other media references;
- dates, numeric sequence values, featured flags and coordinates;
- telephone numbers, email addresses, social URLs, LinkedIn URLs, map URLs and external document URLs;
- the investor category value used as a stable filtering taxonomy.

`socialLink` remains an invariant element because its platform identity and URL are technical/brand data. Every public document type varies by culture so each language can have its own name, availability and publication state.

## Seeded Arabic proof

The migration seeds representative Arabic values only:

- Home SEO, hero text, milestone heading and one Arabic milestone block;
- Site Settings name, address, PO box, main/footer navigation and copyright;
- About page title, introduction, vision heading and board heading.

The intended proof path is:

```text
Umbraco ar variant -> /umbraco/delivery/api/v2/...?...&culture=ar -> Arabic frontend
```

All other translation remains normal editorial work in Umbraco.

## Frontend behavior

The language selector presents `English` and `Arabic` and uses `?culture=en` and `?culture=ar`. Every Delivery API item and collection request forwards the selected value in the native `culture` query parameter. Stable document IDs are used for fixed pages and collection parents so an Arabic URL segment cannot break content lookup.

The document root is set to:

```html
<html lang="en" dir="ltr">
<html lang="ar" dir="rtl">
```

Internal navigation retains the selected culture. Core layout CSS uses logical inline properties, and the mobile drawer direction mirrors in RTL.

For a local smoke test, open `http://localhost:5173/?culture=ar`, confirm the Arabic hero/navigation/milestone, and inspect the Delivery API requests for `culture=ar`.
