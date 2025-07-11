import { Injectable } from '@angular/core';

// Google Maps API Key - replace with your actual key
const GOOGLE_MAPS_API_KEY = 'AIzaSyAJC88RFBskEuSmIy6ibHbr0EeEK2PqLko';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private static isLoaded = false;
  private static loadingPromise: Promise<any> | null = null;

  async load(): Promise<any> {
    if (this.isLoaded && window.google) {
      return Promise.resolve(window.google);
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise<any>((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve(window.google);
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google && window.google.maps) {
          this.isLoaded = true;
          console.log('Google Maps API loaded successfully');
          resolve(window.google);
        } else {
          reject(new Error('Google Maps API failed to load properly'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }
}
