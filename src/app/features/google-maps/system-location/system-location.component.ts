import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SystemLocation } from '../../../domain/system-location';
import { SystemLocationService } from '../system-location.service';
import { GoogleMapsLoaderService } from '../../../core/services/google-maps-loader.service';
import { System } from '../../../domain/system';
import { firstValueFrom } from 'rxjs';
import Map = google.maps.Map;

@Component({
  selector: 'app-system-location',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './system-location.component.html',
  styleUrls: ['./system-location.component.scss'],
})
export class SystemLocationComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapElement!: ElementRef<HTMLDivElement>;
  @ViewChild('search') search!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  readonly INITIAL_ZOOM = 11;

  @Input() mySystemId: string = '';
  @Input() hideSearchBar: boolean = false;
  @Input() initialLocation?: SystemLocation;
  location: SystemLocation = {};
  setLocationByClick: boolean = true;

  @Output() onChange = new EventEmitter<SystemLocation>();
  @Output() onSystemClicked = new EventEmitter<string>();

  private gmap?: typeof google;
  private map?: Map;
  private placeService?: google.maps.places.PlacesService;
  private searchBox?: google.maps.places.SearchBox;
  private systemMarker = new google.maps.Marker();
  private systemsMarkers: google.maps.Marker[] = [];
  private infoWindow = new google.maps.InfoWindow({
    disableAutoPan: true,
  });
  private iconOn?: google.maps.Icon;
  private iconOff?: google.maps.Icon;

  constructor(private systemLocationService: SystemLocationService) {}

  ngOnInit() {}

  async ngAfterViewInit() {
    await GoogleMapsLoaderService.load();
    this.gmap = google;
    const svgOn =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44"><path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 30 14 30s14-22.268 14-30C28 6.268 21.732 0 14 0zm0 21c-3.866 0-7-3.134-7-7s3.134-7 7-7 7 3.134 7 7-3.134 7-7 7z" fill="#FFC000"/></svg>';
    const svgOff =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44"><path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 30 14 30s14-22.268 14-30C28 6.268 21.732 0 14 0zm0 21c-3.866 0-7-3.134-7-7s3.134-7 7-7 7 3.134 7 7-3.134 7-7 7z" fill="#808080"/></svg>';

    this.iconOn = {
      url: 'data:image/svg+xml;base64,' + btoa(svgOn),
      scaledSize: new this.gmap.maps.Size(28, 44),
      anchor: new this.gmap.maps.Point(14, 44),
    };
    this.iconOff = {
      url: 'data:image/svg+xml;base64,' + btoa(svgOff),
      scaledSize: new this.gmap.maps.Size(28, 44),
      anchor: new this.gmap.maps.Point(14, 44),
    };
    this.mapInit();
    await this.initSystemsMarkers();
    this.resetLocation();
  }

  mapInit() {
    if (this.gmap && this.mapElement) {
      this.map = new this.gmap.maps.Map(this.mapElement.nativeElement, {
        center:
          this.initialLocation?.coords || SystemLocationService.DefaultLocation,
        zoom: this.initialLocation?.coords ? this.INITIAL_ZOOM : 10,
        clickableIcons: false,
        streetViewControl: false,
        controlSize: 32,
      });

      this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(
        this.search.nativeElement
      );
      this.placeService = new google.maps.places.PlacesService(this.map);
      this.searchBox = new this.gmap.maps.places.SearchBox(
        this.searchInput.nativeElement
      );

      this.map?.addListener('bounds_changed', () => {
        this.searchBox?.setBounds(
          this.map?.getBounds() as google.maps.LatLngBounds
        );
      });

      this.searchBox.addListener('places_changed', () => {
        const place = this.searchBox?.getPlaces()?.[0];
        if (place && place.geometry) {
          this.systemMarker.setPosition(place.geometry.location);
        }
      });

      this.map.addListener('click', (ev: google.maps.MapMouseEvent) => {
        if (this.setLocationByClick && !!this.mySystemId && ev.latLng) {
          this.systemMarker.setPosition(ev.latLng);
        }
      });

      this.systemMarker = new google.maps.Marker({
        map: this.map,
        draggable: true,
      });
      this.systemMarker.addListener('dragstart', () => {
        this.systemMarker.set('isDrag', true);
      });
      this.systemMarker.addListener('dragend', () => {
        this.systemMarker.set('isDrag', false);
        this.onMarkerPositionChange();
      });
      this.systemMarker.addListener('position_changed', () => {
        if (!this.systemMarker.get('isDrag')) {
          this.onMarkerPositionChange();
        }
      });

      new google.maps.Circle({
        map: this.map,
        radius: SystemLocationService.DEFAULT_RADIUS,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillOpacity: 0.1,
      }).bindTo('center', this.systemMarker, 'position');
    }
  }

  resetLocation() {
    this.location = this.initialLocation
      ? JSON.parse(JSON.stringify(this.initialLocation))
      : {};

    if (this.location.coords) {
      this.systemMarker.setPosition(this.location.coords);
    } else if (this.location.address) {
      this.searchInput.nativeElement.value = this.location.address;
    } else {
      this.systemMarker.setPosition(null);
      this.searchInput.nativeElement.value = '';
    }

    this.systemsMarkers.forEach((m) => this.setMarkerIcon(m));
  }

  async onMarkerPositionChange() {
    const markerPosition = this.systemMarker.getPosition();
    this.setLocationByClick = !markerPosition;

    this.location.coords = markerPosition?.toJSON() || undefined;
    this.onChange.emit(this.location);

    if (markerPosition) {
      if (this.map) {
        this.map.panTo(markerPosition);
        if (this.map.getZoom()! < this.INITIAL_ZOOM) {
          this.map.setZoom(this.INITIAL_ZOOM);
        }
      }

      this.placeService?.textSearch(
        { query: markerPosition.toUrlValue() },
        (resp) => {
          if (resp) {
            const address = resp[0]?.formatted_address || '';
            if (this.searchInput) {
              this.searchInput.nativeElement.value =
                address || markerPosition.toString();
              this.location.address = address;
            }
          }
          this.onChange.emit(this.location);
        }
      );

      if (!this.initialLocation?.relatedSystems) {
        this.scanSystemsInRange();
      }
    }
  }

  async initSystemsMarkers() {
    const systems = await firstValueFrom(
      this.systemLocationService.allSystems()
    );
    this.systemsMarkers = systems
      .filter((s: System) => s.isActive && s.id !== this.mySystemId)
      .map((s: System) => {
        const marker = new google.maps.Marker({
          map: this.map,
          position: s.location?.coords,
          clickable: true,
        });

        marker.set('systemId', s.id);

        marker.addListener('click', () => {
          this.onSystemClicked.emit(marker.get('systemId'));
          if (this.location.coords) {
            this.getMarkersInPoint(marker).forEach((m) => this.toggleMarker(m));
          }
        });

        marker.addListener('mouseover', () => {
          const samePoint = this.getMarkersInPoint(marker);
          let text = `מספר מערכות בנקודה זו: <b>${samePoint.length}</b>`;
          if (samePoint.some((m) => m.get('systemId') === this.mySystemId)) {
            text += '<p>(כולל המערכת הנוכחית)</p>';
          }
          this.infoWindow.setContent(text);
          this.infoWindow.open(this.map, marker);
        });

        marker.addListener('mouseout', () => {
          this.infoWindow.close();
        });

        return marker;
      });
  }

  setMarkerIcon(marker: google.maps.Marker) {
    const systemId = marker.get('systemId');
    const selected = this.location.relatedSystems?.includes(systemId);
    marker.setZIndex(selected ? 10 : 9);
    marker.setIcon(selected ? this.iconOn : this.iconOff);
  }

  getMarkersInPoint(marker: google.maps.Marker) {
    const markerPosition = marker.getPosition();
    return this.systemsMarkers.filter((m) =>
      m.getPosition()?.equals(markerPosition!)
    );
  }

  toggleMarker(marker: google.maps.Marker) {
    const systemId = marker.get('systemId') as string;
    if (systemId === this.mySystemId) {
      return;
    }
    if (!this.location.relatedSystems) {
      this.location.relatedSystems = [];
    }
    const idx = this.location.relatedSystems.indexOf(systemId);
    if (idx >= 0) {
      this.location.relatedSystems.splice(idx, 1);
    } else {
      this.location.relatedSystems.push(systemId);
    }
    this.setMarkerIcon(marker);
    this.onChange.emit(this.location);
  }

  scanSystemsInRange() {
    if (this.location.coords) {
      this.systemLocationService
        .systemsInDefaultRange(this.location.coords)
        .subscribe((systems: System[]) => {
          this.location.relatedSystems = systems
            .map((s: System) => s.id)
            .filter((id: string) => id !== this.mySystemId);
          this.systemsMarkers.forEach((m) => this.setMarkerIcon(m));
          this.onChange.emit(this.location);
        });
    }
  }

  public removeRelatedSystem(systemId: string) {
    const marker = this.systemsMarkers.find(
      (m) => m.get('systemId') === systemId
    );
    if (marker) {
      this.toggleMarker(marker);
    }
  }
}
