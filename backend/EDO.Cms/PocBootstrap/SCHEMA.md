# EDO POC generated schema

`CreateEdoSchemaMigration` creates this schema programmatically. No Settings work, templates, custom property editors, or content nodes are required or created.

All EDO-owned content types and data types have deterministic keys in `Constants/EdoKeys.cs`; aliases and data type names are centralized in `Constants/EdoAliases.cs`. The migration creates dependencies in this order: reusable data types, element types, block-list data types, document types, then allowed-child rules.

## Data types

| Name | Built-in editor | Important configuration |
| --- | --- | --- |
| EDO Rich Text | Rich Text | Native Umbraco rich-text value |
| EDO Media Picker | Media Picker 3 | Single selection (maximum 1) |
| EDO Multi URL Picker | Multi URL Picker | Maximum 1 |
| EDO Date | Date Only | Native Umbraco date value |
| EDO Integer | Integer | Native Umbraco integer value |
| EDO Investor Category | Flexible Dropdown | Financial Statements; Credit Ratings; Investor Presentations; USD Programs; OMR Sukuk; ESG |
| EDO Navigation | Block List | `navigationItem` |
| EDO Social Links | Block List | `socialLink` |
| EDO Strategic Statements | Block List | `strategicStatement` |
| EDO Milestones | Block List | `milestoneItem` |
| EDO Subsidiaries | Block List | `subsidiaryItem` |
| EDO Leadership | Block List | `leadershipPerson` |
| EDO Quick Links | Block List | `quickLink` |

The built-in Textstring, Textarea, and True/False data types are reused by deterministic Umbraco keys.

## Element types

| Element type | Alias | Properties |
| --- | --- | --- |
| Navigation Item | `navigationItem` | `label` (Textstring, required), `link` (EDO Multi URL Picker, required) |
| Social Link | `socialLink` | `platformName` (Textstring), `url` (Textstring) |
| Strategic Statement | `strategicStatement` | `heading` (Textstring), `description` (EDO Rich Text), `image` (EDO Media Picker) |
| Milestone Item | `milestoneItem` | `dateLabel` (Textstring), `sequenceNumber` (EDO Integer), `description` (Textarea), `image` (EDO Media Picker) |
| Subsidiary Item | `subsidiaryItem` | `name` (Textstring), `logo` (EDO Media Picker), `description` (Textarea), `link` (EDO Multi URL Picker) |
| Leadership Person | `leadershipPerson` | `name`, `position` (Textstring); `photo` (EDO Media Picker); `biography` (EDO Rich Text); `linkedinUrl` (Textstring) |
| Quick Link | `quickLink` | `label` (Textstring), `link` (EDO Multi URL Picker) |

Every type in this table is created with `IsElement = true`.

## Document types

### Home Page (`homePage`)

- SEO: `metaTitle`, `metaDescription`
- Hero: `heroTitle`, `heroSubtitle`, `heroBackground`, `heroVideo`, `heroCta`
- Strategic Statements: `strategicStatements` (EDO Strategic Statements)
- Milestones: `milestonesHeading`, `milestones` (EDO Milestones)
- Subsidiaries: `subsidiariesHeading`, `subsidiaries` (EDO Subsidiaries)
- Closing: `closingHeading`, `closingText` (EDO Rich Text), `closingMedia`

### Site Settings (`siteSettings`)

- Site Identity: `siteName`, `logo`, `logoLight`
- Header: `navigation` (EDO Navigation)
- Contact: `address`, `telephone`, `email`, `poBox`
- Social: `socialLinks` (EDO Social Links)
- Footer: `footerLinks` (EDO Navigation), `copyrightText`

### About Page (`aboutPage`)

- Introduction: `pageTitle`, `introHeading`, `introBody` (EDO Rich Text), `introMedia`
- Vision / Mission: `visionHeading`, `visionText`, `missionHeading`, `missionText`
- CEO: `ceoMessage` (EDO Rich Text), `ceoName`, `ceoPosition`, `ceoImage`
- Leadership: `boardHeading`, `boardMembers` (EDO Leadership), `managementHeading`, `managementMembers` (EDO Leadership)

### Careers Page (`careersPage`)

`pageTitle`, `heading`, `body` (EDO Rich Text), `image`, `cta` (EDO Multi URL Picker).

### Media Listing Page (`mediaListingPage`)

`pageTitle`, `introduction`.

### News Article (`newsArticle`)

`headline`, `publicationDate` (EDO Date), `summary`, `featuredImage`, `body` (EDO Rich Text), `category`, `documentAttachment`, `externalUrl`.

### Investor Relations Page (`investorRelationsPage`)

`pageTitle`, `introduction` (EDO Rich Text), `quickLinks` (EDO Quick Links), `keyFiguresHeading`, `keyFiguresText`.

### Investor Document (`investorDocument`)

`title`, `category` (EDO Investor Category), `publicationDate` (EDO Date), `description`, `file`, `thumbnail`, `externalLink`, `featured` (True/False).

### Contact Page (`contactPage`)

`pageTitle`, `introduction` (EDO Rich Text), `mapLatitude`, `mapLongitude`,
`mapEmbedUrl`. Shared address, telephone, email, and PO box values belong only
to Site Settings.

Media fields use EDO Media Picker. Unless a richer type is identified above, short text uses the built-in Textstring and longer plain text uses the built-in Textarea. All document types intentionally have no Razor template.

## Allowed content tree

```text
Home Page
├── About Page
├── Careers Page
├── Media Listing Page
│   └── News Article
├── Investor Relations Page
│   └── Investor Document
├── Contact Page
└── Site Settings
```

- Home Page allows `aboutPage`, `careersPage`, `mediaListingPage`, `investorRelationsPage`, `contactPage`, and `siteSettings`.
- Media Listing Page allows `newsArticle`.
- Investor Relations Page allows `investorDocument`.
- No other POC document type is assigned allowed children.

## Delivery API and migration behavior

Every property uses a built-in Umbraco editor and therefore retains its native Content Delivery API representation. The frontend is expected to consume those native responses.

The follow-on `EnableCultureVariantsMigration` appends multilingual readiness without rewriting this completed schema state. See [MULTILINGUAL.md](MULTILINGUAL.md) for the `en`/`ar` variation matrix, invariant media decisions, representative Arabic seed and Delivery API behavior.

The migration checks both deterministic identity and human-readable identity before creating objects. A colliding key, alias, or data type name fails with an `EDO schema migration stopped` error. A matching partial EDO content type can receive missing groups/properties, while incompatible existing properties or configurations fail rather than being replaced.

Each ensure operation reads existing objects through Umbraco services, rejects
key/name/alias/configuration collisions, and reads newly saved data and content
types back before the migration advances.
