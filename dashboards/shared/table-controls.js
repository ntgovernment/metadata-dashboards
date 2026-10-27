(() => {
  function getDateSortValue(value) {
    const parts = value.trim().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    if (!parts) return Number.MIN_SAFE_INTEGER;
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthLabel = parts[2].toLowerCase();
    const month = months.findIndex(
      (name) =>
        name === monthLabel ||
        name.slice(0, 3) === monthLabel ||
        (name === "september" && monthLabel === "sept"),
    );
    const day = Number(parts[1]);
    const year = Number(parts[3]);
    const date = new Date(Date.UTC(year, month, day));
    if (
      month < 0 ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day
    )
      return Number.MIN_SAFE_INTEGER;
    return date.getTime();
  }

  function preserveScrollPosition(element) {
    const positions = [];
    for (
      let parent = element.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      positions.push({
        element: parent,
        left: parent.scrollLeft,
        top: parent.scrollTop,
      });
    }
    const left = window.scrollX;
    const top = window.scrollY;
    return () => {
      positions.forEach((position) =>
        position.element.scrollTo({
          left: position.left,
          top: position.top,
          behavior: "instant",
        }),
      );
      window.scrollTo({ left, top, behavior: "instant" });
    };
  }

  function initialiseTableControls(table, config, hooks) {
    const tableJQuery = window.jQuery;
    const { announce, getDisplayValue, isActivating } = hooks;
    if (!tableJQuery?.fn?.DataTable) {
      announce(
        "Table filters are unavailable. Check that jQuery and DataTables are loaded before editor.js.",
        "error",
      );
      return;
    }

    const dtTable = tableJQuery(table).DataTable({
      paging: true,
      pageLength: 10,
      pagingType: "simple_numbers",
      ordering: true,
      order: [[config.nameColumn, "asc"]],
      searching: true,
      info: true,
      autoWidth: false,
      dom: '<"dt-top-ctrl"lf><"dt-table-scroll"t><"dt-bottom-row"ip>',
      language: {
        emptyTable: config.emptyMessage,
        zeroRecords: config.zeroMessage,
      },
      columnDefs: [
        {
          targets: "_all",
          render(data, type, row, meta) {
            if (type === "display") return data;
            const container = document.createElement("div");
            container.innerHTML = data;
            const editable = container.querySelector(".edit_area");
            const value = editable
              ? getDisplayValue(editable)
              : container.textContent.trim();
            if (config.dateColumns.includes(meta.col) && (type === "sort" || type === "type")) {
              return getDateSortValue(value);
            }
            return value;
          },
        },
      ],
    });

    const filterConfigs = config.filters;
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
    clearButton.className =
      "dt-clear-filters secondary-action ntgc-btn ntgc-btn--tertiary";
    clearButton.textContent = "Clear filters";
    activeFiltersRow.append(activeLabel, pillsContainer, clearButton);
    const filterControls = new Map();
    const collator = new Intl.Collator("en", {
      sensitivity: "base",
      numeric: true,
    });

    function buildUniqueColValues(colIdx) {
      return [
        ...new Set(
          dtTable
            .cells(null, colIdx)
            .render("filter")
            .toArray()
            .filter(Boolean),
        ),
      ].sort(collator.compare);
    }

    function refreshFilterOptions() {
      filterConfigs.forEach((config) => {
        const filter = filterControls.get(config.colIdx);
        const values = [
          ...new Set([
            ...buildUniqueColValues(config.colIdx),
            ...filter.selected,
          ]),
        ].sort(collator.compare);
        if (!config.multiple) {
          filter.summary.replaceChildren(new Option(config.defaultLabel, ""));
          values.forEach((value) =>
            filter.summary.add(new Option(value, value)),
          );
          filter.summary.value = [...filter.selected][0] ?? "";
          return;
        }
        filter.options.replaceChildren();
        values.forEach((value) => {
          const label = document.createElement("label");
          label.className = "dt-filter-option";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = value;
          checkbox.checked = filter.selected.has(value);
          label.append(checkbox, document.createTextNode(value));
          filter.options.append(label);
        });
        updateFilterSummary(config);
      });
    }

    function updateFilterSummary(config) {
      const filter = filterControls.get(config.colIdx);
      const values = [...filter.selected];
      if (!config.multiple) {
        filter.summary.value = values[0] ?? "";
        return;
      }
      filter.summary.textContent = values.length
        ? values.join(", ")
        : config.defaultLabel;
      filter.summary.setAttribute(
        "aria-label",
        `${config.label}: ${filter.summary.textContent}`,
      );
      filter.options.querySelectorAll("input").forEach((checkbox) => {
        checkbox.checked = filter.selected.has(checkbox.value);
      });
    }

    function applyColumnFilter(config) {
      const values = [...filterControls.get(config.colIdx).selected];
      const escaped = values.map((value) =>
        tableJQuery.fn.dataTable.util.escapeRegex(value),
      );
      dtTable
        .column(config.colIdx)
        .search(values.length ? `^(?:${escaped.join("|")})$` : "", true, false);
      updateFilterSummary(config);
    }

    function updateActiveFilters() {
      pillsContainer.replaceChildren();
      function addPill(label, remove) {
        const pill = document.createElement("span");
        pill.className = "dt-filter-pill ntgc-pill";
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
        const filter = filterControls.get(config.colIdx);
        filter.selected.forEach((value) => {
          addPill(`${config.label}: ${value}`, () => {
            filter.selected.delete(value);
            applyColumnFilter(config);
            dtTable.draw();
            filter.summary.focus();
          });
        });
      });
      activeFiltersRow.hidden = !pillsContainer.childElementCount;
    }

    filterConfigs.forEach((config) => {
      const item = document.createElement("div");
      item.className = "dt-filter-item";
      const caption = document.createElement("span");
      caption.className = "dt-filter-label ntgc-form-input--label";
      caption.textContent = config.label;
      if (!config.multiple) {
        const select = document.createElement("select");
        select.className =
          "dt-filter-select ntgc-select ntgc-select--block ntgc-select-input--filter";
        select.id = `${table.id}-filter-${config.colIdx}`;
        caption.id = `${select.id}-label`;
        select.setAttribute("aria-labelledby", caption.id);
        const selected = new Set();
        select.addEventListener("change", () => {
          selected.clear();
          if (select.value) selected.add(select.value);
          applyColumnFilter(config);
          dtTable.draw();
        });
        filterControls.set(config.colIdx, { selected, summary: select });
        item.append(caption, select);
        filterBar.append(item);
        return;
      }
      const dropdown = document.createElement("div");
      dropdown.className = "dt-filter-dropdown";
      const summary = document.createElement("button");
      summary.type = "button";
      summary.className =
        "dt-filter-select ntgc-select ntgc-select--block ntgc-select-input--filter";
      const panel = document.createElement("div");
      panel.className = "dt-filter-panel";
      panel.id = `${table.id}-filter-${config.colIdx}`;
      panel.hidden = true;
      summary.setAttribute("aria-controls", panel.id);
      summary.setAttribute("aria-expanded", "false");
      function setOpen(open) {
        panel.hidden = !open;
        summary.setAttribute("aria-expanded", String(open));
      }
      summary.addEventListener("click", () => setOpen(panel.hidden));
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "dt-clear-filters";
      reset.textContent = config.defaultLabel;
      const options = document.createElement("div");
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", config.label);
      const selected = new Set();
      options.addEventListener("change", (event) => {
        const checkbox = event.target;
        if (checkbox.checked) {
          selected.add(checkbox.value);
        } else {
          selected.delete(checkbox.value);
        }
        applyColumnFilter(config);
        dtTable.draw();
      });
      reset.addEventListener("click", () => {
        selected.clear();
        applyColumnFilter(config);
        dtTable.draw();
      });
      dropdown.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          summary.focus();
        }
      });
      dropdown.addEventListener("focusout", (event) => {
        if (event.relatedTarget && !dropdown.contains(event.relatedTarget)) {
          setOpen(false);
        }
      });
      filterControls.set(config.colIdx, {
        selected,
        summary,
        options,
        dropdown,
        setOpen,
      });
      panel.append(reset, options);
      dropdown.append(summary, panel);
      item.append(caption, dropdown);
      filterBar.append(item);
    });
    document.addEventListener("click", (event) => {
      filterControls.forEach(({ dropdown, setOpen }) => {
        if (dropdown && !dropdown.contains(event.target)) setOpen(false);
      });
    });
    refreshFilterOptions();
    filterBar.prepend(wrapper.querySelector(".dataTables_filter"));
    filterBar.append(wrapper.querySelector(".dataTables_length"));
    wrapper.prepend(filterBar, activeFiltersRow);
    wrapper.querySelector(".dt-top-ctrl").remove();
    dtTable.on("draw.dt", updateActiveFilters);
    function styleTableControls() {
      wrapper
        .querySelectorAll(".dataTables_filter label, .dataTables_length label")
        .forEach((label) => {
          label.classList.add("ntgc-form-input--label");
        });
      const search = wrapper.querySelector(".dataTables_filter input");
      search.classList.remove("form-control", "form-control-sm");
      search.classList.add(
        "ntgc-text-input",
        "ntgc-text-input--block",
        "ntgc-select-input--filter",
      );
      const length = wrapper.querySelector(".dataTables_length select");
      length.classList.remove(
        "form-select",
        "form-select-sm",
        "custom-select",
        "custom-select-sm",
        "form-control",
        "form-control-sm",
      );
      length.classList.add("ntgc-select");
      wrapper
        .querySelectorAll(".dataTables_paginate .pagination")
        .forEach((list) => {
          list.classList.add("ntgc-pagination");
          list.querySelectorAll("li").forEach((item) => {
            item.classList.add("ntgc-pagination-item");
            const link = item.querySelector("a");
            if (!link) return;
            link.classList.remove("page-link");
            link.classList.add("ntgc-pagination__link");
            link.classList.toggle(
              "ntgc-pagination__link--current",
              item.classList.contains("active"),
            );
          });
        });
    }
    styleTableControls();
    dtTable.on("draw.dt", styleTableControls);
    clearButton.addEventListener("click", () => {
      dtTable.search("");
      filterConfigs.forEach((config) => {
        filterControls.get(config.colIdx).selected.clear();
        applyColumnFilter(config);
      });
      dtTable.draw();
      filterControls.get(filterConfigs[0].colIdx).summary.focus();
    });
    table.addEventListener("editor:saved", (event) => {
      const restoreScroll = preserveScrollPosition(table);
      dtTable.row(event.target.closest("tr")).invalidate("dom");
      refreshFilterOptions();
      dtTable.draw(false);
      if (!isActivating()) {
        if (event.target.isConnected) {
          event.target.focus({ preventScroll: true });
        } else if (
          !document.activeElement ||
          document.activeElement === document.body
        ) {
          filterControls
            .get(filterConfigs[0].colIdx)
            .summary.focus({ preventScroll: true });
        }
      }
      restoreScroll();
    });
  }

  window.MetadataDashboardTable = {
    initialise: initialiseTableControls,
    preserveScrollPosition,
  };
})();
