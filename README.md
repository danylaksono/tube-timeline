## tube-timeline

London tube style configurable timeline renderer powered by D3 v7. Ships as a tiny ES module you can use directly in the browser or bundle in your app.

### Install

Use via script module directly (no build step):

```html
<script type="module">
  import { TubeTimeline } from './src/tube-timeline.js';
  // ... see Usage below
  new TubeTimeline({ target: document.querySelector('svg'), data }).render();
  // d3 v7 must be present globally or passed in via cfg.d3
</script>
```

If publishing to npm, consumers can `npm i tube-timeline` and:

```js
import { TubeTimeline } from 'tube-timeline';
```

### Data shape

```ts
type MilestoneType = 'start'|'end'|'submission'|'notification'|'review'|'abstract'|'invitation'|'cameraReady';
type Milestone = { date: string; name: string; type: MilestoneType; url?: string; label?: string };
type Track = { track: string; label?: string; color: string; dates: Milestone[] };
```

Dates accept `DD/MM/YYYY` or `MM/YYYY`.

### Usage

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

### API

- `new TubeTimeline(config)`
  - **target**: SVG element or selector
  - **data**: array of tracks (see Data shape)
  - **d3**: optional d3 instance; if omitted, uses global `d3`
  - **options.header**: `{ title, subtitle, logoHref }`
  - **options.showToday**: show the Today marker (default true)
  - **options.orientation**: `'auto' | 'horizontal' | 'vertical'`
  - **options.onMilestoneClick**: handler `(milestone, track)`; default opens `milestone.url` if present

- `render()` Re-renders responsively; reattaches resize listener
- `destroy()` Clears SVG and removes listeners

### Demo

Open `index.html` in a static server. The page imports the module and renders the EuroVis example.

# EuroVis 2026 Conference Interactive Timeline

This is an **interactive visual timeline** for the EuroVis 2026 conference deadlines and tracks. It displays multiple conference tracks with their key milestones, deadlines, and notifications in a clear, color-coded timeline view.

<img width="2560" height="1305" alt="image" src="https://github.com/user-attachments/assets/16cd2939-1238-4f6d-959e-92fa3254b15b" />



---

## Features

- Displays multiple tracks with distinct colors and labels (e.g., Full Papers, Short Papers, Workshops, etc.).
- Shows important dates and deadlines as milestone icons with tooltips.
- Responsive layout: switches between horizontal and vertical timeline based on window width.
- Hover tooltips provide detailed information about each milestone.
- Clickable milestones can link to URLs (currently empty placeholders).
- "Today" indicator line (configurable for testing).
- Easily extendable to other conferences or events by modifying the `data` array.

---

## Usage

### How to run

1. Save the provided code as `index.html`.
2. Open it in any modern web browser (Chrome, Firefox, Edge, Safari).
3. Resize the window to see the layout adapt between horizontal and vertical modes.

### How to customize

- The timeline data is stored in the `data` array inside the `<script>` tag.
- Each track object has:
  - `track`: Full track name
  - `label`: Short label shown on the timeline
  - `color`: Color for the track line and icons (hex code)
  - `dates`: Array of milestone objects with:
    - `date`: Deadline date (format MM/YYYY or DD/MM/YY)
    - `name`: Milestone description
    - `type`: Type of milestone (controls icon and tooltip)
    - `url`: Optional URL to open on click (currently empty)
- To add or modify tracks or deadlines, update this `data` array accordingly.

### Supported milestone types and icons

| Type          | Icon | Description                       |
|---------------|------|---------------------------------|
| start         | 📄   | Submission or beginning          |
| abstract      | 📝   | Abstract deadline                |
| submission    | 📬   | Submission deadline              |
| review        | 🔍   | Review period                   |
| notification  | 📢   | Notification of decisions        |
| cameraReady   | 🖨️   | Final camera-ready submission    |
| end           | ✅   | Final deadline or milestone      |
| invitation    | ✉️   | Invitation to submit             |

---

## Dependencies

- [D3.js v7](https://d3js.org/d3.v7.min.js) for rendering SVG elements and scales.

---

## Notes

- The timeline automatically scales to fit the window size.
- Milestones display tooltips on hover.
- The "Today" line can be set to a specific date for testing by uncommenting and modifying the `today` variable in the script.
- The project is designed to be generic and reusable for any multi-track event timeline — just update the `data` array.

---

## License

This project is released under the MIT License.

---

Feel free to contribute improvements or extend this timeline for your own conferences or events!

---

*Created for EuroVis 2026 visualization and planning.*

---

## Author

[![velitchko's github](https://github.com/velitchko.png?size=40)](https://github.com/velitchko)  
[@velitchko](https://github.com/velitchko)

Feel free to reach out or follow for updates!

