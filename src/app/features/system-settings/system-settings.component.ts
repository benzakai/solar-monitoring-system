import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  AbstractControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Observable, BehaviorSubject, startWith } from 'rxjs';
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
import { MatRadioModule } from '@angular/material/radio';

// Local imports
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { SystemsService } from '../../endpoint/systems.service';
import { System } from '../../domain/system';
import { SystemType } from '../systems/system-type';
import { RoutingService } from '../../core/routing/routing.service';
import { DialogService } from '../../core/dialog/services/dialog.service';
import {
  LocationSelectorDialogComponent,
  LocationSelectorDialogData,
} from '../../core/dialog/components/location-selector-dialog/location-selector-dialog.component';
import { SystemLocation } from '../../domain/system-location';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { ApiIdDialogComponent } from './components/api-id-dialog/api-id-dialog.component';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { ContactSelectionDialogComponent } from './components/contact-selection-dialog/contact-selection-dialog.component';
import { PersonInfoDialogComponent } from './components/person-info-dialog/person-info-dialog.component';
import { IdName } from '../../domain/id-name';
import { combineLatest } from 'rxjs';
import { SystemCriteria } from '../../domain/system-criteria';
import { UsersFacade } from '../../state/users/users.facade';
import { User } from '../../domain/user';
import { PeopleService } from '../../endpoint/people.service';
import { Person } from '../../domain/person';
import { MonthsInputsComponent } from './components/months-inputs/months-inputs.component';
import {
  MatSlideToggle,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AppEndpointService } from '../../endpoint/app-endpoint.service';
import { AppPrediction } from '../../domain/app';
import { PredictionCalculator } from '../../core/energy/prediction-calculator';
import { EnergyCalc } from '../../core/energy/energy-calculator';

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
    MatRadioModule,
    MonthsInputsComponent,
    MatSlideToggleModule,
  ],
  providers: [DialogService, GoogleMapsLoaderService],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss'],
})
export class SystemSettingsComponent implements OnInit, AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private formBuilder = inject(FormBuilder);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private systemsService = inject(SystemsService);
  private routingService = inject(RoutingService);
  private mapsLoader = inject(GoogleMapsLoaderService);
  private dialog = inject(MatDialog);
  private monitorFacade = inject(MonitorFacade);
  private appService = inject(AppEndpointService);
  private peopleService = inject(PeopleService);
  dialogService = inject(DialogService);
  translatePipe = new TranslatePipe();
  @ViewChild('map') set mapElement(el: ElementRef) {
    if (el && !this.map) {
      this.initMap(el);
    }
  }
  private map?: google.maps.Map;
  private marker?: google.maps.Marker;
  private system: System | null = null;
  private prediction: AppPrediction | undefined;
  public predictionsCalc: any = { isDefaultPrediction: false };

  public lastDefault = '';

  // Form and data
  form!: FormGroup;
  system$: Observable<System | null> = this.activatedRoute.params.pipe(
    takeUntilDestroyed(this.destroyRef),
    map((params) => params['id']),
    switchMap((id) => {
      if (id && id !== 'new') {
        return this.systemsService.getById(id);
      } else {
        return [null];
      }
    })
  );

  loading$ = new BehaviorSubject<boolean>(false);
  saving$ = new BehaviorSubject<boolean>(false);
  selectedLocation?: SystemLocation;
  selectedContactId: string | null = null;

  systemContacts$: Observable<Person[]> | null = null;

  // Constants
  readonly today = new Date();
  readonly months: Date[] = this.getMonths();
  readonly systemTypes = Object.values(SystemType);
  readonly systemTypeDict = this.getSystemTypeDict();
  readonly criteria = Object.values(SystemCriteria);
  readonly criteriaDict = this.getCriteriaDict();

  washTypes = [
    { type: 'wash_type_none', value: 0 },
    { type: 'wash_type_single', value: 1 },
    { type: 'wash_type_3', value: 3 },
    { type: 'wash_type_4', value: 4 },
    { type: 'wash_type_5', value: 5 },
    { type: 'wash_type_6', value: 6 },
  ];

  externalPortals = ['GW', 'NTC', 'SLX', 'GDW', 'FSN'];

  ngOnInit() {
    combineLatest([
      this.system$,
      this.appService.get('prediction').pipe(filter(Boolean)),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([system, prediction]) => {
        this.system = system;
        this.prediction = prediction;
        this.buildForm(system);
      });
  }

  ngAfterViewInit() {
    // Map is now initialized in the ViewChild setter
  }

  private async initMap(mapElement: ElementRef) {
    try {
      await GoogleMapsLoaderService.load();

      const mapOptions: google.maps.MapOptions = {
        center: { lat: 32.8, lng: 35.75 }, // Default to somewhere in Israel
        zoom: 8,
        mapTypeId: 'roadmap',
      };

      this.map = new google.maps.Map(mapElement.nativeElement, mapOptions);

      this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          this.placeMarker(coords);
          this.updateLocationFromCoords(coords);
        }
      });

      if (this.system?.location?.coords) {
        const coords = this.system.location.coords;
        this.map?.setCenter(coords);
        this.map?.setZoom(15);
        this.placeMarker(coords);
      }
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
    await geocoder.geocode(
      { location: coords },
      (
        results: google.maps.GeocoderResult[] | null,
        status: google.maps.GeocoderStatus
      ) => {
        if (status === 'OK' && results?.[0]) {
          const address = results[0].formatted_address;
          this.selectedLocation!.address = address;
        } else {
          const latLngString = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(
            6
          )}`;
          this.selectedLocation!.address = latLngString;
        }
        this.form.markAsDirty();
      }
    );
  }

  personInfo(personId: string) {
    const dialogRef = this.dialog.open(PersonInfoDialogComponent, {
      width: '500px',
      data: { personId: personId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Person data was updated, refresh the contacts list
        this.system$
          .pipe(take(1))
          .subscribe((system) => (this.system = system));
      }
    });
  }

  private buildForm(system: System | null) {
    this.selectedLocation = system?.location ?? undefined;

    this.form = this.formBuilder.group({
      name: [system?.name, Validators.required],
      type: [system?.type, Validators.required],
      isActive: [system?.isActive || false],
      portalUrl: [system?.portalUrl],
      client: [system?.client, Validators.required],
      contactsIds: [system?.contactsIds],
      startTime: [system?.startTime],
      contractStartTime: [system?.contractStartTime],
      annualCheckDate: [system?.annualCheckDate],
      taoz: [system?.taoz],
      regulation: [system?.regulation],
      excludeFromAverage: [system?.excludeFromAverage],
      communication: [system?.communication],
      installer: [system?.installer],
      monitorPriceKw: [system?.monitorPriceKw],
      source: [system?.source],
      AC: [system?.AC],
      KWP: [system?.KWP],
      power: [system?.power],
      criteria: [system?.criteria],
      panelType: [system?.panelType],
      numOfPanels: [system?.numOfPanels],
      annualPrediction: [null],
      annualPredictionPerMonth: this.formBuilder.array(
        (system?.annualPredictionPerMonth &&
        system.annualPredictionPerMonth.length === 12
          ? system.annualPredictionPerMonth
          : Array(12).fill(null)
        ).map((v) => this.formBuilder.control(v))
      ),
      isPvsyst: [system?.isPvsyst || false],
      azimuth: [system?.azimuth],
      tilt: [system?.tilt],
      isTracker: [system?.isTracker],
      washControl: [system?.washControl],
      autoWash: [system?.autoWash],
      washType: [system?.washType],
      washRate: [system?.washRate],
      comments: [system?.comments],
    });

    if (!system?.annualPredictionPerMonth.length) {
      this.setEnergyPrediction();
    }

    this.systemContacts$ = this.form.valueChanges.pipe(
      startWith(this.form.value),
      switchMap((system) => {
        const contactIds = system?.contactsIds || [];
        if (system?.client) {
          contactIds.push(system.client.id);
        }
        return this.peopleService.getPeopleByIds(contactIds);
      })
    );

    this.form
      .get('taoz')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((taoz) => {
        const regulationControl = this.form.get('regulation');
        if (taoz !== null) {
          regulationControl?.disable();
          regulationControl?.setValue(null);
          regulationControl?.clearValidators();
        } else {
          regulationControl?.enable();
          regulationControl?.setValidators(Validators.required);
        }
        regulationControl?.updateValueAndValidity();
      });

    this.form
      .get('annualPredictionPerMonth')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const energy = EnergyCalc.Sum(value);
        this.form.get('annualPrediction')?.setValue(energy, {
          emitEvent: false,
        });
      });

    this.form
      .get('annualPrediction')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.setEnergyPrediction(value || 0);
      });

    this.form
      .get('annualPredictionPerMonth')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const energy = EnergyCalc.Sum(value);
        this.form.get('annualPrediction')?.setValue(energy, {
          emitEvent: false,
        });
      });

    this.form
      .get('isPvsyst')
      ?.valueChanges.pipe(
        startWith(this.form.get('isPvsyst')?.value),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((is) => {
        try {
          (
            this.form.get('annualPredictionPerMonth') as FormArray
          ).controls.forEach((field) => {
            if (is) {
              field.enable();
            } else {
              field.disable();
            }
          });

          const annualPrediction = this.form.get('annualPrediction');
          if (is) {
            annualPrediction?.disable();
          } else {
            annualPrediction?.enable();
          }
        } catch (e) {}
      });

    // Manually trigger the value change to set the initial state
    this.form.get('taoz')?.updateValueAndValidity();
  }

  setEnergyPrediction(energy: number = -1) {
    const annual = this.form.get('annualPrediction');
    const taoz = this.form.get('taoz');
    const autoWash = this.form.get('autoWash');
    const perMonth = this.form.get('annualPredictionPerMonth');

    if (this.prediction && annual && taoz && autoWash && autoWash && perMonth) {
      let initialEnergy = energy;

      if (energy < 0) {
        const defaultValue = PredictionCalculator.calcDefaultValue(
          this.form.value,
          this.prediction
        );

        initialEnergy = defaultValue;

        annual.setValue(defaultValue, {
          emitEvent: false,
        });
      }

      const years = this.getSystemAgeNum();
      const production = PredictionCalculator.calcProductionByAge(
        initialEnergy,
        years,
        this.prediction
      );
      const productionByAge = Math.round(production);

      const annualDis = PredictionCalculator.calcMonthsDistribution(
        productionByAge,
        !!taoz.value,
        this.prediction,
        this.form.value,
        autoWash.value
      );

      this.lastDefault = annualDis.join(',');

      annualDis.forEach((v, i) => {
        const field = (perMonth as FormArray).at(i);
        field.setValue(v, {
          emitEvent: false,
        });
      });
    }
  }

  private getMonths(): Date[] {
    const months: Date[] = [];
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
      [SystemType.UNDEFINED]: 'לא מוגדר',
    };
  }

  checkPvsyst(event: boolean) {
    //TODO implement
  }

  checkTracker(event: boolean) {
    //TODO implement
  }

  private getCriteriaDict(): Record<string, string> {
    return {
      [SystemCriteria.COWSHED]: 'cowshed',
      [SystemCriteria.FACTORY]: 'factory',
      [SystemCriteria.GAS_STATION]: 'gas_station',
      [SystemCriteria.HENCOOP]: 'hencoop',
      [SystemCriteria.HOUSE]: 'house',
      [SystemCriteria.RESERVOIR]: 'reservoir',
      [SystemCriteria.SCHOOL]: 'school',
      [SystemCriteria.OTHER]: 'other',
    };
  }

  getAnnualPredictionFormArray(): FormArray {
    return this.form.get('annualPredictionPerMonth') as FormArray;
  }

  onTypeChange() {
    this.setApiId();
  }

  setApiId() {
    this.system$.pipe(take(1)).subscribe((system) => {
      const type = this.form.get('type')?.value;
      if (!type) {
        return;
      }

      const dialogRef = this.dialog.open(ApiIdDialogComponent, {
        data: {
          type: type,
          apiId: system?.type === type ? system?.apiId : [],
        },
        width: '600px',
      });

      dialogRef.afterClosed().subscribe((apiId) => {
        if (apiId) {
          this.form.get('apiId')?.setValue(apiId);
          this.form.markAsDirty();
        }
      });
    });
  }

  iso(dt: Date | number): string | null {
    return dt ? new Date(dt).toISOString() : null;
  }

  async save() {
    const dial = this.dialogService;
    const loader = this.dialogService.loader();
    try {
      const rawFormVelue = this.form.value;

      const formValue = {
        ...rawFormVelue,
        startTime: this.iso(rawFormVelue.startTime),
        contractStartTime: this.iso(rawFormVelue.contractStartTime),
        annualCheckDate: this.iso(rawFormVelue.annualCheckDate),
        newSys: true,
      };

      const annualPredictionPerMonthSerial =
        formValue.annualPredictionPerMonth.join(',');
      if (this.lastDefault === annualPredictionPerMonthSerial) {
        delete formValue.annualPredictionPerMonth;
      }

      delete formValue.annualPrediction;

      if (this.selectedLocation) {
        formValue.location = this.selectedLocation;
      } else if (formValue.location) {
        formValue.location = { address: formValue.location };
      }

      const systemId = this.activatedRoute.snapshot.params['id'];

      if (systemId && systemId !== 'new') {
        await new Promise<void>((resolve, reject) => {
          this.systemsService.updateSystem(systemId, formValue).subscribe({
            next: () => resolve(),
            error: (error) => reject(error),
          });
        });
      } else {
        const newSystemId = await new Promise<string>((resolve, reject) => {
          this.systemsService.createSystem(formValue).subscribe({
            next: (id) => resolve(id),
            error: (error) => reject(error),
          });
        });

        this.router.navigate(['/system-settings', newSystemId]);
      }

      dial.confirm({
        message: this.translatePipe.transform('malfunction.dataSaved'),
        displayCancel: false,
      });

      this.form.markAsPristine();
    } catch (error) {
      alert('שגיאה בשמירת המערכת');
      console.error('Error saving system:', error);
    } finally {
      this.saving$.next(false);
      loader.close();
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

  gotoSystem(id: string) {
    this.router.navigate(['/system', id]);
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

  openContactSelection() {
    const dialogRef = this.dialog.open(ContactSelectionDialogComponent, {
      width: '600px',
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result) => !!result),
        take(1)
      )
      .subscribe((selectedClient) => {
        this.system$.pipe(take(1)).subscribe((system) => {
          if (system?.client) {
            // It's a contact
            const currentContacts = this.form.get('contactsIds')?.value || [];
            if (!currentContacts.includes(selectedClient.id)) {
              this.form
                .get('contactsIds')
                ?.setValue([...currentContacts, selectedClient.id]);
              this.form.markAsDirty();
            }
          } else {
            // It's a client
            this.form.get('client')?.setValue(selectedClient);
            this.form.markAsDirty();
          }
        });
      });
  }

  removeContact() {
    if (!this.selectedContactId) return;

    const currentContacts = this.form.get('contactsIds')?.value || [];
    const client = this.form.get('client')?.value;

    if (this.selectedContactId === client?.id) {
      this.form.get('client')?.setValue(null);
    }

    this.form
      .get('contactsIds')
      ?.setValue(
        currentContacts.filter((id: string) => id !== this.selectedContactId)
      );

    this.selectedContactId = null;
    this.form.markAsDirty();
  }

  isClient(contactId: string): boolean {
    const client = this.form.get('client')?.value;
    return client?.id === contactId;
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
    return annualPredictions.reduce(
      (sum: number, value: number) => sum + (value || 0),
      0
    );
  }

  getSystemAgeNum(): number {
    if (!this.form.value.startTime) return 0;
    const startDate = new Date(this.form.value.startTime);
    const now = new Date();
    const ageInMs = now.getTime() - startDate.getTime();
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(ageInYears);
  }

  getSystemAge(): string {
    if (!this.form.value.startTime) return 'N/A';
    return `${this.getSystemAgeNum()} שנים `;
  }
}
