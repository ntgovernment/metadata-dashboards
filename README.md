# Page Description Editor

Inline editor for a Squiz Matrix Asset Listing. The UI edits asset status, page name, web path, and `seo.description` metadata. jQuery and DataTables provide the same table controls as the documents metadata editor; Matrix API integration remains separate.

## Table controls

- Status, Type, and Content owner dropdowns use exact matches and combine with AND.
- Search checks all columns. Applied filter pills can be removed individually or cleared together.
- Headers toggle ascending/descending sorting with mouse or Enter. Page name A-Z is the default order.
- Pagination starts at 10 rows and includes a page-length selector.
- Successful saves refresh search, sorting, and filter options without resetting the selected filters.

Column order must be: Asset ID, Status, Type, Page name, URL, Page description, Page last updated, Content owner. The local demo uses the same order. Dates sort by their displayed text, not chronologically; Asset IDs containing only numbers sort numerically.

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
5. Test saving Status and Page name while filtered/sorted, including permissions and workflow errors. Confirm rejected saves do not change the displayed value. Verify description saves still target `266108`.
6. Check keyboard navigation and narrow screens against the surrounding Squiz page styles. Table controls should wrap while the table scrolls horizontally.

The editor creates one `Squiz_Matrix_API` client. Status updates send `cascade: false`; name updates use the `name` attribute; page-description updates use metadata field ID `266108`.

The web-path control deliberately blocks production saves until the exact `getWebPath()` and `setWebPath()` response and request contract has been confirmed in Matrix DEV. The implementation must preserve every returned alternate path and update only the approved primary path with `auto_remap` enabled.
