import { Component, DestroyRef, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, AbstractControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap, filter, take } from 'rxjs/operators';

// Angular Material imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

// Local imports
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { SystemsService } from '../../endpoint/systems.service';
import { System } from '../../domain/system';
import { SystemType } from '../systems/system-type';
import { RoutingService } from '../../core/routing/routing.service';
import { DialogService } from '../../core/dialog/services/dialog.service';
import { LocationSelectorDialogComponent, LocationSelectorDialogData } from '../../core/dialog/components/location-selector-dialog/location-selector-dialog.component';
import { SystemLocation } from '../../domain/system-location';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatListModule,
    MatTooltipModule,
    MatCardModule,
    TranslatePipe,
  ],
  providers: [DialogService, GoogleMapsLoaderService],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private systemsService = inject(SystemsService);
  private routingService = inject(RoutingService);
  private mapsLoader = inject(GoogleMapsLoaderService);
  
  @ViewChild('map') mapElement!: ElementRef;
  private map?: google.maps.Map;
  private marker?: google.maps.Marker;

  // Form and data
  form!: FormGroup;
  system$!: Observable<System | null>;
  loading$ = new BehaviorSubject<boolean>(false);
  saving$ = new BehaviorSubject<boolean>(false);
  selectedLocation?: SystemLocation;

  // Constants
  readonly today = new Date();
  readonly months: Date[] = this.getMonths();
  readonly systemTypes = Object.values(SystemType);
  readonly systemTypeDict = this.getSystemTypeDict();

  washTypes = [
    { type: 'ללא שטיפות', value: 0 },
    { type: 'שטיפות בודדות', value: 1 },
    { type: '3 שטיפות', value: 3 },
    { type: '4 שטיפות', value: 4 },
    { type: '5 שטיפות', value: 5 },
    { type: '6 שטיפות', value: 6 }
  ];

  externalPortals = ['GW', 'NTC', 'SLX', 'GDW', 'FSN'];

  ngOnInit() {
    this.system$ = this.activatedRoute.params.pipe(
      takeUntilDestroyed(this.destroyRef),
      map(params => params['id']),
      switchMap(id => {
        if (id && id !== 'new') {
          return this.systemsService.getById(id);
        } else {
          // Return null for new system
          return [null];
        }
      })
    );

    this.system$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(system => {
      this.buildForm(system);
      // Re-initialize map if system data changes
      if (this.map) {
        this.initMap();
      }
    });
  }

  ngAfterViewInit() {
    this.system$.pipe(take(1)).subscribe(system => {
      this.selectedLocation = system?.location ?? undefined;
      this.initMap();
    });
  }

  private async initMap() {
    try {
      await GoogleMapsLoaderService.load();
      
      const initialCoords = this.selectedLocation?.coords || { lat: 32.8, lng: 35.75 }; // Default to somewhere in Israel
      const mapOptions: google.maps.MapOptions = {
        center: initialCoords,
        zoom: 8,
        mapTypeId: 'roadmap'
      };

      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      if (this.selectedLocation?.coords) {
        this.placeMarker(this.selectedLocation.coords);
      }

      this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          this.placeMarker(coords);
          this.updateLocationFromCoords(coords);
        }
      });
    } catch (error) {
      console.error('Error loading Google Maps', error);
    }
  }

  private placeMarker(location: google.maps.LatLngLiteral) {
    if (this.marker) {
      this.marker.setMap(null);
    }
    this.marker = new google.maps.Marker({
      position: location,
      map: this.map,
    });
    this.map?.panTo(location);
  }

  private async updateLocationFromCoords(coords: google.maps.LatLngLiteral) {
    this.selectedLocation = { coords, address: '' };
    // Use geocoder to get address from coords
    const geocoder = new google.maps.Geocoder();
    await geocoder.geocode({ location: coords }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results?.[0]) {
        const address = results[0].formatted_address;
        this.selectedLocation!.address = address;
        this.form.controls['location'].setValue(address);
        this.form.markAsDirty();
      } else {
        // Fallback to coordinates if geocoding fails
        const latLngString = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        this.form.controls['location'].setValue(latLngString);
        this.selectedLocation!.address = latLngString;
        this.form.markAsDirty();
      }
    });
  }

  private buildForm(system: System | null) {
    // Store the full location data if available
    if (system?.location) {
      this.selectedLocation = system.location;
    }

    const annualPrediction = system?.annualPredictionPerMonth?.reduce((sum, current) => sum + current, 0);

    this.form = this.formBuilder.group({
      // Existing fields from System model
      name: [system?.name, Validators.required],
      type: [system?.type, Validators.required],
      KWP: [system?.KWP, [Validators.required, Validators.min(1)]],
      AC: [system?.AC, Validators.min(0)],
      apiId: [system?.apiId || []],
      portalUrl: [system?.portalUrl],
      startTime: [system?.startTime],
      annualPredictionPerMonth: this.formBuilder.array(
        this.months.map(m => [
          system?.annualPredictionPerMonth?.[m.getMonth()] || 0,
          [Validators.min(0), Validators.required]
        ])
      ),
      excludeFromAverage: [system?.excludeFromAverage],
      taoz: [system?.taoz],
      location: [system?.location?.address || '', Validators.required],
      client: [system?.client],
      comments: [system?.comments],
      contactsIds: [system?.contactsIds || []],
      contract: [system?.contract],
      
      // Additional fields from original component
      power: [system?.power, Validators.min(0)],
      panelType: [system?.panelType],
      numOfPanels: [system?.numOfPanels, Validators.min(1)],
      communication: [system?.communication],
      installer: [system?.installer],
      monitorPriceKw: [system?.monitorPriceKw, Validators.min(0)],
      azimuth: [system?.azimuth, [Validators.min(-90), Validators.max(90)]],
      tilt: [system?.tilt, [Validators.min(0), Validators.max(90)]],
      isTracker: [system?.isTracker || false],
      washControl: [system?.washControl || false],
      autoWash: [system?.autoWash || false],
      washType: [system?.washType],
      washRate: [system?.washRate, Validators.min(0)],
      
      // Additional client and contract fields
      additionalContract: [system?.additionalContract],
      contractStartTime: [system?.contractStartTime],
      annualCheckDate: [system?.annualCheckDate],
      isActive: [system?.isActive !== false], // Default to true for new systems
      
      // Prediction fields
      annualPrediction: [annualPrediction, [Validators.required, Validators.min(0)]],
      isPvsyst: [system?.isPvsyst || false]
    });

    // If no system exists, disable most fields
    if (!system) {
      this.form.disable();
      this.form.controls['name'].enable();
      this.form.controls['type'].enable();
    }
  }

  private getMonths(): Date[] {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(new Date(2024, i, 1));
    }
    return months;
  }

  private getSystemTypeDict(): Record<string, string> {
    return {
      [SystemType.SOLAR_EDGE]: 'Solar Edge',
      [SystemType.SMA]: 'SMA',
      [SystemType.ENNEX]: 'Ennex',
      [SystemType.HUAWEI]: 'Huawei',
      [SystemType.METEO_CONTROL]: 'Meteo Control',
      [SystemType.REFU]: 'Refu',
      [SystemType.TIGO]: 'Tigo',
      [SystemType.SUN_GROW]: 'SunGrow',
      [SystemType.GROWATT]: 'Growatt',
      [SystemType.NETECO]: 'Neteco',
      [SystemType.SOLAX]: 'Solax',
      [SystemType.GOODWE]: 'GoodWe',
      [SystemType.FUSION]: 'Fusion',
      [SystemType.UNDEFINED]: 'לא מוגדר'
    };
  }

  getAnnualPredictionControls(): AbstractControl[] {
    return (this.form.controls['annualPredictionPerMonth'] as FormArray).controls;
  }

  getAnnualPredictionFormArray(): FormArray {
    return this.form.controls['annualPredictionPerMonth'] as FormArray;
  }

  onTypeChange() {
    // Handle portal type change
    const type = this.form.get('type')?.value;
    if (type) {
      // Reset API ID when type changes
      this.form.get('apiId')?.setValue([]);
    }
  }

  async setApiId() {
    const type = this.form.get('type')?.value;
    if (!type) {
      alert('יש לבחור סוג פורטל תחילה');
      return;
    }

    // For now, just show a simple prompt - this can be enhanced with a dialog
    const apiIdInput = prompt('הזן מזהה API:');
    if (apiIdInput) {
      this.form.get('apiId')?.setValue([apiIdInput]);
      this.form.markAsDirty();
    }
  }

  async save() {
    if (!this.form.valid) {
      alert('יש לוודא תקינות כל השדות');
      this.form.markAllAsTouched();
      return;
    }

    this.saving$.next(true);
    try {
      const formValue = this.form.value;
      
      // If we have selected location data, use it instead of just the text
      if (this.selectedLocation) {
        formValue.location = this.selectedLocation;
      } else if (formValue.location) {
        // Convert text location to SystemLocation object
        formValue.location = { address: formValue.location };
      }
      
      const systemId = this.activatedRoute.snapshot.params['id'];
      
      if (systemId && systemId !== 'new') {
        // Update existing system
        await new Promise<void>((resolve, reject) => {
          this.systemsService.updateSystem(systemId, formValue).subscribe({
            next: () => resolve(),
            error: (error) => reject(error)
          });
        });
      } else {
        // Create new system
        const newSystemId = await new Promise<string>((resolve, reject) => {
          this.systemsService.createSystem(formValue).subscribe({
            next: (id) => resolve(id),
            error: (error) => reject(error)
          });
        });
        // Navigate to the new system's edit page
        this.router.navigate(['/system-settings', newSystemId]);
      }
      
      alert('מערכת נשמרה בהצלחה!');
      this.form.markAsPristine();
    } catch (error) {
      alert('שגיאה בשמירת המערכת');
      console.error('Error saving system:', error);
    } finally {
      this.saving$.next(false);
    }
  }

  cancel() {
    if (this.form.dirty) {
      if (confirm('האם אתה בטוח שברצונך לצאת ללא שמירה?')) {
        this.goBack();
      }
    } else {
      this.goBack();
    }
  }

  private goBack() {
    this.router.navigate(['/systems']);
  }

  goToSystemDetails() {
    const systemId = this.activatedRoute.snapshot.params['id'];
    if (systemId && systemId !== 'new') {
      this.routingService.goToSystemDetails(systemId);
    }
  }

  navigateToSystemApi() {
    const systemId = this.activatedRoute.snapshot.params['id'];
    if (systemId && systemId !== 'new') {
      this.routingService.navigateToSystemApi(systemId);
    }
  }

  // Helper methods for form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'שדה חובה';
      if (field.errors['min']) return `ערך מינימלי: ${field.errors['min'].min}`;
      if (field.errors['max']) return `ערך מקסימלי: ${field.errors['max'].max}`;
    }
    return '';
  }

  productionSum(): number {
    const formArray = this.form.get('annualPredictionPerMonth') as FormArray;
    if (!formArray) return 0;
    
    const annualPredictions = formArray.value || [];
    return annualPredictions.reduce((sum: number, value: number) => sum + (value || 0), 0);
  }

  getSystemAge(): string {
    if (!this.form.value.startTime) return 'N/A';
    const startDate = new Date(this.form.value.startTime);
    const now = new Date();
    const ageInMs = now.getTime() - startDate.getTime();
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    return `${ageInYears.toFixed(1)} שנים`;
  }
} 