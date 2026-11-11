window.MetadataDashboardEditor.initialise({
  tableSelector: "#page-metadata-editor",
  labels: {
    name: "Page name",
    description: "Page description",
    "content-owners": "Content owner",
  },
  editableFields: ["status", "name", "description", "content-owners"],
  metadataFields: { "content-owners": "266101" },
  contentOwnerFolderId: "283997",
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
