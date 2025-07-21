# EuroVis 2026 Conference Interactive Timeline

This is an **interactive visual timeline** for the EuroVis 2026 conference deadlines and tracks. It displays multiple conference tracks with their key milestones, deadlines, and notifications in a clear, color-coded timeline view.

<img width="1083" height="760" alt="image" src="https://github.com/user-attachments/assets/99fa443a-9715-4690-82a8-1dae6ea2ad05" />


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

