window.MetadataDashboardEditor.initialise({
  tableSelector: "#page-metadata-editor",
  labels: { name: "Page name", description: "Page description" },
  editableFields: ["status", "name", "description"],
  nameColumn: 3,
  dateColumns: [6],
  emptyMessage: "No pages available.",
  zeroMessage: "No matching pages.",
  filters: [
    { label: "Status", colIdx: 1, defaultLabel: "All statuses" },
    { label: "Type", colIdx: 2, defaultLabel: "All types" },
    { label: "Content owner", colIdx: 7, defaultLabel: "All content owners" },
  ],
});
