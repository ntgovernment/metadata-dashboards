window.MetadataDashboardEditor.initialise({
  tableSelector: "#page-metadata-editor",
  labels: { name: "Name", description: "Description" },
  editableFields: ["status", "name", "description"],
  metadataFields: { description: "395963" },
  nameColumn: 3,
  dateColumns: [],
  emptyMessage: "No documents available.",
  zeroMessage: "No matching documents.",
  filters: [
    { label: "Status", colIdx: 1, defaultLabel: "All statuses" },
    { label: "File Type", colIdx: 2, defaultLabel: "All file types" },
    { label: "Document Type", colIdx: 5, defaultLabel: "All document types" },
    { label: "Resource Status", colIdx: 6, defaultLabel: "All resource statuses" },
  ],
});
