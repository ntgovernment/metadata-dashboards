window.MetadataDashboardEditor.initialise({
  tableSelector: "#page-metadata-editor",
  labels: { name: "Page name", description: "Page description" },
  editableFields: ["status", "name", "web-path", "description"],
  nameColumn: 3,
  dateColumns: [6],
  emptyMessage: "No pages available.",
  zeroMessage: "No matching pages.",
  filters: [
    { label: "Status", colIdx: 1, defaultLabel: "All statuses", multiple: true },
    { label: "Type", colIdx: 2, defaultLabel: "All types", multiple: true },
  ],
});
