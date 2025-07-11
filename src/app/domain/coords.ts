export interface Coords {
  lat: number;
  lng: number;
}

export interface GoogleMapsPosition {
  coords: Coords;
  address: string;
} 