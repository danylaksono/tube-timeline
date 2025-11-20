import { TubeTimeline } from "./tube-timeline.js";

export class TimelineBuilder {
  constructor() {
    // Use dates relative to today for an easier starting point
    const today = new Date();
    const fmt = (d) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`;
    const plus = (days) => {
      const n = new Date(today);
      n.setDate(n.getDate() + days);
      return n;
    };
    const minus = (days) => {
      const n = new Date(today);
      n.setDate(n.getDate() - days);
      return n;
    };
    this.data = [
      {
        track: "Project Alpha",
        label: "PA",
        color: "#E32017",
        dates: [
          {
            date: fmt(minus(15)),
            name: "Kickoff",
            type: "start",
            label: "Start",
          },
          {
            date: fmt(plus(30)),
            name: "Design Review",
            type: "node",
            label: "Review",
          },
          { date: fmt(plus(90)), name: "Launch", type: "end", label: "Launch" },
        ],
      },
    ];
    this.options = {
      header: {
        title: "My Timeline",
        subtitle: "Project Roadmap",
        logoHref: "",
      },
      showToday: true,
      orientation: "auto",
    };
    this.timeline = null;
    this.svg = null; // Add a property to hold the SVG element
    this.trackCollapseState = new WeakMap();
    this.handleDocumentClick = (event) => {
      if (!event.target.closest(".milestone-actions-dropdown")) {
        this.closeAllDropdowns();
      }
    };
    document.addEventListener("click", this.handleDocumentClick);
    this.init();
  }

  init() {
    this.renderEditor();
    this.updatePreview();
    this.attachGlobalListeners();
    window.addEventListener("resize", () => this.updatePreview()); // Re-render on resize
  }

  // Utilities for date parsing/formatting between UI and data format
  isFullDateString(str) {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(str);
  }
  isMonthYearString(str) {
    return /^\d{2}\/\d{4}$/.test(str);
  }
  // Convert DD/MM/YYYY or MM/YYYY => native input value
  dataDateToInputValue(str) {
    if (!str) return "";
    if (this.isFullDateString(str)) {
      const [d, m, y] = str.split("/");
      return `${y}-${m}-${d}`; // YYYY-MM-DD
    }
    if (this.isMonthYearString(str)) {
      const [m, y] = str.split("/");
      return `${y}-${m}`; // YYYY-MM for <input type="month">
    }
    // fallback: try parse as full date via TubeTimeline's parser
    try {
      const parts = str.split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y}-${m}-${d}`;
      }
    } catch (e) {}
    return "";
  }
  // Convert native date input value => data string
  inputValueToDataDate(value, type) {
    if (!value) return "";
    if (type === "date") {
      // YYYY-MM-DD => DD/MM/YYYY
      const [y, m, d] = value.split("-");
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    if (type === "month") {
      // YYYY-MM => MM/YYYY
      const [y, m] = value.split("-");
      return `${m.padStart(2, "0")}/${y}`;
    }
    return value;
  }

  normalizeDateString(str) {
    if (!str) return "";
    if (this.isFullDateString(str)) return str;
    if (this.isMonthYearString(str)) {
      const [m, y] = str.split("/");
      return `01/${m}/${y}`;
    }
    return "";
  }

  getSanitizedData() {
    const todayStr = new Date().toLocaleDateString("en-GB");
    return this.data.map((track) => ({
      ...track,
      dates: track.dates.map((milestone) => {
        const normalized = this.normalizeDateString(milestone.date);
        return {
          ...milestone,
          date: normalized || todayStr,
        };
      }),
    }));
  }

  closeAllDropdowns() {
    document
      .querySelectorAll(".milestone-actions-dropdown.is-active")
      .forEach((dropdown) => dropdown.classList.remove("is-active"));
  }

  toggleDropdown(dropdown) {
    if (!dropdown) return;
    const isActive = dropdown.classList.contains("is-active");
    this.closeAllDropdowns();
    if (!isActive) dropdown.classList.add("is-active");
  }

  parseDateForSort(str) {
    if (!str) return new Date(0);
    if (this.isFullDateString(str)) {
      const [d, m, y] = str.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    if (this.isMonthYearString(str)) {
      const [m, y] = str.split("/").map(Number);
      return new Date(y, m - 1, 1);
    }
    const parsed = Date.parse(str);
    return Number.isNaN(parsed) ? new Date(0) : new Date(parsed);
  }

  attachGlobalListeners() {
    document
      .getElementById("add-track-btn")
      .addEventListener("click", () => this.addTrack());
    document
      .getElementById("import-btn")
      .addEventListener("click", () => this.importJSON());
    document
      .getElementById("export-html-btn")
      .addEventListener("click", () => this.exportHTML());
    document
      .getElementById("export-png-btn")
      .addEventListener("click", () => this.exportImage("png"));
    document
      .getElementById("export-svg-btn")
      .addEventListener("click", () => this.exportImage("svg"));

    // Global options listeners
    document.getElementById("opt-title").addEventListener("input", (e) => {
      this.options.header.title = e.target.value;
      this.updatePreview();
    });
    document.getElementById("opt-subtitle").addEventListener("input", (e) => {
      this.options.header.subtitle = e.target.value;
      this.updatePreview();
    });
    document
      .getElementById("opt-orientation")
      .addEventListener("change", (e) => {
        this.options.orientation = e.target.value;
        this.updatePreview();
      });
    document
      .getElementById("opt-show-today")
      .addEventListener("change", (e) => {
        this.options.showToday = e.target.checked;
        this.updatePreview();
      });
  }

  updatePreview() {
    const container = document.querySelector("#timeline-preview");
    if (!this.svg) {
      container.innerHTML = ""; // Clear previous
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.style.width = "100%";
      this.svg.style.height = "100%";
      container.appendChild(this.svg);
    }

    try {
      if (this.timeline) this.timeline.destroy();
      this.timeline = new TubeTimeline({
        target: this.svg,
        data: this.getSanitizedData(),
        options: {
          ...this.options,
          // Preserve editor track ordering in the timeline (don't auto-sort by date)
          sortTracksByStartDate: false,
          onMilestoneDrag: (milestone, track, newDateStr) => {
            // Find the track and milestone in our data
            const trackIndex = this.data.findIndex(
              (t) => t.track === track.track
            );
            if (trackIndex === -1) return;

            // Match by type and name (more reliable than date since date changes)
            // For start/end milestones, type is unique per track
            const milestoneIndex = this.data[trackIndex].dates.findIndex(
              (m) => m.type === milestone.type && m.name === milestone.name
            );
            if (milestoneIndex === -1) return;

            // Update the date
            this.data[trackIndex].dates[milestoneIndex].date = newDateStr;

            // Update the preview (will trigger re-render)
            this.updatePreview();

            // Update the sidebar form inputs
            this.renderEditor();
          },
        },
        d3: window.d3, // Explicitly pass global d3
      });
      this.timeline.render();
    } catch (e) {
      console.error("Render error:", e);
    }
  }

  renderEditor() {
    const container = document.getElementById("tracks-container");
    container.innerHTML = "";

    this.data.forEach((track, trackIndex) => {
      const trackEl = document.createElement("div");
      const isCollapsed = this.trackCollapseState.get(track) || false;
      trackEl.className = `track-card card ${
        isCollapsed ? "is-collapsed" : ""
      }`;
      trackEl.dataset.trackIndex = trackIndex;

      // Determine which buttons to show based on position
      const isFirst = trackIndex === 0;
      const isLast = trackIndex === this.data.length - 1;
      const isOnly = this.data.length === 1;

      // Build order controls HTML
      let orderControlsHTML = "";
      if (!isOnly) {
        orderControlsHTML = `
          <div class="track-order-controls">
            <button class="btn-order move-up-btn" data-idx="${trackIndex}" 
                    title="Move up" ${isFirst ? "disabled" : ""}>
              <i class="fas fa-chevron-up"></i>
            </button>
            <button class="btn-order move-down-btn" data-idx="${trackIndex}" 
                    title="Move down" ${isLast ? "disabled" : ""}>
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>`;
      }

      const collapseIcon = isCollapsed ? "fa-chevron-down" : "fa-chevron-up";
      const collapseLabel = isCollapsed ? "Expand track" : "Collapse track";

      trackEl.innerHTML = `
        <header class="card-header track-header">
          <div class="track-header-left">
            ${orderControlsHTML}
            <div class="track-info">
              <input type="color" value="${
                track.color
              }" class="track-color-input" data-idx="${trackIndex}">
              <input type="text" value="${
                track.track
              }" class="track-name-input" data-idx="${trackIndex}" placeholder="Track Name">
            </div>
          </div>
          <div class="track-header-actions">
            <button class="btn-icon delete-track-btn" data-idx="${trackIndex}" title="Delete Track">
              <i class="fas fa-trash"></i>
            </button>
            <button class="btn-icon track-collapse-btn" data-idx="${trackIndex}" title="${collapseLabel}">
              <i class="fas ${collapseIcon}"></i>
            </button>
          </div>
        </header>
        <div class="card-content track-body ${
          isCollapsed ? "is-collapsed" : ""
        }">
          <div class="milestones-list" id="milestones-${trackIndex}"></div>
          <button class="btn-small add-milestone-btn" data-idx="${trackIndex}">+ Add Milestone</button>
        </div>
      `;
      container.appendChild(trackEl);

      // Milestones (auto-sorted by date)
      track.dates.sort((a, b) => {
        const normalizedA = this.normalizeDateString(a.date) || a.date;
        const normalizedB = this.normalizeDateString(b.date) || b.date;
        return (
          this.parseDateForSort(normalizedA) -
          this.parseDateForSort(normalizedB)
        );
      });
      const milestonesContainer = trackEl.querySelector(
        `#milestones-${trackIndex}`
      );
      track.dates.forEach((milestone, mIndex) => {
        const mEl = document.createElement("div");
        mEl.className = "milestone-row";
        mEl.dataset.tidx = trackIndex;
        mEl.dataset.midx = mIndex;
        let dateStr = milestone.date;
        let dateError = "";
        let dateInputValue = "";
        if (this.isMonthYearString(dateStr)) {
          const [m, y] = dateStr.split("/");
          dateStr = `01/${m}/${y}`;
          milestone.date = dateStr; // Normalize month/year once
          dateInputValue = this.dataDateToInputValue(dateStr);
        } else if (this.isFullDateString(dateStr)) {
          dateInputValue = this.dataDateToInputValue(dateStr);
        } else {
          dateError = dateStr
            ? "Invalid date (use DD/MM/YYYY)"
            : "Date required";
        }
        if (!milestone.label || !milestone.label.trim()) {
          milestone.label = milestone.name || "Milestone";
        }
        const labelValue = milestone.label;
        const tooltipValue = milestone.name || "";
        const dateFieldClasses = ["field", "is-small", "date-field"];
        if (dateError) dateFieldClasses.push("has-error");
        const typeOptions = ["start", "end", "node"]
          .map(
            (t) =>
              `<option value="${t}" ${
                milestone.type === t ? "selected" : ""
              }>${this.getTypeIcon(t)} ${this.getTypeLabel(t)}</option>`
          )
          .join("");

        mEl.innerHTML = `
          <div class="box milestone-card">
            <div class="columns is-variable is-1 is-mobile milestone-grid">
              <div class="column is-7">
                <div class="field is-small">
                  <label class="label is-size-7 has-text-grey">Label</label>
                  <div class="control">
                    <input type="text" class="input is-small m-label-input" value="${labelValue}" data-tidx="${trackIndex}" data-midx="${mIndex}" placeholder="Shown on timeline">
                  </div>
                </div>
                <div class="field is-small">
                  <label class="label is-size-7 has-text-grey">Tooltip</label>
                  <div class="control">
                    <input type="text" class="input is-small m-tooltip-input" value="${tooltipValue}" data-tidx="${trackIndex}" data-midx="${mIndex}" placeholder="Defaults to label">
                  </div>
                </div>
              </div>
              <div class="column is-5">
                <div class="${dateFieldClasses.join(" ")}">
                  <label class="label is-size-7 has-text-grey">Date</label>
                  <div class="control">
                    <input type="date" class="input is-small m-date-input" value="${dateInputValue}" data-tidx="${trackIndex}" data-midx="${mIndex}" ${
          dateError ? 'aria-invalid="true"' : ""
        }>
                  </div>
                  ${
                    dateError
                      ? `<p class="help is-danger" data-tidx="${trackIndex}" data-midx="${mIndex}">${dateError}</p>`
                      : ""
                  }
                </div>
                <div class="field is-small">
                  <label class="label is-size-7 has-text-grey">Type</label>
                  <div class="control">
                    <div class="select is-small is-fullwidth">
                      <select class="m-type-select" data-tidx="${trackIndex}" data-midx="${mIndex}">
                        ${typeOptions}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="milestone-footer">
              <div class="milestone-actions">
                <div class="dropdown is-right milestone-actions-dropdown">
                  <div class="dropdown-trigger">
                    <button class="button is-light is-small m-actions-btn" aria-haspopup="true" aria-controls="milestone-actions-menu" data-tidx="${trackIndex}" data-midx="${mIndex}">
                      <span class="icon"><i class="fas fa-ellipsis-h"></i></span>
                    </button>
                  </div>
                  <div class="dropdown-menu" role="menu">
                    <div class="dropdown-content">
                      <a class="dropdown-item m-action-duplicate" data-tidx="${trackIndex}" data-midx="${mIndex}">
                        <span class="icon is-small"><i class="fas fa-clone"></i></span>
                        <span>Duplicate</span>
                      </a>
                      <a class="dropdown-item m-action-calendar" data-tidx="${trackIndex}" data-midx="${mIndex}">
                        <span class="icon is-small"><i class="fas fa-calendar-plus"></i></span>
                        <span>Link to calendar</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <button class="button is-danger is-light is-small delete-milestone-btn" data-tidx="${trackIndex}" data-midx="${mIndex}" title="Delete">
                <span class="icon"><i class="fas fa-trash"></i></span>
                <span>Remove</span>
              </button>
            </div>
          </div>
        `;
        milestonesContainer.appendChild(mEl);
      });
    });

    this.attachEditorListeners();
  }

  getTypeIcon(type) {
    const icons = {
      start: "📄",
      end: "✅",
      submission: "📬",
      review: "🔍",
      notification: "📢",
      abstract: "📝",
      invitation: "✉️",
      cameraReady: "🖨️",
      node: "🔘",
    };
    return icons[type] || "•";
  }

  getTypeLabel(type) {
    const labels = {
      start: "Start",
      end: "End",
      submission: "Submission",
      review: "Review",
      notification: "Notification",
      abstract: "Abstract",
      invitation: "Invitation",
      cameraReady: "Camera Ready",
      node: "Node",
    };
    return labels[type] || type;
  }

  moveTrackUp(trackIndex) {
    if (trackIndex === 0) return;
    // Swap with previous track
    [this.data[trackIndex - 1], this.data[trackIndex]] = [
      this.data[trackIndex],
      this.data[trackIndex - 1],
    ];
    this.renderEditor();
    this.updatePreview();
  }

  moveTrackDown(trackIndex) {
    if (trackIndex === this.data.length - 1) return;
    // Swap with next track
    [this.data[trackIndex], this.data[trackIndex + 1]] = [
      this.data[trackIndex + 1],
      this.data[trackIndex],
    ];
    this.renderEditor();
    this.updatePreview();
  }

  duplicateMilestone(trackIndex, milestoneIndex) {
    const track = this.data[trackIndex];
    if (!track) return;
    const original = track.dates[milestoneIndex];
    if (!original) return;
    const clone = JSON.parse(JSON.stringify(original));
    const baseLabel = original.label || original.name || "Milestone";
    const baseName = original.name || baseLabel;
    clone.label = `${baseLabel} (copy)`;
    clone.name = `${baseName} (copy)`;
    track.dates.splice(milestoneIndex + 1, 0, clone);
    this.renderEditor();
    this.updatePreview();
  }

  openCalendarLink(trackIndex, milestoneIndex) {
    const track = this.data[trackIndex];
    const milestone = track?.dates[milestoneIndex];
    if (!milestone) return;
    const normalized = this.normalizeDateString(milestone.date);
    if (!normalized) {
      alert("Please provide a valid date before creating a calendar link.");
      return;
    }
    const [day, month, year] = normalized.split("/").map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const fmt = (date) =>
      `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}${String(date.getDate()).padStart(2, "0")}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: milestone.label || milestone.name || "Timeline milestone",
      details:
        milestone.name ||
        milestone.label ||
        `${track?.track || "Timeline"} milestone`,
      dates: `${fmt(start)}/${fmt(end)}`,
    });
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank"
    );
  }

  attachEditorListeners() {
    // Track inputs
    document.querySelectorAll(".track-name-input").forEach((el) => {
      el.addEventListener("input", (e) => {
        const target = e.currentTarget;
        this.data[target.dataset.idx].track = target.value;
        this.updatePreview();
      });
    });
    document.querySelectorAll(".track-color-input").forEach((el) => {
      el.addEventListener("input", (e) => {
        const target = e.currentTarget;
        this.data[target.dataset.idx].color = target.value;
        this.updatePreview();
      });
    });
    document.querySelectorAll(".delete-track-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget;
        this.data.splice(target.dataset.idx, 1);
        this.renderEditor();
        this.updatePreview();
      });
    });

    // Track reordering buttons
    document.querySelectorAll(".move-up-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget;
        this.moveTrackUp(parseInt(target.dataset.idx));
      });
    });
    document.querySelectorAll(".move-down-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget;
        this.moveTrackDown(parseInt(target.dataset.idx));
      });
    });
    document.querySelectorAll(".track-collapse-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const idx = parseInt(target.dataset.idx, 10);
        const track = this.data[idx];
        const current = this.trackCollapseState.get(track) || false;
        this.trackCollapseState.set(track, !current);
        this.renderEditor();
      });
    });

    // Milestone inputs
    // Handle changes from native date inputs
    document.querySelectorAll(".m-date-input").forEach((el) => {
      // Use change for native date controls
      el.addEventListener("change", (e) => {
        const target = e.currentTarget;
        const tidx = target.dataset.tidx,
          midx = target.dataset.midx;
        const v = target.value;
        // Convert native value (YYYY-MM-DD) to data date string (DD/MM/YYYY)
        const dateStr = this.inputValueToDataDate(v, "date");
        this.data[tidx].dates[midx].date = dateStr;
        this.updatePreview();
      });
    });
    document.querySelectorAll(".m-label-input").forEach((el) => {
      el.addEventListener("input", (e) => {
        const target = e.currentTarget;
        const { tidx, midx } = target.dataset;
        this.data[tidx].dates[midx].label = target.value;
        this.updatePreview();
      });
      el.addEventListener("blur", (e) => {
        const target = e.currentTarget;
        const { tidx, midx } = target.dataset;
        if (!target.value.trim()) {
          const fallback =
            this.data[tidx].dates[midx].name ||
            this.data[tidx].dates[midx].date;
          this.data[tidx].dates[midx].label = fallback;
          target.value = fallback;
          this.updatePreview();
        }
      });
    });
    document.querySelectorAll(".m-tooltip-input").forEach((el) => {
      el.addEventListener("input", (e) => {
        const target = e.currentTarget;
        const { tidx, midx } = target.dataset;
        this.data[tidx].dates[midx].name = target.value;
        this.updatePreview();
      });
      el.addEventListener("blur", (e) => {
        const target = e.currentTarget;
        if (!target.value.trim()) {
          target.value = "";
          const { tidx, midx } = target.dataset;
          this.data[tidx].dates[midx].name = "";
          this.updatePreview();
        }
      });
    });
    document.querySelectorAll(".m-type-select").forEach((el) => {
      el.addEventListener("change", (e) => {
        const target = e.currentTarget;
        this.data[target.dataset.tidx].dates[target.dataset.midx].type =
          target.value;
        this.updatePreview();
      });
    });
    document.querySelectorAll(".delete-milestone-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const { tidx, midx } = target.dataset;
        this.data[tidx].dates.splice(midx, 1);
        this.renderEditor();
        this.updatePreview();
      });
    });
    document.querySelectorAll(".add-milestone-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = e.currentTarget;
        this.data[target.dataset.idx].dates.push({
          date: new Date().toLocaleDateString("en-GB"),
          name: "New Milestone",
          label: "New Milestone",
          type: "submission",
        });
        this.renderEditor();
        this.updatePreview();
      });
    });
    document.querySelectorAll(".m-actions-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = e.currentTarget.closest(".milestone-actions-dropdown");
        this.toggleDropdown(dropdown);
      });
    });
    document.querySelectorAll(".m-action-duplicate").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const { tidx, midx } = e.currentTarget.dataset;
        this.duplicateMilestone(parseInt(tidx, 10), parseInt(midx, 10));
        this.closeAllDropdowns();
      });
    });
    document.querySelectorAll(".m-action-calendar").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const { tidx, midx } = e.currentTarget.dataset;
        this.openCalendarLink(parseInt(tidx, 10), parseInt(midx, 10));
        this.closeAllDropdowns();
      });
    });
  }

  addTrack() {
    const todayStr = new Date().toLocaleDateString("en-GB");
    const newTrack = {
      track: "New Track",
      color: "#333333",
      dates: [{ date: todayStr, name: "Start", label: "Start", type: "start" }],
    };
    this.data.push(newTrack);
    this.trackCollapseState.set(newTrack, false);
    this.renderEditor();
    this.updatePreview();
  }

  importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const json = JSON.parse(evt.target.result);
          if (Array.isArray(json)) {
            this.data = json;
            this.renderEditor();
            this.updatePreview();
          } else {
            alert("Invalid JSON: Expected an array of tracks.");
          }
        } catch (err) {
          alert("Error parsing JSON");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async exportHTML() {
    let libraryCode = "";
    try {
      const response = await fetch("./src/tube-timeline.js");
      libraryCode = await response.text();
    } catch (e) {
      console.warn(
        "Could not fetch local library code, falling back to CDN link."
      );
    }

    const scriptTag = libraryCode
      ? `<script type="module">\n${libraryCode}\n\n// Exported Data\nconst data = ${JSON.stringify(
          this.data,
          null,
          2
        )};\nconst options = ${JSON.stringify(
          this.options,
          null,
          2
        )};\n\nnew TubeTimeline({ target: document.querySelector('svg'), data, options }).render();\n</script>`
      : `<script type="module">\nimport { TubeTimeline } from 'https://cdn.jsdelivr.net/gh/danylaksono/tube-timeline@main/src/tube-timeline.js';\nconst data = ${JSON.stringify(
          this.data,
          null,
          2
        )};\nconst options = ${JSON.stringify(
          this.options,
          null,
          2
        )};\nnew TubeTimeline({ target: document.querySelector('svg'), data, options }).render();\n</script>`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${this.options.header.title}</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>body { margin: 0; font-family: sans-serif; overflow: hidden; } svg { width: 100vw; height: 100vh; }</style>
</head>
<body>
  <svg></svg>
  ${scriptTag}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timeline.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  exportImage(type) {
    const svg = document.querySelector("#timeline-preview svg");
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);

    // Add namespaces
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(
        /^<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }
    if (
      !source.match(
        /^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/
      )
    ) {
      source = source.replace(
        /^<svg/,
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
      );
    }

    const preamble = '<?xml version="1.0" standalone="no"?>\r\n';
    const url =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(preamble + source);

    if (type === "svg") {
      const a = document.createElement("a");
      a.href = url;
      a.download = "timeline.svg";
      a.click();
    } else {
      const canvas = document.createElement("canvas");
      const bbox = svg.getBoundingClientRect();
      canvas.width = bbox.width;
      canvas.height = bbox.height;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "timeline.png";
        a.click();
      };
      img.src = url;
    }
  }
}
