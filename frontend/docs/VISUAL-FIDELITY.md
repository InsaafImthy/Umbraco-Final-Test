# Visual fidelity review

Reviewed 18 August 2026 against the public [Energy Oman website](https://edoman.om/) and its current page-specific styles. This pass covers Home, About, Media, News Detail, Investor Relations, Careers, and Contact without changing the Umbraco schema, Delivery API contract, or CMS ownership of content.

## Status key

- **MATCH** — the major composition, design tokens, and responsive behavior align with the reference.
- **CLOSE** — the implementation follows the same visual system and section pattern, with a documented content, asset, or interaction difference.
- **DIFFERENT** — an exact reference equivalent cannot be produced safely from the current CMS contract or available reference.

## Comparison

| Area | Status | Result and remaining difference |
| --- | --- | --- |
| Typography | **MATCH** | Rubik is now the English display/body face, with the reference 60/36/26 px desktop hierarchy, 16 px body copy, 600 heading weight, and reference line heights. Noto Kufi Arabic is used for legible RTL shaping. |
| Palette and surfaces | **MATCH** | Primary navy `#001F5B`, accent `#00F0CC`, text `#323E48`, muted text `#767D8E`, border `#E1E1E1`, and surface `#F9F9FC` match the active Elementor kit. |
| Containers and spacing | **MATCH** | Main content width is 1140 px, with fluid gutters and section spacing based on the reference's recurring 60–100 px bands. |
| Header and navigation | **CLOSE** | Two-tier navy/white header, desktop navigation, active/hover underline, language control, social actions, shadow, and full-screen responsive drawer align. The CMS navigation value is currently flat, so reference submenus are not fabricated in JavaScript; the reference also presents Vision 2040 as a separately styled header action, while the CMS contract does not identify a navigation item as a CTA. |
| Footer | **CLOSE** | Dark 400 px minimum footer, multi-column composition, contact links, social links, rule, and legal row align. Social marks remain compact text abbreviations because no CMS icon asset or icon system is supplied. |
| Interior page hero media | **DIFFERENT** | The reference uses a different photographic banner on About, Media, Investor Relations, Careers, and Contact. Those page types do not currently expose a dedicated hero-background property, so the frontend keeps its branded navy treatment instead of reusing unrelated CMS media or hardcoding reference images. |
| Home hero | **CLOSE** | Full-bleed CMS video/image, navy overlay, 60 px maximum heading, CTA, and restrained entrance motion align. Exact photography/video depends on the media selected in Umbraco. |
| Home strategic cards | **CLOSE** | Four-up desktop, two-up tablet, single-column mobile behavior, overlays, borders, and image hover treatment align. Card copy and count remain entirely CMS-driven. |
| Home timeline | **MATCH** | Horizontal arbitrary-length track, connected markers, images, snap scrolling, controls, RTL direction, and responsive card widths are implemented without assuming eight items. |
| Home subsidiaries/contact | **CLOSE** | Responsive subsidiary cards and the closing contact panel follow the reference composition. Logo proportions and final imagery depend on CMS media. |
| About introduction/purpose | **CLOSE** | Split introduction plus navy/accent Vision and Mission panels align in hierarchy and responsive stacking. Copy and media remain CMS variants. |
| About CEO/leadership | **CLOSE** | Portrait/copy layout, tabbed leadership grids, image hover, and accessible profile dialog align. Final card heights vary with CMS biographies, titles, and portrait crops. |
| Media listing | **CLOSE** | Responsive editorial card grid, 16:10 media, metadata, headline scale, hover lift, and actions align. Card count and image crops follow Delivery API results. |
| News Detail | **DIFFERENT** | The previously indexed reference article URL returned the live site's 404 template during this audit, so exact article-to-article comparison was unavailable. The implementation retains a CMS-driven editorial header, metadata, featured image, rich text, and optional source/attachment actions. |
| Investor Relations | **CLOSE** | 70 vh hero geometry, quick-link cards, key-figures band, document tabs, responsive document cards, and hover states align. The earth-at-night reference image is covered by the hero-media difference above; document thumbnails and categories depend on published CMS records. |
| Careers | **CLOSE** | Page banner and responsive image/copy/CTA presentation preserve the reference hierarchy and centered mobile emphasis. Exact crop and text length remain CMS-controlled. |
| Contact | **CLOSE** | Banner, contact-information hierarchy, 697 px maximum map treatment, and responsive stacking align. The local details use consistent cards rather than the reference icon-box treatment, and the implementation uses the configured secure embed or OpenStreetMap coordinates rather than copying a reference embed. |

## Responsive verification

Reference captures were inspected at desktop and mobile sizes, then the production DOM/CSS contract was checked at each exact viewport below. All layouts retain fluid gutters, readable line lengths, non-overlapping header controls, reachable horizontal content, and single-column fallbacks where applicable.

| Viewport | Navigation | Main layout result |
| --- | --- | --- |
| 1920 × 1080 | Desktop | 1140 px centered content; four-column strategic area; full footer columns. |
| 1440 × 900 | Desktop | Same content cap with reduced outer whitespace; fluid section spacing. |
| 1366 × 768 | Desktop | Full navigation retained; hero and cards remain within the reference desktop scale. |
| 1024 × 768 | Drawer | Tablet navigation, two-column strategic cards, compact typography, and wrapped grids. |
| 768 × 1024 | Drawer | Tablet/small-screen heading scale; stacked split sections; horizontally scrollable tabs/timeline. |
| 430 × 932 | Drawer | Single-column sections, 16 px gutters, compact header/footer, full-width article actions. |
| 390 × 844 | Drawer | Same mobile contract with narrower timeline cards and no horizontal page overflow. |

Breakpoints intentionally follow the reference system: desktop/tablet changes at 1024 px, major content stacking at 768 px, and compact-phone refinements at 480 px.

## CMS and animation contract

CMS data renders first. Each page awaits its Delivery API request(s), constructs an arbitrary-length DOM from returned collections, and calls `replaceChildren` before animation initialization. GSAP and `IntersectionObserver` initialize second and query the completed page rather than relying on fixed item counts.

`prefers-reduced-motion: reduce` disables GSAP entrances, smooth timeline scrolling, CSS transition duration, and home-hero video playback. Content remains visible and usable when GSAP or `IntersectionObserver` is unavailable.

No content was copied from the reference into static HTML. No frontend files were moved into Umbraco `wwwroot`, and no backend architecture or schema was changed.

## Known safe differences

- Published CMS media, crop choices, copy length, and collection counts determine exact screenshot geometry.
- Reference dropdown children cannot be reproduced until they exist in the CMS navigation contract; hardcoded submenu content was deliberately avoided.
- The reference WordPress/Elementor plugin transitions are approximated with the existing GSAP/CSS motion system instead of importing its plugin stack.
- Third-party social icon shapes and exact map provider chrome differ because the current CMS supplies links/coordinates, not those presentation assets.
- News Detail remains visually comparable at the template level, but the audited live article was no longer published at its indexed URL.

## Build scope

The Vite multi-page build now includes all seven reviewed entries: Home, About, Careers, Contact, Investor Relations, Media listing, and News Detail. This corrects the previous build behavior that emitted only the homepage while preserving the existing frontend architecture.
