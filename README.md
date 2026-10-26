# Metadata dashboards

Three Squiz Matrix Asset Listing dashboards share styling and table controls:

| Dashboard | Entry point | Editing | Filters |
| --- | --- | --- | --- |
| Internal pages | `dashboards/internal-pages/dashboard.js` | Status, Page name, Page description | Single-select Status, Type, Content owner |
| External pages | `dashboards/external-pages/dashboard.js` | None | Multi-select Status, Type |
| Documents | `dashboards/documents/dashboard.js` | Status, Name, Description | Single-select Status, File Type, Document Type, Resource Status |

## Local development

```sh
npm ci
npm run dev
```

Open the displayed Vite URL to choose a dashboard preview. The root
`index.html` is a chooser, not a Matrix Asset Listing template.
Editable previews use mock saves when the Matrix API constructor is absent.

```sh
npm run test:dashboards
npm run build
npm run preview
```

The default build includes the chooser and all three previews in ignored
`dashboard-build/`. The `dev:dashboards` and `build:dashboards` commands remain
aliases for compatibility.

## Squiz deployment

Follow [the Git File Bridge deployment guide](dashboards/README.md).
Each dashboard contains its own Page Contents template. Documents and external
pages also include listing row templates.

Matrix renders production listing rows. Git File Bridge serves the dashboard
source files directly; no build output needs uploading.

- `dashboards/shared/dashboard.css`: common styling.
- `dashboards/shared/table-controls.js`: search, filters, sorting, pagination.
- `dashboards/shared/editor.js`: internal/documents inline editing.
- `src/matrix-api.js`: existing API integration used by editable dashboards.
- `src/jquery-3.4.1.min.js` and `src/datatables.lib.js`: existing production vendors.

The legacy standalone editor scripts/styles and tracked build copies have been
removed after migration to the dashboard-specific entry points. Do not reference
`src/editor.js`, `src/editor.css`, or the old `dist/editor.*` paths.

Confirm metadata IDs, API access, permissions, workflow transitions, and
stylesheet imports in Matrix DEV before release. Description saves for documents
currently target metadata field `395963`; verify it in the target environment.
No automated pushes or changes to Matrix bridge settings are performed.
