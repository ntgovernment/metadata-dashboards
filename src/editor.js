(() => {
const tableJQuery = window.jQuery;
const {
  getWebPath,
  isLocalDevelopment,
  updateMetadata,
  updateName,
  updateStatus,
  updateWebPath,
} = window.PageDescriptionEditorApi;

const statusOptions = [
  { value: "1", label: "Archive" },
  { value: "2", label: "Under Construction" },
  { value: "16", label: "Live" },
  { value: "64", label: "Safe Editing" },
];

const statusByLabel = new Map(statusOptions.map((option) => [option.label, option.value]));

function setStatusPresentation(cell, label) {
  const status = label.toLowerCase().replace(/\s+/g, "-");
  cell.closest("td")?.setAttribute("data-status", status);
}

function announce(message, kind = "success") {
  const result = document.querySelector(".editor-results");
  if (!result) {
    return;
  }

  result.textContent = message;
  result.dataset.kind = kind;
}

function getLabel(field) {
  return {
    status: "Status",
    name: "Page name",
    "web-path": "Web path",
    description: "Page description",
  }[field];
}

function getDisplayValue(cell) {
  return cell.dataset.displayValue ?? cell.textContent.trim();
}

function initialiseTableControls(table) {
  if (!tableJQuery?.fn?.DataTable) {
    announce("Table filters are unavailable. Check that jQuery and DataTables are loaded before editor.js.", "error");
    return;
  }

  const dtTable = tableJQuery(table).DataTable({
    paging: true,
    pageLength: 10,
    pagingType: "simple_numbers",
    ordering: true,
    order: [[3, "asc"]],
    searching: true,
    info: true,
    autoWidth: false,
    dom: '<"dt-top-ctrl"lf><"dt-table-scroll"t><"dt-bottom-row"ip>',
    language: { emptyTable: "No pages available.", zeroRecords: "No matching pages." },
    columnDefs: [{
      targets: "_all",
      render(data, type) {
        if (type === "display") return data;
        const container = document.createElement("div");
        container.innerHTML = data;
        const editable = container.querySelector(".edit_area");
        return editable ? getDisplayValue(editable) : container.textContent.trim();
      },
    }],
  });

  const filterConfigs = [
    { label: "Status", colIdx: 1, defaultLabel: "All statuses" },
    { label: "Type", colIdx: 2, defaultLabel: "All types" },
    { label: "Content owner", colIdx: 7, defaultLabel: "All content owners" },
  ];
  const wrapper = dtTable.table().container();
  wrapper.classList.add("page-editor-table");
  const filterBar = document.createElement("div");
  filterBar.className = "dt-filter-bar";
  const activeFiltersRow = document.createElement("div");
  activeFiltersRow.className = "dt-active-filters";
  activeFiltersRow.hidden = true;
  const activeLabel = document.createElement("span");
  activeLabel.textContent = "Applied filters:";
  const pillsContainer = document.createElement("div");
  pillsContainer.className = "dt-active-pills";
  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "dt-clear-filters secondary-action";
  clearButton.textContent = "Clear filters";
  activeFiltersRow.append(activeLabel, pillsContainer, clearButton);
  const filterSelects = new Map();
  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

  function buildUniqueColValues(colIdx) {
    return [...new Set(dtTable.cells(null, colIdx).render("filter").toArray().filter(Boolean))]
      .sort(collator.compare);
  }

  function refreshFilterOptions() {
    filterConfigs.forEach((config) => {
      const select = filterSelects.get(config.colIdx);
      const selected = select.value;
      const values = buildUniqueColValues(config.colIdx);
      if (selected && !values.includes(selected)) values.push(selected);
      select.replaceChildren(new Option(config.defaultLabel, ""));
      values.sort(collator.compare).forEach((value) => select.add(new Option(value, value)));
      select.value = selected;
    });
  }

  function applyColumnFilter(config, value) {
    const escaped = tableJQuery.fn.dataTable.util.escapeRegex(value);
    dtTable.column(config.colIdx).search(value ? `^${escaped}$` : "", true, false);
  }

  function updateActiveFilters() {
    pillsContainer.replaceChildren();
    function addPill(label, remove) {
      const pill = document.createElement("span");
      pill.className = "dt-filter-pill";
      pill.append(document.createTextNode(label));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dt-pill-remove";
      button.textContent = "\u00d7";
      button.setAttribute("aria-label", `Remove ${label} filter`);
      button.addEventListener("click", remove);
      pill.append(button);
      pillsContainer.append(pill);
    }
    if (dtTable.search()) {
      addPill(`Search: ${dtTable.search()}`, () => {
        dtTable.search("").draw();
        wrapper.querySelector(".dataTables_filter input").focus();
      });
    }
    filterConfigs.forEach((config) => {
      const select = filterSelects.get(config.colIdx);
      if (!select.value) return;
      addPill(`${config.label}: ${select.value}`, () => {
        select.value = "";
        applyColumnFilter(config, "");
        dtTable.draw();
        select.focus();
      });
    });
    activeFiltersRow.hidden = !pillsContainer.childElementCount;
  }

  filterConfigs.forEach((config) => {
    const label = document.createElement("label");
    label.className = "dt-filter-item";
    const caption = document.createElement("span");
    caption.className = "dt-filter-label";
    caption.textContent = config.label;
    const select = document.createElement("select");
    select.className = "dt-filter-select";
    select.addEventListener("change", () => {
      applyColumnFilter(config, select.value);
      dtTable.draw();
    });
    filterSelects.set(config.colIdx, select);
    label.append(caption, select);
    filterBar.append(label);
  });
  refreshFilterOptions();
  filterBar.prepend(wrapper.querySelector(".dataTables_filter"));
  filterBar.append(wrapper.querySelector(".dataTables_length"));
  wrapper.prepend(filterBar, activeFiltersRow);
  wrapper.querySelector(".dt-top-ctrl").remove();
  dtTable.on("draw.dt", updateActiveFilters);
  clearButton.addEventListener("click", () => {
    dtTable.search("");
    filterConfigs.forEach((config) => {
      filterSelects.get(config.colIdx).value = "";
      applyColumnFilter(config, "");
    });
    dtTable.draw();
    filterSelects.get(filterConfigs[0].colIdx).focus();
  });
  table.addEventListener("editor:saved", (event) => {
    dtTable.row(event.target.closest("tr")).invalidate("dom");
    refreshFilterOptions();
    dtTable.draw(false);
    if (!document.activeElement || document.activeElement === document.body) {
      filterSelects.get(filterConfigs[0].colIdx).focus();
    }
  });
}

function makeControl(field, value) {
  if (field === "status") {
    const select = document.createElement("select");
    select.className = "editor-control";
    select.setAttribute("aria-label", "Status");
    statusOptions.forEach((option) => {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      element.selected = option.value === statusByLabel.get(value);
      select.append(element);
    });
    return select;
  }

  const control = document.createElement(field === "description" ? "textarea" : "input");
  control.className = "editor-control";
  control.setAttribute("aria-label", getLabel(field));
  control.value = value;
  if (field === "description") {
    control.rows = 3;
  } else {
    control.type = "text";
  }
  return control;
}

function restoreCell(cell, value) {
  cell.replaceChildren(document.createTextNode(value));
  cell.dataset.displayValue = value;
  cell.focus();
}

function validate(field, value) {
  if (field !== "description" && !value.trim()) {
    return `${getLabel(field)} cannot be empty.`;
  }

  if (field === "web-path" && (!value.startsWith("/") || value.includes("://"))) {
    return "Web path must begin with / and must not be a full URL.";
  }

  return "";
}

async function saveCell(cell, field, control, originalValue) {
  const value = control.value.trim();
  const validationError = validate(field, value);
  if (validationError) {
    announce(validationError, "error");
    control.focus();
    return;
  }

  const row = cell.closest("tr");
  const assetId = row?.dataset.assetId;
  if (!assetId) {
    announce("This row does not include a Matrix asset ID.", "error");
    return;
  }

  control.disabled = true;
  const buttons = cell.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  });

  try {
    if (field === "status") {
      const option = statusOptions.find((item) => item.value === value);
      await updateStatus(assetId, Number(value));
      setStatusPresentation(cell, option.label);
      restoreCell(cell, option.label);
    } else if (field === "name") {
      await updateName(assetId, value);
      restoreCell(cell, value);
    } else if (field === "web-path") {
      await updateWebPath(assetId, value);
      cell.dataset.webPath = value;
      restoreCell(cell, isLocalDevelopment() ? `https://example.local${value}` : value);
    } else {
      await updateMetadata(assetId, cell.dataset.metadatafieldid, value);
      restoreCell(cell, value);
    }
    announce(`${getLabel(field)} saved.`, "success");
    cell.dispatchEvent(new CustomEvent("editor:saved", { bubbles: true }));
  } catch (error) {
    control.disabled = false;
    buttons.forEach((button) => {
      button.disabled = false;
    });
    announce(error.message || "The change could not be saved.", "error");
    control.focus();
  }
}

async function activateCell(cell) {
  if (cell.querySelector(".editor-control")) {
    return;
  }

  const field = cell.dataset.editorField;
  const originalValue = getDisplayValue(cell);
  cell.dataset.displayValue = originalValue;
  let editValue = originalValue;

  if (field === "web-path") {
    try {
      editValue = await getWebPath(cell.closest("tr")?.dataset.assetId, cell.dataset.webPath || originalValue);
    } catch (error) {
      announce(error.message || "The web path could not be loaded.", "error");
      return;
    }
  }

  const control = makeControl(field, editValue);
  const actions = document.createElement("div");
  actions.className = "editor-actions";
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.className = "secondary-action";
  actions.append(save, cancel);
  cell.replaceChildren(control, actions);
  control.focus();

  save.addEventListener("click", () => saveCell(cell, field, control, originalValue));
  cancel.addEventListener("click", () => restoreCell(cell, originalValue));
  control.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !control.disabled) {
      event.preventDefault();
      restoreCell(cell, originalValue);
    }
  });
}

function initialiseEditor() {
  const table = document.querySelector("#page-metadata-editor");
  if (!table) {
    return;
  }

  table.querySelectorAll(".edit_area[data-editor-field]").forEach((cell) => {
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.dataset.label = getLabel(cell.dataset.editorField);
    cell.setAttribute("aria-label", `Edit ${getLabel(cell.dataset.editorField)}`);
    if (cell.dataset.editorField === "status") {
      setStatusPresentation(cell, cell.textContent.trim());
    }
  });

  table.addEventListener("click", (event) => {
    const cell = event.target.closest(".edit_area[data-editor-field]");
    if (cell && !event.target.closest("button, input, select, textarea")) {
      activateCell(cell);
    }
  });

  table.addEventListener("keydown", (event) => {
    const cell = event.target.closest(".edit_area[data-editor-field]");
    if (cell && event.target === cell && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      activateCell(cell);
    }
  });

  initialiseTableControls(table);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialiseEditor, { once: true });
} else {
  initialiseEditor();
}
})();