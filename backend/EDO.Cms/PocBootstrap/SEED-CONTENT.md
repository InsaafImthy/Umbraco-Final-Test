# EDO POC seed content

`SeedEdoContentMigration` is the second migration in `EdoPocMigrationPlan` and runs only after `CreateEdoSchemaMigration`. It seeds the POC from bundled files and embedded content; it never calls edoman.om at application startup.

Publication dates are persisted using Umbraco 17's DateOnly JSON DTO (`date` plus a null `timeZone`). A one-time compatibility transition repairs only invalid legacy string dates created by the original bootstrap; already-valid values, including editor changes, are retained.

The public reference was reviewed on 18 August 2026. The live site currently presents the public-facing brand as **Energy Oman** while retaining the edoman.om domain and Energy Development Oman corporate references. The seed follows that current presentation.

## Generated content tree

All nodes below are saved and published. The migration re-queries them with `IContentService` and verifies that every node created in the current run is published.

```text
Home (homePage)
├── About Us (aboutPage)
├── Careers (careersPage)
├── Media (mediaListingPage)
│   ├── Energy Development Oman Successfully Issues Seven-Year US$750 Million Sukuk
│   ├── EDO Signs MoU with Siemens Energy in Oman
│   └── Energy Development Oman Receives a Norway Delegation
├── Investor Relations (investorRelationsPage)
│   ├── Q1 2025 Reviewed Financial Statements
│   ├── Fitch Affirms Energy Development Oman at BB+; Outlook Positive
│   ├── Investor Presentation — March 2025
│   ├── EDO Sukuk Limited Trust Certificate Issuance Programme
│   ├── EDO OMR Sukuk Base Prospectus 2025
│   └── PDO Sustainability Report 2024
├── Contact Us (contactPage)
└── Site Settings (siteSettings)
```

## Seed content summary

- Home contains four strategic statements, the eight milestones displayed by the reference home page, two representative subsidiary/initiative entries, hero copy and closing copy.
- About contains current reference introduction, vision, mission and CEO message, plus three board members and three executive-management members with portraits and biographies.
- Careers uses the current “Grow with us” message and public LinkedIn careers destination.
- Media contains three real public press releases with publication dates, summaries, bodies, categories, source URLs and local featured images.
- Investor Relations contains the public introduction, quick links and representative key-figure copy. Six document children prove every configured investor category; one small financial statement is bundled and imported, while the remaining items use public source links.
- Site Settings is the single owner of the public Mina Al-Fahal address,
  telephone, email, and PO Box. Contact contains page copy and map fields. Site
  Settings also contains six navigation items, four social links, footer links,
  the normal logo and light logo.

Block List values use the Umbraco 17 persistence structure: `layout.Umbraco.BlockList`, `contentData`, `settingsData`, and `expose`. Content element keys are deterministic UUID v5 values. Media Picker 3 values point to actual imported media keys and are validated by Umbraco during save/publish and through Delivery API conversion.

## Imported media

```text
EDO POC
├── Brand
│   ├── Energy Oman logo
│   └── Energy Oman light logo
├── Home
│   ├── Hydrom logo
│   └── OneSupply logo
├── Leadership
│   ├── H.E. Eng. Salim bin Nasser Al Aufi
│   ├── H.E. Abdullah bin Salim Al Harthy
│   ├── H.E. Mulham bin Basheer Al Jarf
│   ├── Eng. Mazin bin Rashid Al Lamki
│   ├── Eng. Sultan bin Ali Al Mamari
│   └── Mr. Mohammed bin Moosa Al Harrasi
├── News
│   ├── Seven-year Sukuk press release
│   ├── EDO Siemens Energy MoU
│   └── Norway delegation
└── Investor
    └── EDO Q1 2025 financial statements
```

The 14 source files are stored under `PocBootstrap/SeedAssets` and copied to build/publish output. Media folders and items are found by deterministic key first and by sibling name second. Existing media is never replaced.

## Aliases used

Document types: `homePage`, `aboutPage`, `careersPage`, `mediaListingPage`, `newsArticle`, `investorRelationsPage`, `investorDocument`, `contactPage`, `siteSettings`.

Element types: `navigationItem`, `socialLink`, `strategicStatement`, `milestoneItem`, `subsidiaryItem`, `leadershipPerson`, `quickLink`.

The migration sets the property aliases defined in `EdoAliases.Properties`; no private duplicate alias list is maintained. Important repeating properties are `strategicStatements`, `milestones`, `subsidiaries`, `navigation`, `socialLinks`, `footerLinks`, `boardMembers`, `managementMembers`, and `quickLinks`.

## Idempotency and editor ownership

Content and media use stable keys. A fallback sibling-name lookup supports databases that already contain the requested tree. If a matching node exists with the expected type and parent, it is retained without changing values, publication state or name. An incompatible name/type/parent collision stops the migration rather than overwriting content. Only newly created content is populated, saved and published.

## Intentionally omitted reference content

- Arabic variants and the separate About Oman/Hydrogen navigation branches are outside this English architecture POC.
- The full historical news archive is reduced to three representative releases.
- The full board, executive team and historical biographies are reduced to three representatives per leadership group.
- The complete investor document archive is not mirrored. Only one representative PDF is bundled; the other categories use public links.
- Large home-page video/background media, maps, every subsidiary asset and third-party partner marks are omitted to keep the repository and migration small.
- No WordPress templates, plugin data, shortcodes or implementation structure are copied.
