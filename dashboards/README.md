# Isolated dashboard variants

These dashboards are staged on `refactor/dashboard-variants`. All Squiz pages
now use dashboard-specific entry points. The legacy `src/editor.js`,
`src/editor.css`, and tracked `dist/editor.*` files have been removed.
The root `index.html` is a local dashboard chooser.

## Variants

| Dashboard | Directory | Preserved baseline | Filters |
| --- | --- | --- | --- |
| Internal pages | `dashboards/internal-pages` | `origin/main` at `f84197a` | Single-select Status, Type, Content owner |
| External pages | `dashboards/external-pages` | `external` at `054dd45` | Multi-select Status and Type |
| Documents | `dashboards/documents` | New, using the shared editor | Single-select Status, File Type, Document Type, Resource Status |

The external variant is read-only, with seven columns and no Content owner.
It loads table controls only, not the editor or Matrix API scripts.
Status and Type retain multi-select filtering.

Shared styling, table controls, and inline editing live in `dashboards/shared`.
Internal pages allow editing Status, Page name, and Page description only.
URL is display-only, including when an older listing contains web-path editing
attributes; remove those attributes from the URL cell in the Matrix Default
Format to keep its markup consistent with the preview.
Editable internal and documents variants reuse the unchanged `src/matrix-api.js` integration.
Variant entry points specify only their differing
filters, labels, editable fields, date columns, and metadata mappings.
The existing jQuery and DataTables dependencies are reused; no new libraries
are introduced.

## Local development

```sh
npm ci
npm run dev
npm run test:dashboards
npm run build
```

Open the Vite server at:

- `/dashboards/internal-pages/`
- `/dashboards/external-pages/`
- `/dashboards/documents/`

Saves use the existing mock API when the Matrix API constructor is absent.
`build` builds the chooser and all three previews into ignored `dashboard-build/`.
`npm run preview` serves that output. The previous `dev:dashboards` and
`build:dashboards` commands remain aliases for the default commands.

## Git File Bridge configuration

Do not change live bridges during this refactor. First publish the temporary
branch when authorised, then use separate Matrix DEV bridges/pages.
Creating a local branch or commit does not make it available to Matrix.

For all three new bridges:

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/ntgovernment/page-description-editor.git` |
| Branch | `refactor/dashboard-variants` |
| Subdirectory | Leave blank (repository root) |
| Tag/commit override | Leave unset when following the branch |

The repository root is required because each variant references its sibling
`dashboards/shared` directory and the existing vendor files in `src`.
Do **not** set a bridge's subdirectory to a variant directory: that would
exclude those dependencies. Separate bridge assets may use the same branch;
their Matrix pages choose the appropriate entry point.

| Dashboard | Stylesheet path | Final script path |
| --- | --- | --- |
| Internal pages | `dashboards/internal-pages/dashboard.css` | `dashboards/internal-pages/dashboard.js` |
| External pages | `dashboards/external-pages/dashboard.css` | `dashboards/external-pages/dashboard.js` |
| Documents | `dashboards/documents/dashboard.css` | `dashboards/documents/dashboard.js` |

Each directory contains `squiz-page-contents.html`. Replace every literal
`BRIDGE_ASSET_ID` with that DEV bridge's actual Matrix asset ID before using it.
The templates use the existing Matrix JS API asset `129303`; confirm the
approved API asset in each target environment and replace it if necessary.
Load jQuery once, then the Matrix API, DataTables, shared API, shared table
controls, shared editor, and finally the variant script. Do not also load the
legacy `src/editor.js` on the same page.

Stylesheet imports resolve relative to the variant stylesheet. Confirm in DEV
that Git File Bridge serves the relative `../shared/dashboard.css` request.
The templates retain Bootstrap ahead of the dashboard stylesheet.

For internal pages, retain the existing listing Default Format and eight-column
order. For external pages, use `external-pages/squiz-row-format.html`: seven
display-only cells, without Content owner or editing attributes. Preserve the
existing human-readable asset type and last-updated date formatting in Matrix
(the date column supports dates such as `30 Oct 2024`).
The external Page Contents template intentionally omits all Matrix/editor scripts.
The included `index.html` files are local examples, not
production Asset Listing templates.

For documents, use `documents/squiz-row-format.html` as the listing Default
Format, and configure the listing to include the intended document assets.
Use Matrix's appropriate HTML escaping for rendered text/attributes in the
listing. Do not add editing annotations to display-only columns.

### Documents metadata

| Column | Source | Editing |
| --- | --- | --- |
| Asset ID | Asset ID | No |
| Status | Asset status | Yes, existing status transitions; `cascade: false` |
| File Type | `resource_file_type`, field `411227` | No |
| Name | Asset name | Yes, asset `name` attribute |
| Description | `resource_description`, field `395963` | Yes, textarea; `setMetadata` |
| Document Type | `resource_doctype`, field `395942` | No |
| Resource Status | `resource_status`, field `395951` | No |
| URL | Asset URL | No |

Document Type and Resource Status are text columns, not dates. All filter
options come from rendered table rows, including rows on other browser-side
pagination pages, but not assets omitted by Matrix server-side pagination.
Metadata label expansion/display should be confirmed against the field types
in Matrix DEV.

## DEV verification and release

1. Confirm every deployed page uses the new entry points before updating its
   bridge to a revision that removes the legacy editor paths.
2. Verify internal single-select filters, including Content owner, against
   `origin/main`; verify external multi-select label clicks against `054dd45`.
3. Verify column order, sorting (including page dates), search, filter pills,
   page size, pagination, keyboard focus, and shared CSS loading in each page.
4. Verify Save, Cancel, Escape, unchanged-value no-op, switching-cell auto-save,
   API errors, and preserved filters/scroll after saves.
5. In documents, verify Description updates only metadata field `395963`,
   Name updates the asset attribute, and Status respects workflows/permissions
   without cascading. Confirm File Type, Document Type, Resource Status, and
   URL are not editable.
6. Test real saves only on authorised DEV assets. Existing production web-path
   saving remains blocked until its API contract is confirmed.
7. Only after approval, merge the refactor through the team's `dev`/`main`
   workflow, publish it, and move the appropriate bridge references. No live
   bridge changes, pushes, release tags, or merges are performed automatically.

Bridge folder settings are not security boundaries: a repository-root bridge
can contain all variants. Do not deploy internal-only source to an environment
where policy forbids it; use separately published artifacts/repositories if
that boundary is required.
