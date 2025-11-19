# tube-timeline

London tube style configurable timeline renderer powered by D3 v7. Ships as a tiny ES module you can use directly in the browser or bundle in your app.

![](./timeline.png)

This work is heavily inspired by [EuroVIS 2026 timeline](https://velitchko.github.io/eurovis-timeline/).

## Installation

### Via Script Module (No Build Step)

```html
<script type="module">
  import { TubeTimeline } from './src/tube-timeline.js';
  // d3 v7 must be present globally or passed in via cfg.d3
  new TubeTimeline({ target: document.querySelector('svg'), data }).render();
</script>
```

### Via npm

```bash
npm i tube-timeline
```

```js
import { TubeTimeline } from 'tube-timeline';
```

## Quick Start

```js
import { TubeTimeline } from './src/tube-timeline.js';
import * as d3 from 'https://cdn.skypack.dev/d3@7'; // or global <script src="https://d3js.org/d3.v7.min.js"></script>

const timeline = new TubeTimeline({
  target: document.querySelector('svg'),
  data,
  d3,
  options: {
    header: { title: 'My Timeline', subtitle: 'Deadlines', logoHref: 'logo.png' },
    showToday: true,
    orientation: 'auto' // 'horizontal' | 'vertical' | 'auto'
  }
});
timeline.render();
```

## API Reference

### `new TubeTimeline(config)`

Creates a new timeline instance.

**Parameters:**

- **target** (required): SVG element or selector string
- **data** (required): Array of tracks (see [Data Structure](#data-structure))
- **d3** (optional): D3 instance; if omitted, uses global `d3`
- **options** (optional):
  - **header**: `{ title, subtitle, logoHref }` - Header configuration
  - **showToday**: Boolean - Show the "Today" marker (default: `true`)
  - **orientation**: `'auto' | 'horizontal' | 'vertical'` - Layout orientation
  - **onMilestoneClick**: Function `(milestone, track)` - Click handler; default opens `milestone.url` if present

### Methods

- **`render()`**: Re-renders the timeline responsively; reattaches resize listener
- **`destroy()`**: Clears SVG and removes all event listeners

## Data Structure

```typescript
type MilestoneType = 'start' | 'end' | 'submission' | 'notification' | 'review' | 'abstract' | 'invitation' | 'cameraReady';

type Milestone = {
  date: string;        // DD/MM/YYYY or MM/YYYY format
  name: string;       // Milestone name
  type: MilestoneType;
  url?: string;       // Optional URL for clickable milestones
  label?: string;     // Optional short label
};

type Track = {
  track: string;      // Track name
  label?: string;     // Optional short label for display
  color: string;      // Hex color code
  dates: Milestone[]; // Array of milestones
};
```

### Supported Milestone Types

| Type          | Icon | Description                       |
|---------------|------|-----------------------------------|
| start         | 📄   | Beginning or kickoff              |
| abstract      | 📝   | Abstract or planning phase        |
| submission    | 📬   | Submission or delivery            |
| review        | 🔍   | Review or evaluation period       |
| notification  | 📢   | Notification or announcement      |
| cameraReady   | 🖨️   | Final delivery or publication     |
| end           | ✅   | Completion or final milestone     |
| invitation    | ✉️   | Invitation or request             |

### Example Data

```javascript
const data = [
  {
    track: 'Product Development',
    label: 'PD',
    color: '#E32017',
    dates: [
      {
        date: '01/01/2024',
        name: 'Project Kickoff',
        type: 'start',
        url: 'https://example.com',
        label: 'Kickoff'
      },
      {
        date: '15/03/2024',
        name: 'Beta Release',
        type: 'submission'
      }
    ]
  }
];
```

## Features

- **Multiple Tracks**: Display parallel timelines with distinct colors and labels
- **Interactive Milestones**: Hover tooltips and clickable milestones with optional URLs
- **Responsive Design**: Automatically switches between horizontal and vertical layouts
- **Legend Interactivity**: Click a legend item to isolate its track; other tracks dim for clarity. Click again to restore all tracks.
- **Today Indicator**: Visual "today" line for current date reference
- **Modular Examples**: Separate HTML files and JSON data for easy customization
- **Extensible**: Easy to add new examples and customize existing ones

## Examples

The library comes with several example implementations:

### Product Launch Timeline

A comprehensive example showing a software product development lifecycle with multiple parallel tracks:

- **Product Development** - Core development milestones
- **Quality Assurance** - Testing and validation phases
- **Marketing & Launch** - Brand and promotional activities
- **Sales & Partnerships** - Business development and sales preparation
- **Legal & Compliance** - Legal requirements and approvals
- **Infrastructure & DevOps** - Technical infrastructure setup

**File**: `examples/product-launch.html`

### EuroVIS 2026 Conference Timeline

The original academic conference example featuring multiple submission tracks:

- Full Papers, Short Papers, State of the Art Reports
- Panels & Tutorials, Workshops, Education Papers
- Posters & Demos

**File**: `examples/eurovis-2026.html`

### Interactive Demo

Open `index.html` in a static server to see the interactive timeline builder in action. Navigate between different examples using the navigation menu.

## Project Structure

```
tube-timeline/
├── src/
│   └── tube-timeline.js          # Main library
├── examples/
│   ├── data/
│   │   ├── product-launch.json   # Product launch data
│   │   └── eurovis-2026.json     # Conference data
│   ├── product-launch.html       # Product launch example
│   └── eurovis-2026.html         # Conference example
├── index.html                    # Main demo page
├── package.json
└── README.md
```

## Dependencies

- [D3.js v7](https://d3js.org/d3.v7.min.js) - For rendering SVG elements and scales

## License

This project is released under the MIT License.

## Authors

[![velitchko's github](https://github.com/velitchko.png?size=40)](https://github.com/velitchko)
[![danylaksono's github](https://github.com/danylaksono.png?size=40)](https://github.com/danylaksono)

Feel free to reach out or follow for updates!
