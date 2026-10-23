# Page Description Editor

Inline editor for a Squiz Matrix Asset Listing. The UI edits asset status, page name, web path, and `seo.description` metadata. jQuery and DataTables provide the same table controls as the documents metadata editor; Matrix API integration remains separate.

## Table controls

- Status, Type, and Content owner dropdowns use exact matches and combine with AND.
- Search checks all columns. Applied filter pills can be removed individually or cleared together.
- Headers toggle ascending/descending sorting with mouse or Enter. Page name A-Z is the default order.
- Pagination starts at 10 rows and includes a page-length selector.
- Successful saves refresh search, sorting, and filter options without resetting the selected filters.

Column order must be: Asset ID, Status, Type, Page name, URL, Page description, Page last updated, Content owner. The local demo uses the same order. Last-updated dates sort chronologically in either direction, supporting `30 Oct 2024` and `20 October 2026` (including `Sept`). Display and search retain the readable text. Empty or invalid dates sort before valid dates ascending and after them descending. Asset IDs containing only numbers sort numerically.

Status-cell backgrounds match the nine swatches in the [Squiz status colours and values reference](https://matrix.squiz.net/manuals/concepts/chapters/squiz-matrix-concepts). Bootstrap striping does not tint these colours. `Archived` is treated as `Archive`, and `Safe Editing` as `Safe Edit`, including workflow variants. `Approved To Go Live` uses the yellow `Approved` colour; `Safe Edit Approved To Go Live` uses orange. The existing status-change choices remain unchanged; displaying workflow colours does not grant additional transitions or bypass Matrix permissions.

## Inline editing

- Click anywhere inside an editable table cell, including its padding, or focus the editable field and press Enter or Space.
- Opening another editable cell automatically saves the current field if its value changed. The next editor opens only after a successful save. Unchanged fields close without an API request.
- Focus moves directly to the next input without scrolling back to the saved field. Table redraws preserve horizontal and vertical scroll positions.
- Save still commits explicitly. Cancel or Escape discards the current unsaved change.
- Success feedback appears inside the saved cell for three seconds. Validation and API errors remain beside the field; failed saves keep the typed value and the current editor open for correction or retry.
- Auto-save runs only when opening another editable cell, not when using filters, pagination, or navigating away. Use Save before those actions.

Feedback elements are generated automatically. Existing Squiz Default Format and Page Contents markup do not need changes for these interactions; synchronise the updated `src/editor.js` and `src/editor.css` together.

## Design System presentation

The editor retains the NTG Central Design System component classes, but `src/editor.css` now supplies all editor-specific control styles directly. Its appearance no longer depends on the surrounding page loading the same DS stylesheet as the HR policy library. DataTables still manages search, filters, sorting, page size, and page navigation; the existing presentation-only adapter reapplies classes when controls are redrawn. Save, Cancel, automatic saving, Matrix API calls, date sorting, status colours, and scroll preservation are unchanged.

Save and Cancel use compact pill-sized buttons inside editing cells, with an outlined Cancel button. Save hovers dark blue; Cancel hovers light grey with navy text. Styling is scoped to the editor and does not change other page controls.

The standalone preview loads Bootstrap and then `src/editor.css`, matching the production setup. Roboto is loaded from Google Fonts for the preview; Squiz uses its existing fonts, with Arial as a fallback if Roboto is unavailable. The full DS stylesheet snapshot is no longer needed or included.

In Squiz, keep the editor stylesheet after Bootstrap and any shared site styles:

```html
<link rel="stylesheet" href="%globals_asset_url_with_hash:1005419:src/editor.css%">
```

If you added a separate `src/ntgc-design-system.css` link for this editor, remove that link. Do not remove shared DS styles used by the rest of the site. The existing Default Format, field attributes, table ID, and script order remain unchanged. No DS-specific wrapper classes are required; keep `.editor-page` for page spacing. Verify the result against the surrounding Squiz page styles in DEV.

## Local development

```sh
npm install
npm run dev
```

Local Vite development uses the representative rows in `index.html` and mock saves. No Squiz Matrix content is changed locally.

## Production

Build the static assets with:

```sh
npm run build
```

Git File Bridge serves the source assets directly, as it does for the EOI editor. Synchronise `src/editor.css`, `src/matrix-api.js`, and `src/editor.js`, then include them in the Matrix Asset Listing page. Matrix renders the listing rows and authorises API updates.

### Squiz Page Contents

Keep the existing Default Format from the page-description Asset Listing, including `data-asset-id`, `.edit_area`, `data-editor-field`, and metadata field ID `266108`. No Type Format changes are needed.

Replace Page Contents with the following. Bootstrap loads before the custom stylesheet. jQuery and DataTables are reused from the documents editor Git File Bridge (`1005438`); the page editor files come from its own bridge (`1005419`). Do not load the documents editor's `editor.js` or `update-metadata.js` here. Load jQuery only once, and ensure the DataTables plugin is attached to that same instance.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="%globals_asset_url_with_hash:1005419:src/editor.css%">

<table id="page-metadata-editor" class="table table-striped">
	<thead>
		<tr>
			<th scope="col">Asset ID</th>
			<th scope="col">Status</th>
			<th scope="col">Type</th>
			<th scope="col">Page name</th>
			<th scope="col">URL</th>
			<th scope="col">Page description</th>
			<th scope="col">Page last updated</th>
			<th scope="col">Content owner</th>
		</tr>
	</thead>
	<tbody>%asset_listing%</tbody>
</table>

<div class="editor-results" role="status" aria-live="polite" aria-atomic="true"></div>

<script src="%globals_asset_url_with_hash:1005438:src/jquery-3.4.1.min.js%"></script>
<script src="./?a=129303"></script>
<script src="%globals_asset_url_with_hash:1005438:src/datatables.lib.js%"></script>
<script src="%globals_asset_url_with_hash:1005419:src/matrix-api.js%"></script>
<script src="%globals_asset_url_with_hash:1005419:src/editor.js%"></script>
```

Filters are generated in the browser; no server-side filter functions or manually maintained dropdown options are required. Filter options and search cover only rows rendered into this listing, not assets on other Matrix server-side pages. Configure the listing to render the complete intended set, or accept filtering one server-side page at a time. Browser pagination then divides those rows into pages.

The existing Content owner keyword ends with `index:0`, so only the first owner is displayed and filterable. Supporting all owners requires a separate Type Format change.

Local development uses npm-managed jQuery 3.7.1 and DataTables 1.13.x with Bootstrap 5 integration. Production reuses the documents editor's existing jQuery 3.4.1 and DataTables bundle. The table controller uses their shared DataTables 1.x API. npm packages and `node_modules` do not need uploading to Squiz.

### DEV deployment checks

1. Confirm the page editor Git File Bridge uses the `dev` branch in DEV only. Do not change the branch used by the live editor. Do not point a production bridge at `dev` for testing.
2. After publishing the changes yourself, synchronise the DEV bridge and update Page Contents using the block above. Check that users can access both bridges' library assets.
3. Confirm the table has the eight columns above and the browser console has no JavaScript errors.
4. Test combined dropdowns, search, individual pill removal, Clear filters, both header sort directions, and pagination with more than 10 rows.
5. Test manual and automatic saving of Status and Page name while filtered/sorted, including permissions and workflow errors. Confirm rejected saves keep the editor open and preserve the typed value. Check Cancel, Escape, and the three-second inline success message. Verify description saves still target `266108`.
6. Check keyboard navigation and narrow screens against the surrounding Squiz page styles. Table controls should wrap while the table scrolls horizontally.

The editor creates one `Squiz_Matrix_API` client. Status updates send `cascade: false`; name updates use the `name` attribute; page-description updates use metadata field ID `266108`.

The web-path control deliberately blocks production saves until the exact `getWebPath()` and `setWebPath()` response and request contract has been confirmed in Matrix DEV. The implementation must preserve every returned alternate path and update only the approved primary path with `auto_remap` enabled.
