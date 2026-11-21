import type { NumberArt } from './number-art';

// Keep the tapped card available during navigation without serializing its paths in the URL.
let tappedArtwork: NumberArt | undefined;

export function setDrawingPreview(art: NumberArt) {
  tappedArtwork = art;
}

export function getDrawingPreview(id: string | undefined) {
  return tappedArtwork?.id === id ? tappedArtwork : undefined;
}
