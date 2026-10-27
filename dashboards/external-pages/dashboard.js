(() => {
  const config = {
    tableSelector: "#page-metadata-editor",
    labels: { name: "Page name", description: "Page description" },
    nameColumn: 3,
    dateColumns: [6],
    emptyMessage: "No pages available.",
    zeroMessage: "No matching pages.",
    filters: [
      { label: "Status", colIdx: 1, defaultLabel: "All statuses", multiple: true },
      { label: "Type", colIdx: 2, defaultLabel: "All types", multiple: true },
    ],
  };

  function initialise() {
    const table = document.querySelector(config.tableSelector);
    if (!table) return;
    table.querySelectorAll("tbody tr").forEach((row) => {
      const cell = row.cells[1];
      cell?.setAttribute(
        "data-status",
        cell.textContent.trim().toLowerCase()
          .replace(/^archived$/, "archive")
          .replace(/^safe editing\b/, "safe edit")
          .replace(/^(approved|safe edit approved) to go live$/, "$1")
          .replace(/\s+/g, "-"),
      );
    });
    window.MetadataDashboardTable.initialise(table, config, {
      getDisplayValue: (cell) => cell.textContent.trim(),
      isActivating: () => false,
      announce(message, kind) {
        const result = document.querySelector(".editor-results");
        result.textContent = message;
        result.dataset.kind = kind;
      },
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();
