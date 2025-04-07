import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  interval,
  map,
  Observable,
  shareReplay,
  startWith,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import { AsyncPipe, JsonPipe, NgForOf } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { MonitorItem } from '../../domain/monitor-item';
import { TranslatePipe } from '../lang/translate.pipe';
import { LanguageService } from '../lang/language.service';
import { LANGUAGE } from '../lang';
import { MENU_TOOGLE } from './menu';
import { UsersService } from '../../endpoint/users.service';
import { CoordinatorsService } from '../../features/people/services/coordinators.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatIcon,
    AsyncPipe,
    MatFormField,
    MatOption,
    MatSelect,
    NgForOf,
    ReactiveFormsModule,
    MatInput,
    MatButton,
    TranslatePipe,
    MatAutocompleteModule,
    JsonPipe,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  translatePipe = new TranslatePipe();
  coordinatorsService = inject(CoordinatorsService);
  personControl = new FormControl();
  searchControl = new FormControl();
  langService = inject(LanguageService);
  lang = inject(LANGUAGE);
  langControl = new FormControl();
  menu = inject(MENU_TOOGLE);

  usersService = inject(UsersService);

  coordinators = this.coordinatorsService.coordinators;
  coordinatorsControl = new FormControl([] as string[]);
  allCoordinators = this.coordinatorsService.allCoorinatorsSelected;

  selectedCoordinatorsString =
    this.coordinatorsService.coordinatorsSelected.pipe(
      map((ids) => ids?.length)
    );

  @Input() public headerTitle: string | undefined;
  @Output() toggled = new EventEmitter<void>();

  facade = inject(MonitorFacade);

  foundSystems: Observable<Partial<MonitorItem>[]> =
    this.searchControl.valueChanges.pipe(
      debounceTime(200),
      map((search) => (search?.length ? search.toLowerCase() : '')),
      withLatestFrom(
        combineLatest([this.facade.fulltext, this.facade.clients])
      ),
      map(([phrase, [systems, clients]]) =>
        phrase ? this.searchForSystems(phrase, systems, clients) : []
      )
    );

  constructor() {
    this.lang
      .pipe(takeUntilDestroyed(), distinctUntilChanged())
      .subscribe((lng) => {
        this.langControl.setValue(lng);
      });
    this.langControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((lang) => {
        this.langService.setLanguage(lang);
      });
    this.authState.pipe(takeUntilDestroyed()).subscribe((a) => {
      this.personControl.setValue(a?.email);
    });

    this.coordinatorsService.coordinatorsSelectedSource
      .pipe(takeUntilDestroyed())
      .subscribe((coords) =>
        this.coordinatorsControl.setValue(coords, { emitEvent: false })
      );
    this.coordinatorsControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((coords) =>
        this.coordinatorsService.coordinatorsSelectedSource.next(coords || [])
      );
  }

  private searchForSystems(
    phrase: string,
    systems: (MonitorItem & { system_name_idx: string })[],
    clients: any[]
  ): Partial<MonitorItem>[] {
    if (!(phrase && systems.length && clients.length)) {
      return [];
    }

    const systemsFoundByName = systems.filter((client) =>
      client.system_name_idx.includes(phrase)
    );
    const clientsFound = clients.filter((client) =>
      client.fulltext.includes(phrase)
    );
    const clientsMap = clientsFound.reduce(
      (acc, client) => Object.assign(acc, { [client.id]: true }),
      {}
    );
    const systemsFoundByClient = systems.filter(
      (system) => system.client?.id && clientsMap[system.client.id]
    );

    return [...systemsFoundByName, ...systemsFoundByClient];
  }

  goToSystemDetails(id?: string) {
    if (id) {
      window.location.href = `https://solar-golan.web.app/solar-system/${id}`;
    }
  }

  person = this.authState.pipe(
    filter((auth) => !!auth),
    switchMap((auth) => this.usersService.getUserByUid(auth?.uid)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  text$ = combineLatest([
    interval(60000).pipe(startWith(0)),
    this.personControl.valueChanges.pipe(startWith(this.personControl.value)),
    this.lang,
    this.person,
  ]).pipe(
    map(([time, name, lang, auth]) =>
      this.generateGreeting(auth?.displayName || '', lang)
    )
  );

  generateGreeting(name: string, lang: 'en' | 'he'): string {
    const today = new Date();
    const israelTime = new Date(
      today.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
    );

    const day = String(israelTime.getDate()).padStart(2, '0');
    const month = String(israelTime.getMonth() + 1).padStart(2, '0');
    const year = israelTime.getFullYear();
    const hours = israelTime.getHours();
    const minutes = String(israelTime.getMinutes()).padStart(2, '0');

    let greetKey: string;

    if (hours < 12) {
      greetKey = 'good_morning';
    } else if (hours < 18) {
      greetKey = 'good_afternoon';
    } else if (hours < 21) {
      greetKey = 'good_late_afternoon';
    } else if (hours < 24) {
      greetKey = 'good_evening';
    } else {
      greetKey = 'good_night';
    }

    const greet = this.translatePipe.transform(`header.${greetKey}`);

    return `${day}/${month}/${year} ${hours}:${minutes}  ${greet} ${name}`;
  }

  goToOld() {
    window.location.href = 'https://solar-golan.web.app';
  }

  reloadPage() {
    window.location.reload();
  }
}
