export const map = vi.fn(() => ({
  setView: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  on: vi.fn(),
  fitBounds: vi.fn(),
}));

export const tileLayer = vi.fn(() => ({ addTo: vi.fn().mockReturnThis() }));
export const marker = vi.fn(() => {
  const obj = {
    addTo: vi.fn(() => obj),
    bindPopup: vi.fn(() => obj),
    bindTooltip: vi.fn(() => obj),
    remove: vi.fn(),
    openTooltip: vi.fn(() => obj),
  };
  return obj;
});
export const featureGroup = vi.fn(() => ({
  getBounds: vi.fn(() => ({ pad: vi.fn().mockReturnThis() })),
}));
export const polyline = vi.fn(() => ({
  addTo: vi.fn(() => ({})),
  remove: vi.fn(),
}));
export const geoJSON = vi.fn(() => ({
  addTo: vi.fn(() => ({
    getBounds: vi.fn(() => ({
      isValid: vi.fn(() => true),
      pad: vi.fn().mockReturnThis(),
    })),
  })),
  getBounds: vi.fn(() => ({
    isValid: vi.fn(() => true),
    pad: vi.fn().mockReturnThis(),
  })),
}));
