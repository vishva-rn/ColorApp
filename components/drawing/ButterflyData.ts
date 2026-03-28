
// Properly structured SVG data for a coloring book butterfly
// Each path is a closed region and can be colored independently.
export const BUTTERFLY_VIEWBOX = {"width": 200, "height": 200};

export const BUTTERFLY_PATHS = [
  // Left Top Wing
  {
    d: "M 100 80 Q 40 10 20 80 Q 20 120 100 110 Z",
    transform: ""
  },
  // Right Top Wing
  {
    d: "M 100 80 Q 160 10 180 80 Q 180 120 100 110 Z",
    transform: ""
  },
  // Left Bottom Wing
  {
    d: "M 100 110 Q 40 190 30 140 Q 30 110 100 110 Z",
    transform: ""
  },
  // Right Bottom Wing
  {
    d: "M 100 110 Q 160 190 170 140 Q 170 110 100 110 Z",
    transform: ""
  },
  // Body (Torso)
  {
    d: "M 95 80 Q 95 150 100 150 Q 105 150 105 80 Z",
    transform: ""
  },
  // Head
  {
    d: "M 100 80 C 110 80 110 65 100 65 C 90 65 90 80 100 80 Z",
    transform: ""
  }
];
