import { TubeTimeline } from './tube-timeline.js';

export class TimelineBuilder {
    constructor() {
        // Use dates relative to today for an easier starting point
        const today = new Date();
        const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const plus = (days) => { const n = new Date(today); n.setDate(n.getDate() + days); return n; };
        this.data = [
            {
                track: 'Project Alpha',
                label: 'PA',
                color: '#E32017',
                dates: [
                    { date: fmt(today), name: 'Kickoff', type: 'start', label: 'Start' },
                    { date: fmt(plus(30)), name: 'Design Review', type: 'review', label: 'Review' },
                    { date: fmt(plus(90)), name: 'Launch', type: 'end', label: 'Launch' }
                ]
            }
        ];
        this.options = {
            header: { title: 'My Timeline', subtitle: 'Project Roadmap', logoHref: '' },
            showToday: true,
            orientation: 'auto'
        };
        this.timeline = null;
        this.init();
    }

    init() {
        this.renderEditor();
        this.updatePreview();
        this.attachGlobalListeners();
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
        if (!str) return '';
        if (this.isFullDateString(str)) {
            const [d, m, y] = str.split('/');
            return `${y}-${m}-${d}`; // YYYY-MM-DD
        }
        if (this.isMonthYearString(str)) {
            const [m, y] = str.split('/');
            return `${y}-${m}`; // YYYY-MM for <input type="month">
        }
        // fallback: try parse as full date via TubeTimeline's parser
        try {
            const parts = str.split('/');
            if (parts.length === 3) {
                const [d, m, y] = parts; return `${y}-${m}-${d}`;
            }
        } catch (e) { }
        return '';
    }
    // Convert native date input value => data string
    inputValueToDataDate(value, type) {
        if (!value) return '';
        if (type === 'date') {
            // YYYY-MM-DD => DD/MM/YYYY
            const [y, m, d] = value.split('-');
            return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        }
        if (type === 'month') {
            // YYYY-MM => MM/YYYY
            const [y, m] = value.split('-');
            return `${m.padStart(2, '0')}/${y}`;
        }
        return value;
    }

    attachGlobalListeners() {
        document.getElementById('add-track-btn').addEventListener('click', () => this.addTrack());
        document.getElementById('import-btn').addEventListener('click', () => this.importJSON());
        document.getElementById('export-html-btn').addEventListener('click', () => this.exportHTML());
        document.getElementById('export-png-btn').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('export-svg-btn').addEventListener('click', () => this.exportImage('svg'));

        // Global options listeners
        document.getElementById('opt-title').addEventListener('input', (e) => {
            this.options.header.title = e.target.value;
            this.updatePreview();
        });
        document.getElementById('opt-subtitle').addEventListener('input', (e) => {
            this.options.header.subtitle = e.target.value;
            this.updatePreview();
        });
        document.getElementById('opt-orientation').addEventListener('change', (e) => {
            this.options.orientation = e.target.value;
            this.updatePreview();
        });
        document.getElementById('opt-show-today').addEventListener('change', (e) => {
            this.options.showToday = e.target.checked;
            this.updatePreview();
        });
    }

    updatePreview() {
        const container = document.querySelector('#timeline-preview');
        container.innerHTML = ''; // Clear previous
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.width = '100%';
        svg.style.height = '100%';
        container.appendChild(svg);

        try {
            if (this.timeline) this.timeline.destroy();
            this.timeline = new TubeTimeline({
                target: svg,
                data: this.data,
                options: {
                    ...this.options,
                    onMilestoneDrag: (milestone, track, newDateStr) => {
                        // Find the track and milestone in our data
                        const trackIndex = this.data.findIndex(t => t.track === track.track);
                        if (trackIndex === -1) return;
                        
                        // Match by type and name (more reliable than date since date changes)
                        // For start/end milestones, type is unique per track
                        const milestoneIndex = this.data[trackIndex].dates.findIndex(
                            m => m.type === milestone.type && m.name === milestone.name
                        );
                        if (milestoneIndex === -1) return;
                        
                        // Update the date
                        this.data[trackIndex].dates[milestoneIndex].date = newDateStr;
                        
                        // Update the preview (will trigger re-render)
                        this.updatePreview();
                        
                        // Update the sidebar form inputs
                        this.renderEditor();
                    }
                },
                d3: window.d3 // Explicitly pass global d3
            });
            this.timeline.render();
        } catch (e) {
            console.error('Render error:', e);
        }
    }

    renderEditor() {
        const container = document.getElementById('tracks-container');
        container.innerHTML = '';

        this.data.forEach((track, trackIndex) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'track-card';
            trackEl.dataset.trackIndex = trackIndex;
            
            // Determine which buttons to show based on position
            const isFirst = trackIndex === 0;
            const isLast = trackIndex === this.data.length - 1;
            const isOnly = this.data.length === 1;
            
            // Build order controls HTML
            let orderControlsHTML = '';
            if (!isOnly) {
                orderControlsHTML = `
          <div class="track-order-controls">
            <button class="btn-order move-up-btn" data-idx="${trackIndex}" 
                    title="Move up" ${isFirst ? 'disabled' : ''}>
              <i class="fas fa-chevron-up"></i>
            </button>
            <button class="btn-order move-down-btn" data-idx="${trackIndex}" 
                    title="Move down" ${isLast ? 'disabled' : ''}>
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>`;
            }
            
            trackEl.innerHTML = `
        <div class="track-header">
          ${orderControlsHTML}
          <div class="track-info">
            <input type="color" value="${track.color}" class="track-color-input" data-idx="${trackIndex}">
            <input type="text" value="${track.track}" class="track-name-input" data-idx="${trackIndex}" placeholder="Track Name">
          </div>
          <button class="btn-icon delete-track-btn" data-idx="${trackIndex}" title="Delete Track">&times;</button>
        </div>
        <div class="milestones-list" id="milestones-${trackIndex}"></div>
        <button class="btn-small add-milestone-btn" data-idx="${trackIndex}">+ Add Milestone</button>
      `;
            container.appendChild(trackEl);

            // Milestones
            const milestonesContainer = trackEl.querySelector(`#milestones-${trackIndex}`);
            track.dates.forEach((milestone, mIndex) => {
                const mEl = document.createElement('div');
                mEl.className = 'milestone-row';
                // Always use full date input, convert month/year to full date if needed
                let dateStr = milestone.date;
                if (this.isMonthYearString(dateStr)) {
                    const [m, y] = dateStr.split('/');
                    dateStr = `01/${m}/${y}`;
                    milestone.date = dateStr; // Update data to full date
                } else if (!this.isFullDateString(dateStr)) {
                    // If not a valid format, default to today
                    dateStr = new Date().toLocaleDateString('en-GB');
                    milestone.date = dateStr;
                }
                const dateInputValue = this.dataDateToInputValue(dateStr);
                mEl.innerHTML = `
          <select class="m-type-select" data-tidx="${trackIndex}" data-midx="${mIndex}">
            ${['start', 'end', 'submission', 'review', 'notification', 'abstract', 'invitation', 'cameraReady']
                        .map(t => `<option value="${t}" ${milestone.type === t ? 'selected' : ''}>${this.getTypeIcon(t)}</option>`).join('')}
          </select>
          <input type="date" class="m-date-input" value="${dateInputValue}" data-tidx="${trackIndex}" data-midx="${mIndex}">
          <input type="text" class="m-name-input" value="${milestone.name}" data-tidx="${trackIndex}" data-midx="${mIndex}" placeholder="Milestone Name">
          <button class="btn-icon delete-milestone-btn" data-tidx="${trackIndex}" data-midx="${mIndex}" title="Delete">&times;</button>
        `;
                milestonesContainer.appendChild(mEl);
            });
        });

        this.attachEditorListeners();
    }

    getTypeIcon(type) {
        const icons = {
            start: '📄', end: '✅', submission: '📬', review: '🔍',
            notification: '📢', abstract: '📝', invitation: '✉️', cameraReady: '🖨️'
        };
        return icons[type] || '•';
    }

    moveTrackUp(trackIndex) {
        if (trackIndex === 0) return;
        // Swap with previous track
        [this.data[trackIndex - 1], this.data[trackIndex]] = [this.data[trackIndex], this.data[trackIndex - 1]];
        this.renderEditor();
        this.updatePreview();
    }

    moveTrackDown(trackIndex) {
        if (trackIndex === this.data.length - 1) return;
        // Swap with next track
        [this.data[trackIndex], this.data[trackIndex + 1]] = [this.data[trackIndex + 1], this.data[trackIndex]];
        this.renderEditor();
        this.updatePreview();
    }

    attachEditorListeners() {
        // Track inputs
        document.querySelectorAll('.track-name-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const target = e.currentTarget;
                this.data[target.dataset.idx].track = target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.track-color-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const target = e.currentTarget;
                this.data[target.dataset.idx].color = target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.delete-track-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.data.splice(target.dataset.idx, 1);
                this.renderEditor();
                this.updatePreview();
            });
        });
        
        // Track reordering buttons
        document.querySelectorAll('.move-up-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.moveTrackUp(parseInt(target.dataset.idx));
            });
        });
        document.querySelectorAll('.move-down-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.moveTrackDown(parseInt(target.dataset.idx));
            });
        });

        // Milestone inputs
        // Handle changes from native date inputs
        document.querySelectorAll('.m-date-input').forEach(el => {
            // Use change for native date controls
            el.addEventListener('change', (e) => {
                const target = e.currentTarget;
                const tidx = target.dataset.tidx, midx = target.dataset.midx;
                const v = target.value;
                // Convert native value (YYYY-MM-DD) to data date string (DD/MM/YYYY)
                const dateStr = this.inputValueToDataDate(v, 'date');
                this.data[tidx].dates[midx].date = dateStr;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.m-name-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const target = e.currentTarget;
                this.data[target.dataset.tidx].dates[target.dataset.midx].name = target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.m-type-select').forEach(el => {
            el.addEventListener('change', (e) => {
                const target = e.currentTarget;
                this.data[target.dataset.tidx].dates[target.dataset.midx].type = target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.delete-milestone-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const { tidx, midx } = target.dataset;
                this.data[tidx].dates.splice(midx, 1);
                this.renderEditor();
                this.updatePreview();
            });
        });
        document.querySelectorAll('.add-milestone-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const target = e.currentTarget;
                this.data[target.dataset.idx].dates.push({
                    date: new Date().toLocaleDateString('en-GB'), name: 'New Milestone', type: 'submission'
                });
                this.renderEditor();
                this.updatePreview();
            });
        });
    }

    addTrack() {
        const todayStr = new Date().toLocaleDateString('en-GB');
        this.data.push({
            track: 'New Track',
            color: '#333333',
            dates: [{ date: todayStr, name: 'Start', type: 'start' }]
        });
        this.renderEditor();
        this.updatePreview();
    }

    importJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
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
                        alert('Invalid JSON: Expected an array of tracks.');
                    }
                } catch (err) {
                    alert('Error parsing JSON');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async exportHTML() {
        let libraryCode = '';
        try {
            const response = await fetch('./src/tube-timeline.js');
            libraryCode = await response.text();
        } catch (e) {
            console.warn('Could not fetch local library code, falling back to CDN link.');
        }

        const scriptTag = libraryCode
            ? `<script type="module">\n${libraryCode}\n\n// Exported Data\nconst data = ${JSON.stringify(this.data, null, 2)};\nconst options = ${JSON.stringify(this.options, null, 2)};\n\nnew TubeTimeline({ target: document.querySelector('svg'), data, options }).render();\n</script>`
            : `<script type="module">\nimport { TubeTimeline } from 'https://cdn.jsdelivr.net/gh/danylaksono/tube-timeline@main/src/tube-timeline.js';\nconst data = ${JSON.stringify(this.data, null, 2)};\nconst options = ${JSON.stringify(this.options, null, 2)};\nnew TubeTimeline({ target: document.querySelector('svg'), data, options }).render();\n</script>`;

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

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timeline.html';
        a.click();
        URL.revokeObjectURL(url);
    }

    exportImage(type) {
        const svg = document.querySelector('#timeline-preview svg');
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svg);

        // Add namespaces
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        const preamble = '<?xml version="1.0" standalone="no"?>\r\n';
        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(preamble + source);

        if (type === 'svg') {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'timeline.svg';
            a.click();
        } else {
            const canvas = document.createElement('canvas');
            const bbox = svg.getBoundingClientRect();
            canvas.width = bbox.width;
            canvas.height = bbox.height;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = 'timeline.png';
                a.click();
            };
            img.src = url;
        }
    }
}
