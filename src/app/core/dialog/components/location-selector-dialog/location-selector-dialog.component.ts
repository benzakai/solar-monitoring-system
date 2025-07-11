import { Component, Inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';
import { SystemLocation } from '../../../../domain/system-location';
import { Coords } from '../../../../domain/coords';

export interface LocationSelectorDialogData {
  initialLocation?: SystemLocation;
}

@Component({
  selector: 'app-location-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './location-selector-dialog.component.html',
  styleUrls: ['./location-selector-dialog.component.scss']
})
export class LocationSelectorDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  readonly INITIAL_ZOOM = 11;
  readonly DEFAULT_LOCATION: Coords = { lat: 32.986327, lng: 35.750419 }; // Central Golan Heights

  location: SystemLocation = {};
  private map?: any;
  private marker?: any;
  private searchBox?: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LocationSelectorDialogData,
    private dialogRef: MatDialogRef<LocationSelectorDialogComponent>
  ) {
    this.location = data.initialLocation ? { ...data.initialLocation } : {};
  }

  ngOnInit() {
    // Maps will be loaded in ngAfterViewInit
  }

  async ngAfterViewInit() {
    try {
      const google = await GoogleMapsLoaderService.load();
      this.initMap(google);
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
    }
  }

  private initMap(google: any) {
    if (!this.mapElement || !google?.maps) return;

    // Create map
    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: this.location.coords || this.DEFAULT_LOCATION,
      zoom: this.location.coords ? this.INITIAL_ZOOM : 10,
      clickableIcons: false,
      streetViewControl: false,
      controlSize: 32,
    });

    // Create marker
    this.marker = new google.maps.Marker({
      map: this.map,
      draggable: true,
      position: this.location.coords,
    });

    // Setup search box
    if (this.searchInput) {
      this.searchBox = new google.maps.places.SearchBox(this.searchInput.nativeElement);
      
      // Bias the SearchBox results towards current map's viewport
      this.map.addListener('bounds_changed', () => {
        this.searchBox?.setBounds(this.map?.getBounds());
      });

      // Listen for place selection
      this.searchBox.addListener('places_changed', () => {
        const places = this.searchBox?.getPlaces();
        if (places && places.length > 0) {
          const place = places[0];
          if (place.geometry && place.geometry.location) {
            this.updateLocation(place.geometry.location, place.formatted_address);
          }
        }
      });
    }

    // Update location on map click
    this.map.addListener('click', (event: any) => {
      if (event.latLng) {
        this.updateLocation(event.latLng);
      }
    });

    // Update location on marker drag
    this.marker.addListener('dragend', () => {
      const position = this.marker?.getPosition();
      if (position) {
        this.updateLocation(position);
      }
    });

    // Set initial address if we have coordinates
    if (this.location.coords && !this.location.address) {
      this.reverseGeocode(this.location.coords);
    }
  }

  private updateLocation(position: any, address?: string) {
    const coords = position.toJSON();
    this.location.coords = coords;
    
    // Update marker position
    this.marker?.setPosition(position);
    
    // Center map on new position
    this.map?.panTo(position);
    
    if (address) {
      this.location.address = address;
      if (this.searchInput) {
        this.searchInput.nativeElement.value = address;
      }
    } else {
      // Get address from coordinates
      this.reverseGeocode(coords);
    }
  }

  private reverseGeocode(coords: Coords) {
    if (!this.map) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address;
        this.location.address = address;
        if (this.searchInput) {
          this.searchInput.nativeElement.value = address;
        }
      }
    });
  }

  onSearchInputChange() {
    if (this.searchInput) {
      const value = this.searchInput.nativeElement.value;
      if (!value) {
        this.location.address = '';
      }
    }
  }

  save() {
    this.dialogRef.close(this.location);
  }

  cancel() {
    this.dialogRef.close();
  }

  hasChanges(): boolean {
    const initial = this.data.initialLocation;
    if (!initial && (this.location.coords || this.location.address)) {
      return true;
    }
    if (initial) {
      return JSON.stringify(initial) !== JSON.stringify(this.location);
    }
    return false;
  }
} 