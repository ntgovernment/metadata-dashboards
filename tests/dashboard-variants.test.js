import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

function loadConfig(variant) {
  let config;
  const source = readFileSync(
    new URL(`../dashboards/${variant}/dashboard.js`, import.meta.url),
    "utf8",
  );
  runInNewContext(source, {
    document: {
      readyState: "complete",
      querySelector: () => ({ querySelectorAll: () => [] }),
    },
    window: {
      MetadataDashboardTable: {
        initialise(table, value) {
          config = JSON.parse(JSON.stringify(value));
        },
      },
      MetadataDashboardEditor: {
        initialise(value) {
          config = JSON.parse(JSON.stringify(value));
        },
      },
    },
  });
  return config;
}

test("internal pages retain three single-select filters and page date sorting", () => {
  const config = loadConfig("internal-pages");
  assert.deepEqual(config.filters.map(({ label, colIdx }) => [label, colIdx]), [
    ["Status", 1], ["Type", 2], ["Content owner", 7],
  ]);
  assert.ok(config.filters.every((filter) => !filter.multiple));
  assert.deepEqual(config.dateColumns, [6]);
  assert.deepEqual(config.editableFields, ["status", "name", "description"]);
});

test("external pages alone opt into multi-select without enabling editing", () => {
  const config = loadConfig("external-pages");
  assert.deepEqual(config.filters.map(({ label }) => label), ["Status", "Type"]);
  assert.ok(config.filters.every((filter) => filter.multiple));
  assert.equal(config.editableFields, undefined);
  assert.deepEqual(config.dateColumns, [6]);
});

test("external preview and Matrix templates have seven read-only columns and no API scripts", () => {
  for (const file of ["index.html", "squiz-page-contents.html", "squiz-row-format.html"]) {
    const markup = readFileSync(
      new URL(`../dashboards/external-pages/${file}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(markup, /Content owner|data-editor-field|edit_area|matrix-api|shared\/editor\.js|129303/);
    if (file === "squiz-row-format.html") {
      assert.equal((markup.match(/<td>/g) ?? []).length, 7);
    } else {
      assert.equal((markup.match(/<th scope=/g) ?? []).length, 7);
    }
  }
});

test("documents use the requested filter columns and description metadata field", () => {
  const config = loadConfig("documents");
  assert.deepEqual(config.filters.map(({ label, colIdx }) => [label, colIdx]), [
    ["Status", 1], ["File Type", 2], ["Document Type", 5], ["Resource Status", 6],
  ]);
  assert.ok(config.filters.every((filter) => !filter.multiple));
  assert.deepEqual(config.editableFields, ["status", "name", "description"]);
  assert.deepEqual(config.metadataFields, { description: "395963" });
  assert.deepEqual(config.dateColumns, []);
  assert.deepEqual(config.labels, { name: "Name", description: "Description" });
});

test("documents listing template uses only the approved editable fields", () => {
  const markup = readFileSync(
    new URL("../dashboards/documents/squiz-row-format.html", import.meta.url),
    "utf8",
  );
  assert.deepEqual(
    [...markup.matchAll(/data-editor-field="([^"]+)"/g)].map((match) => match[1]),
    ["status", "name", "description"],
  );
  for (const key of ["resource_file_type", "resource_description", "resource_doctype", "resource_status"]) {
    assert.ok(markup.includes(`%asset_metadata_${key}%`));
  }
  assert.ok(markup.includes('data-metadatafieldid="395963"'));
  assert.equal((markup.match(/<td>/g) ?? []).length, 8);
});
