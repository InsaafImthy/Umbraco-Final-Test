# EDO frontend

This directory is an independent, static multi-page frontend. It consumes public content from the separate Umbraco application through the Content Delivery API.

English and Arabic use Umbraco culture variants. Selectors add `?culture=en` or `?culture=ar`; the client forwards that exact value to every Delivery API request and sets the document `lang`/`dir` to `en`/`ltr` or `ar`/`rtl`. See `backend/EDO.Cms/PocBootstrap/MULTILINGUAL.md` for schema and seed details.

## Development

1. Start `backend/EDO.Cms` with its configured HTTPS launch profile.
2. Install frontend dependencies with `npm install`.
3. Start this application with `npm run dev`.

The CMS origin is configured only in `assets/js/config.js`.

## Visual-system ownership

The global header, navigation, contact details, social links, footer links,
copyright, logos, page headings, hero copy, calls to action, milestones, and
subsidiary entries are content. They are read from the existing Umbraco Home
and Site Settings nodes through the Delivery API; the HTML files only provide
semantic mounting points. Internal CMS routes are translated to this static
POC's file routes in the frontend shell.

Colours, type stacks, spacing, layout widths, header dimensions, transitions,
and z-index values belong to the frontend visual system and are defined in
`assets/css/variables.css`. The gradient fields, rings, rules, and other
image-free background treatments are presentational frontend decoration. A
CMS-provided hero image or logo always takes precedence when supplied. No
WordPress template, plugin, shortcode, or backend architecture is reproduced.

Navigation is rendered directly from the flat Site Settings `navigation`
Block List. The same rendered navigation switches to a mobile drawer at the
frontend breakpoint, so no duplicate JavaScript navigation model is kept.

Motion enhancement uses GSAP after content is rendered. It is skipped when
the visitor requests reduced motion; horizontal milestone controls also use
instant rather than smooth scrolling in that mode.

The homepage follows a strict fetch → normalize → render → animate pipeline.
Milestones are iterated directly from the normalized Home Page Block List in
CMS order; the frontend neither stores milestone copy nor sorts or branches on
a particular milestone count. Run `npm test` for the empty, single, 8, 9, 20,
reordered, missing-image, and missing-optional-property fixtures.

## Responsive and accessibility behavior

- The desktop navigation becomes a full-width mobile drawer below `70rem`.
- Menu and language controls expose `aria-expanded` and `aria-controls`, close
  with Escape, and retain native button/link semantics.
- Focus indicators use the high-contrast `--color-focus` token.
- Layouts are fluid across the required 1920, 1440, 1280, 1024, 768, 430, and
  390 pixel review widths.
