(() => {
  function initialise(config) {
    const preserveScrollPosition = window.MetadataDashboardTable.preserveScrollPosition;
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

    const statusByLabel = new Map(
      statusOptions.map((option) => [getStatusKey(option.label), option.value]),
    );
    const feedbackTimers = new WeakMap();
    let activeEditor = null;
    let activatingCell = false;
    let feedbackCount = 0;

    function getStatusKey(label) {
      return label
        .trim()
        .toLowerCase()
        .replace(/^archived$/, "archive")
        .replace(/^safe editing\b/, "safe edit")
        .replace(/^(approved|safe edit approved) to go live$/, "$1")
        .replace(/\s+/g, "-");
    }

    function setStatusPresentation(cell, label) {
      cell.closest("td")?.setAttribute("data-status", getStatusKey(label));
    }

    function getCellFeedback(cell) {
      const tableCell = cell.closest("td");
      let result = tableCell.querySelector(".editor-field-result");
      if (!result) {
        result = document.createElement("div");
        result.className = "editor-field-result";
        result.id = `editor-feedback-${++feedbackCount}`;
        result.setAttribute("role", "status");
        result.setAttribute("aria-live", "polite");
        result.setAttribute("aria-atomic", "true");
        tableCell.append(result);
      }
      return result;
    }

    function clearCellFeedback(cell) {
      const result = getCellFeedback(cell);
      window.clearTimeout(feedbackTimers.get(result));
      result.textContent = "";
      delete result.dataset.kind;
    }

    function announce(message, kind = "success", cell = null) {
      const result = cell
        ? getCellFeedback(cell)
        : document.querySelector(".editor-results");
      if (!result) {
        return;
      }

      window.clearTimeout(feedbackTimers.get(result));
      result.textContent = message;
      result.dataset.kind = kind;
      if (kind === "success") {
        feedbackTimers.set(
          result,
          window.setTimeout(() => {
            result.textContent = "";
            delete result.dataset.kind;
          }, 3000),
        );
      }
    }

    function getLabel(field) {
      return {
        status: "Status",
        name: config.labels.name,
        "web-path": "Web path",
        description: config.labels.description,
      }[field];
    }

    function getDisplayValue(cell) {
      return cell.dataset.displayValue ?? cell.textContent.trim();
    }

    function makeControl(field, value) {
      if (field === "status") {
        const select = document.createElement("select");
        select.className = "editor-control ntgc-select ntgc-select--block";
        select.setAttribute("aria-label", "Status");
        const selectedValue = statusByLabel.get(getStatusKey(value));
        if (!selectedValue) {
          const currentOption = new Option(value, "", true, true);
          currentOption.disabled = true;
          select.append(currentOption);
        }
        statusOptions.forEach((option) => {
          const element = document.createElement("option");
          element.value = option.value;
          element.textContent = option.label;
          element.selected = option.value === selectedValue;
          select.append(element);
        });
        return select;
      }

      const control = document.createElement(
        field === "description" ? "textarea" : "input",
      );
      control.className = "editor-control ntgc-text-input ntgc-text-input--block";
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
      if (activeEditor?.cell === cell) activeEditor = null;
      if (!activatingCell) cell.focus({ preventScroll: true });
    }

    function validate(field, value) {
      if (field !== "description" && !value.trim()) {
        return `${getLabel(field)} cannot be empty.`;
      }

      if (
        field === "web-path" &&
        (!value.startsWith("/") || value.includes("://"))
      ) {
        return "Web path must begin with / and must not be a full URL.";
      }

      return "";
    }

    async function saveCell(editor) {
      const { cell, field, control, originalValue, initialControlValue } = editor;
      const value = control.value.trim();
      if (value === initialControlValue.trim()) {
        clearCellFeedback(cell);
        restoreCell(cell, originalValue);
        return true;
      }

      const validationError = validate(field, value);
      if (validationError) {
        announce(validationError, "error", cell);
        control.setAttribute("aria-invalid", "true");
        control.focus({ preventScroll: true });
        return false;
      }

      const row = cell.closest("tr");
      const assetId = row?.dataset.assetId;
      if (!assetId) {
        announce("This row does not include a Matrix asset ID.", "error", cell);
        control.focus({ preventScroll: true });
        return false;
      }

      clearCellFeedback(cell);
      control.removeAttribute("aria-invalid");
      control.disabled = true;
      cell.closest("td").setAttribute("aria-busy", "true");
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
          restoreCell(
            cell,
            isLocalDevelopment() ? `https://example.local${value}` : value,
          );
        } else {
          await updateMetadata(
            assetId,
            config.metadataFields?.[field] ?? cell.dataset.metadatafieldid,
            value,
          );
          restoreCell(cell, value);
        }
        announce(`${getLabel(field)} saved.`, "success", cell);
        cell.dispatchEvent(new CustomEvent("editor:saved", { bubbles: true }));
        return true;
      } catch (error) {
        control.disabled = false;
        buttons.forEach((button) => {
          button.disabled = false;
        });
        announce(
          error.message || "The change could not be saved.",
          "error",
          cell,
        );
        control.focus({ preventScroll: true });
        return false;
      } finally {
        cell.closest("td").removeAttribute("aria-busy");
      }
    }

    function saveEditor(editor) {
      if (!editor.saving) {
        editor.saving = saveCell(editor).finally(() => {
          editor.saving = null;
        });
      }
      return editor.saving;
    }

    async function activateCell(cell) {
      if (activatingCell || activeEditor?.cell === cell) {
        return;
      }

      activatingCell = true;
      const restoreScroll = preserveScrollPosition(cell);
      try {
        if (activeEditor && !(await saveEditor(activeEditor))) return;
        if (!cell.isConnected) return;
        await openCell(cell);
      } finally {
        restoreScroll();
        activatingCell = false;
      }
    }

    async function openCell(cell) {
      const field = cell.dataset.editorField;
      const originalValue = getDisplayValue(cell);
      cell.dataset.displayValue = originalValue;
      let editValue = originalValue;

      if (field === "web-path") {
        try {
          editValue = await getWebPath(
            cell.closest("tr")?.dataset.assetId,
            cell.dataset.webPath || originalValue,
          );
        } catch (error) {
          announce(
            error.message || "The web path could not be loaded.",
            "error",
            cell,
          );
          return;
        }
      }

      const control = makeControl(field, editValue);
      clearCellFeedback(cell);
      control.setAttribute("aria-describedby", getCellFeedback(cell).id);
      const actions = document.createElement("div");
      actions.className = "editor-actions";
      const save = document.createElement("button");
      save.type = "button";
      save.className = "ntgc-btn ntgc-btn--primary";
      save.textContent = "Save";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.className = "secondary-action ntgc-btn ntgc-btn--secondary";
      actions.append(save, cancel);
      cell.replaceChildren(control, actions);
      const editor = {
        cell,
        field,
        control,
        originalValue,
        initialControlValue: control.value,
        saving: null,
      };
      activeEditor = editor;
      control.focus({ preventScroll: true });

      save.addEventListener("click", () => saveEditor(editor));
      function cancelEdit() {
        if (editor.saving) return;
        clearCellFeedback(cell);
        restoreCell(cell, originalValue);
      }
      cancel.addEventListener("click", cancelEdit);
      control.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !control.disabled) {
          event.preventDefault();
          cancelEdit();
        }
      });
    }

    function initialiseEditor() {
      const table = document.querySelector(config.tableSelector);
      if (!table) {
        return;
      }

      const selector = config.editableFields
        .map((field) => `.edit_area[data-editor-field="${field}"]`)
        .join(", ");
      table.querySelectorAll(selector).forEach((cell) => {
        cell.closest("td").classList.add("editor-cell");
        getCellFeedback(cell);
        cell.tabIndex = 0;
        cell.setAttribute("role", "button");
        cell.dataset.label = getLabel(cell.dataset.editorField);
        cell.setAttribute(
          "aria-label",
          `Edit ${getLabel(cell.dataset.editorField)}`,
        );
        if (cell.dataset.editorField === "status") {
          setStatusPresentation(cell, cell.textContent.trim());
        }
      });

      table.addEventListener("click", (event) => {
        const cell = event.target
          .closest("td")
          ?.querySelector(selector);
        if (cell && !event.target.closest("button, input, select, textarea, a")) {
          activateCell(cell);
        }
      });

      table.addEventListener("keydown", (event) => {
        const cell = event.target.closest(selector);
        if (
          cell &&
          event.target === cell &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          activateCell(cell);
        }
      });

      window.MetadataDashboardTable.initialise(table, config, {
        announce,
        getDisplayValue,
        isActivating: () => activatingCell,
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialiseEditor, {
        once: true,
      });
    } else {
      initialiseEditor();
    }
  }
  window.MetadataDashboardEditor = { initialise };
})();
