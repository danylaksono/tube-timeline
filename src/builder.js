import { TubeTimeline } from './tube-timeline.js';

export class TimelineBuilder {
    constructor() {
        this.data = [
            {
                track: 'Project Alpha',
                label: 'PA',
                color: '#E32017',
                dates: [
                    { date: '01/01/2024', name: 'Kickoff', type: 'start', label: 'Start' },
                    { date: '15/02/2024', name: 'Design Review', type: 'review', label: 'Review' },
                    { date: '01/04/2024', name: 'Launch', type: 'end', label: 'Launch' }
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
                options: this.options,
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
            trackEl.innerHTML = `
        <div class="track-header">
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
                mEl.innerHTML = `
          <select class="m-type-select" data-tidx="${trackIndex}" data-midx="${mIndex}">
            ${['start', 'end', 'submission', 'review', 'notification', 'abstract', 'invitation', 'cameraReady']
                        .map(t => `<option value="${t}" ${milestone.type === t ? 'selected' : ''}>${this.getTypeIcon(t)}</option>`).join('')}
          </select>
          <input type="text" class="m-date-input" value="${milestone.date}" data-tidx="${trackIndex}" data-midx="${mIndex}" placeholder="DD/MM/YYYY">
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

    attachEditorListeners() {
        // Track inputs
        document.querySelectorAll('.track-name-input').forEach(el => {
            el.addEventListener('input', (e) => {
                this.data[e.target.dataset.idx].track = e.target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.track-color-input').forEach(el => {
            el.addEventListener('input', (e) => {
                this.data[e.target.dataset.idx].color = e.target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.delete-track-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                this.data.splice(e.target.dataset.idx, 1);
                this.renderEditor();
                this.updatePreview();
            });
        });

        // Milestone inputs
        document.querySelectorAll('.m-date-input').forEach(el => {
            el.addEventListener('input', (e) => {
                this.data[e.target.dataset.tidx].dates[e.target.dataset.midx].date = e.target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.m-name-input').forEach(el => {
            el.addEventListener('input', (e) => {
                this.data[e.target.dataset.tidx].dates[e.target.dataset.midx].name = e.target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.m-type-select').forEach(el => {
            el.addEventListener('change', (e) => {
                this.data[e.target.dataset.tidx].dates[e.target.dataset.midx].type = e.target.value;
                this.updatePreview();
            });
        });
        document.querySelectorAll('.delete-milestone-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                const { tidx, midx } = e.target.dataset;
                this.data[tidx].dates.splice(midx, 1);
                this.renderEditor();
                this.updatePreview();
            });
        });
        document.querySelectorAll('.add-milestone-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                this.data[e.target.dataset.idx].dates.push({
                    date: '01/01/2025', name: 'New Milestone', type: 'submission'
                });
                this.renderEditor();
                this.updatePreview();
            });
        });
    }

    addTrack() {
        this.data.push({
            track: 'New Track',
            color: '#333333',
            dates: [{ date: '01/01/2025', name: 'Start', type: 'start' }]
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
