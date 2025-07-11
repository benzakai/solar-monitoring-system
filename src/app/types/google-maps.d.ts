declare global {
  interface Window {
    google: any;
  }
  
  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        addListener(event: string, handler: Function): void;
        panTo(position: any): void;
        setZoom(zoom: number): void;
        getBounds(): any;
      }
      
      class Marker {
        constructor(options: any);
        setPosition(position: any): void;
        getPosition(): any;
        addListener(event: string, handler: Function): void;
        set(key: string, value: any): void;
        get(key: string): any;
      }
      
      class Geocoder {
        geocode(request: any, callback: Function): void;
      }
      
      interface MapMouseEvent {
        latLng: any;
      }
      
      interface LatLng {
        toJSON(): { lat: number; lng: number };
        toString(): string;
        toUrlValue(): string;
      }
      
      namespace places {
        class SearchBox {
          constructor(input: HTMLInputElement);
          addListener(event: string, handler: Function): void;
          setBounds(bounds: any): void;
          getPlaces(): any[];
        }
      }
    }
  }
}

export {}; 