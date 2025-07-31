import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SystemsService } from '../../endpoint/systems.service';
import { System } from '../../domain/system';
import { Coords } from '../../domain/coords';

@Injectable({
  providedIn: 'root',
})
export class SystemLocationService {
  static DefaultLocation: Coords = { lat: 32.986327, lng: 35.750419 }; // Central Golan Heights

  static readonly DEFAULT_RADIUS = 10000;

  constructor(private systemsService: SystemsService) {}

  allSystems(): Observable<System[]> {
    return this.systemsService.getSystems();
  }

  systemsInDefaultRange(myCoords: Coords): Observable<System[]> {
    if (myCoords) {
      return this.allSystems().pipe(
        map((systems: System[]) =>
          systems.filter((s: System) => {
            const coords = s.location?.coords;
            if (coords) {
              const dist = this.computeDistance(myCoords, coords);
              return dist <= SystemLocationService.DEFAULT_RADIUS;
            }
            return false;
          })
        )
      );
    }
    return from([]);
  }

  computeDistance(coords1: Coords, coords2: Coords): number {
    return google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(coords1),
      new google.maps.LatLng(coords2)
    );
  }

  getCoordsFromAddress(address: string): Promise<Coords | null> {
    const geocoder = new google.maps.Geocoder();
    return new Promise<Coords | null>((resolve) => {
      geocoder.geocode({ address: address }, (results, status) => {
        if (
          status === google.maps.GeocoderStatus.OK &&
          results &&
          results[0].geometry
        ) {
          resolve(results[0].geometry.location.toJSON());
        } else {
          resolve(null);
        }
      });
    });
  }
} 