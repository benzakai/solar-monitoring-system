import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, shareReplay, startWith } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';

// Angular Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// Local imports
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { combineLatest } from 'rxjs';
import { DialogService } from '../../core/dialog/services/dialog.service';
import { EnergyCalc } from '../../core/energy/energy-calculator';
import { PredictionCalculator } from '../../core/energy/prediction-calculator';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { HeaderPortalRemoteComponent } from '../../core/header/header-portal-remote.component';
import { RoutingService } from '../../core/routing/routing.service';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { AppPrediction } from '../../domain/app';
import { Person } from '../../domain/person';
import { System } from '../../domain/system';
import { SystemCriteria } from '../../domain/system-criteria';
import { SystemLocation } from '../../domain/system-location';
import { AppEndpointService } from '../../endpoint/app-endpoint.service';
import { PeopleService } from '../../endpoint/people.service';
import { SystemsService } from '../../endpoint/systems.service';
import {
  Storage,
  ref,
  uploadBytesResumable,
  deleteObject,
  getDownloadURL,
} from '@angular/fire/storage';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { SystemType } from '../systems/system-type';
import { SystemContract } from '../systems/system-contract';
import { ApiIdDialogComponent } from './components/api-id-dialog/api-id-dialog.component';
import { ContactSelectionDialogComponent } from './components/contact-selection-dialog/contact-selection-dialog.component';
import { MonthsInputsComponent } from './components/months-inputs/months-inputs.component';
import { PersonInfoDialogComponent } from './components/person-info-dialog/person-info-dialog.component';
import { RegionGroupDialogComponent } from './components/region-group-dialog/region-group-dialog.component';
import { ImagePreviewDialogComponent } from './components/image-preview-dialog/image-preview-dialog.component';

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
    MatProgressBarModule,
    TranslatePipe,
    HeaderPortalRemoteComponent,
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
  private storage = inject(Storage);
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
  private systemId$ = this.activatedRoute.params.pipe(
    takeUntilDestroyed(this.destroyRef),
    map((params) => params['id']),
    shareReplay({ refCount: true, bufferSize: 1 })
  );
  system$: Observable<System | null> = this.systemId$.pipe(
    switchMap((id) => {
      if (id && id !== 'new') {
        return this.systemsService.getById(id);
      } else {
        return of({} as System);
      }
    }),
    shareReplay({ refCount: true, bufferSize: 1 })
  );
  readonly isNewSystemRoute$: Observable<boolean> = this.systemId$.pipe(
    map((id) => id === 'new')
  );

  hasId = this.system$.pipe(map((sys) => Boolean(sys?.id)));
  noId = this.system$.pipe(map((sys) => !Boolean(sys?.id)));

  loading$ = new BehaviorSubject<boolean>(false);
  saving$ = new BehaviorSubject<boolean>(false);
  selectedLocation?: SystemLocation;
  selectedContactId: string | null = null;
  private currentUploadTask?: ReturnType<typeof uploadBytesResumable>;
  private currentUploadProgress = 0;
  get images(): string[] {
    try {
      return (this.form?.get('images')?.value as string[]) || [];
    } catch {
      return [];
    }
  }

  systemContacts$: Observable<Person[]> | null = null;

  // Constants
  readonly today = new Date();
  readonly months: Date[] = this.getMonths();
  readonly systemTypes = Object.values(SystemType);
  readonly systemTypeDict = this.getSystemTypeDict();
  readonly contractOptions = Object.values(SystemContract) as SystemContract[];
  readonly contractDict = this.getContractDict();
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

    const safeClient = system?.client
      ? {
          name: system?.client?.name,
          id: system?.client?.id || system?.client._id,
        }
      : system?.client;

    this.form = this.formBuilder.group({
      apiId: [system?.apiId || []],
      name: [system?.name],
      type: [system?.type],
      isActive: [system?.isActive || false],
      portalUrl: [system?.portalUrl],
      contract: [system?.contract ?? SystemContract.NONE],
      client: [safeClient],
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
      AC: [system?.AC, Validators.min(0)],
      KWP: [system?.KWP],
      power: [system?.power],
      criteria: [system?.criteria],
      panelType: [system?.panelType],
      numOfPanels: [system?.numOfPanels],
      images: [system?.images || []],
      annualPrediction: [null],
      converters: this.formBuilder.array(
        system?.converters?.length
          ? system?.converters.map(({ model, amount }) =>
              this.formBuilder.group({
                model: [model],
                amount: [amount],
              })
            )
          : []
      ),
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

    if (!system?.annualPredictionPerMonth?.length) {
      this.setEnergyPrediction();
    }

    this.systemContacts$ = this.form.valueChanges.pipe(
      startWith(this.form.value),
      switchMap((system) => {
        const contactIds: string[] = [...(system?.contactsIds || [])];
        if (system?.client) {
          const clientId = system.client._id || system.client.id;
          if (clientId) {
            contactIds.push(clientId);
          }
        }
        // Filter out undefined/null values and ensure unique IDs
        const uniqueIds = [...new Set(contactIds.filter(Boolean))];
        return this.peopleService.getPeopleByIds(uniqueIds);
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

  openRegionMap() {
    if (!this.system) return;

    this.dialog
      .open(RegionGroupDialogComponent, {
        data: {
          mySystem: this.system.id,
          location: this.selectedLocation,
        },
        width: '80vh',
        height: '80vh',
      })
      .afterClosed()
      .subscribe((location) => {
        if (location) {
          this.selectedLocation = location;
          this.form.markAsDirty();
        }
      });
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

  private getContractDict(): Record<SystemContract, string> {
    return {
      [SystemContract.NONE]: 'contract_none',
      [SystemContract.YEAR]: 'contract_year',
      [SystemContract.MONTH]: 'contract_month',
      [SystemContract.RETROFIT]: 'contract_retrofit',
      [SystemContract.MANUAL]: 'contract_manual',
      [SystemContract.COMPENSATION]: 'contract_compensation',
      [SystemContract.ADDITIONAL]: 'contract_additional',
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
    const apiId = this.form.get('apiId')?.value;
    const type = this.form.get('type')?.value;
    if (!type) {
      return;
    }

    const dialogRef = this.dialog.open(ApiIdDialogComponent, {
      data: {
        type,
        apiId,
      },
      width: '600px',
    });

    dialogRef.afterClosed().subscribe(async (newApiId) => {
      if (!newApiId) {
        return;
      }

      const isExternal = this.externalPortals.includes(type);

      if (isExternal) {
        // External portals: require existing system (must be saved first)
        const currentId = this.activatedRoute.snapshot.params['id'];
        if (!currentId || currentId === 'new') {
          this.dialogService.confirm({
            message: this.translatePipe.transform(
              'system-settings.external_portal_save_first_message'
            ),
            title: this.translatePipe.transform(
              'system-settings.external_portal_save_first_title'
            ),
            displayCancel: false,
          });
          return;
        }

        if (!newApiId) {
          return;
        }

        // Check duplicate
        this.systemsService
          .checkExistApi(type, newApiId, currentId)
          .pipe(take(1))
          .subscribe(async (existingId) => {
            if (existingId) {
              this.dialogService.confirm({
                message: this.translatePipe.transform(
                  'system-settings.system_exists_message'
                ),
                title: this.translatePipe.transform(
                  'system-settings.system_exists_title'
                ),
                displayCancel: false,
              });
              this.router.navigate(['/system-settings', existingId]);
              return;
            }

            // Update and trigger server import
            this.loading$.next(true);
            this.systemsService
              .updateApiId(type, newApiId, currentId)
              .pipe(take(1))
              .subscribe((ok) => {
                this.loading$.next(false);
                if (ok) {
                  this.dialogService.confirm({
                    message: this.translatePipe.transform(
                      'system-settings.portal_update_success'
                    ),
                    displayCancel: false,
                  });
                  this.router.navigate(['/system-settings', currentId]);
                } else {
                  this.dialogService.confirm({
                    message: this.translatePipe.transform(
                      'system-settings.portal_update_failed_message'
                    ),
                    title: this.translatePipe.transform(
                      'system-settings.portal_update_failed_title'
                    ),
                    displayCancel: false,
                  });
                }
              });
          });
        return;
      }

      // Non-external portals: just set api id on form
      if (newApiId) {
        this.form.get('apiId')?.setValue(newApiId);
        this.form.markAsDirty();
      }
    });
  }

  iso(dt: Date | number): string | null {
    return dt ? new Date(dt).toISOString() : null;
  }

  async save() {
    const dial = this.dialogService;
    this.form.updateValueAndValidity();
    if (this.form.invalid) {
      const errorsIn = Object.keys(this.form?.controls || {})
        .map((k) => [k, this.form.get(k)?.invalid])
        .filter(([s, i]) => i)
        .map(([k]) => k);

      dial.confirm({
        message: 'Invalid Fields: ' + errorsIn.join(', '),
        title: 'Fix fields',
      });

      return;
    }

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
        formValue.annualPredictionPerMonth?.join(',');
      if (
        annualPredictionPerMonthSerial &&
        this.lastDefault === annualPredictionPerMonthSerial
      ) {
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
          this.systemsService
            .updateSystem(systemId, { ...formValue, nu: true })
            .subscribe({
              next: () => resolve(),
              error: (error) => reject(error),
            });
        });
      } else {
        const newSystemId = await new Promise<string>((resolve, reject) => {
          console.log(formValue);
          this.systemsService
            .createSystem({ ...formValue, nc: true })
            .subscribe({
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

  // Images handling
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.addImage(file);
    // reset input so selecting same file again will trigger change
    input.value = '';
  }

  private async addImage(file: File) {
    const systemId = this.activatedRoute.snapshot.params['id'];
    if (!systemId || systemId === 'new') return;

    const path = `systems/${systemId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    const task = uploadBytesResumable(storageRef, file);
    this.currentUploadTask = task;
    task.on('state_changed', (snapshot) => {
      this.currentUploadProgress =
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    });

    const snapshot = await task;
    const url = await getDownloadURL(snapshot.ref);

    const images: string[] = [...(this.form.get('images')?.value || [])];
    images.push(url);
    this.form.get('images')?.setValue(images);
    this.form.markAsDirty();

    // persist immediately
    await new Promise<void>((resolve, reject) => {
      this.systemsService
        .updateSystem(systemId, { images })
        .subscribe({ next: () => resolve(), error: reject });
    });

    this.currentUploadTask = undefined;
    this.currentUploadProgress = 0;
  }

  async removeImage(url: string, idx: number) {
    const systemId = this.activatedRoute.snapshot.params['id'];
    if (!systemId || systemId === 'new') return;

    try {
      // Attempt to delete storage object by deriving storage path from download URL
      const path = this.extractStoragePath(url);
      if (path) {
        const storageRef = ref(this.storage, path);
        await deleteObject(storageRef).catch(() => {});
      }
    } catch {}

    const images: string[] = [...(this.form.get('images')?.value || [])];
    images.splice(idx, 1);
    this.form.get('images')?.setValue(images);
    this.form.markAsDirty();

    await new Promise<void>((resolve, reject) => {
      this.systemsService
        .updateSystem(systemId, { images })
        .subscribe({ next: () => resolve(), error: reject });
    });
  }

  imageProgress(): number {
    return this.currentUploadTask ? Math.round(this.currentUploadProgress) : 0;
  }

  private extractStoragePath(downloadUrl: string): string | null {
    try {
      const url = new URL(downloadUrl);
      const parts = url.pathname.split('/o/');
      if (parts.length < 2) return null;
      const encodedPath = parts[1].split('?')[0];
      return decodeURIComponent(encodedPath);
    } catch {
      return null;
    }
  }

  previewImage(url: string) {
    this.dialog.open(ImagePreviewDialogComponent, {
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'image-preview-dialog',
      data: { url },
    });
  }

  openContactSelection() {
    const hasClient = !!this.form.get('client')?.value;
    const dialogRef = this.dialog.open(ContactSelectionDialogComponent, {
      width: '600px',
      data: { mode: hasClient ? 'contact' : 'client' },
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((result) => !!result),
        take(1)
      )
      .subscribe((selectedPerson) => {
        const currentClient = this.form.get('client')?.value;

        if (currentClient) {
          // Already have a client, add as contact
          const currentContacts = this.form.get('contactsIds')?.value || [];
          if (!currentContacts.includes(selectedPerson._id)) {
            this.form
              .get('contactsIds')
              ?.setValue([...currentContacts, selectedPerson._id]);
            this.form.markAsDirty();
          }
        } else {
          // No client yet, set as client
          this.form.get('client')?.setValue({
            name: selectedPerson?.clientName,
            id: selectedPerson?._id,
          });
          this.form.markAsDirty();
        }
      });
  }

  removeContact() {
    if (!this.selectedContactId) return;

    const currentContacts = this.form.get('contactsIds')?.value || [];
    const client = this.form.get('client')?.value;
    const clientId = client?._id || client?.id;

    if (this.selectedContactId === clientId) {
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
    const clientId = client?._id || client?.id;
    return clientId === contactId;
  }

  // Helper methods for form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.form?.get(fieldName);
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

  getConvertersFormGroup() {
    return (this.form.get('converters') as FormArray).controls;
  }

  addConverter(model: string = '', amount: number = 1) {
    (this.form.get('converters') as FormArray).push(
      this.formBuilder.group({
        model: [model, Validators.required],
        amount: [amount, [Validators.required, Validators.min(1)]],
      })
    );
  }

  removeConverter() {
    const array = this.form.get('converters') as FormArray;
    const lastIdx = array.length - 1;
    array.removeAt(lastIdx);
  }
}
