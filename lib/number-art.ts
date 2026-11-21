export type ArtRegion = { id: string; path: string; color: number; x: number; y: number; r?: number };
export type ArtGradient = readonly [light: string, shade: string];

export type NumberArt = {
  id: string;
  title: string;
  category: string;
  palette: string[];
  gradients?: ArtGradient[];
  regions: ArtRegion[];
  details?: string[];
  size?: number;
  outline?: { uri: string };
  lineWidth?: number;
};
