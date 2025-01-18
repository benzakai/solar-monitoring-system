import { Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  interval,
  map,
  Observable,
  startWith,
  withLatestFrom,
} from 'rxjs';
import { AsyncPipe, JsonPipe, NgForOf } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatButton } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MonitorFacade } from '../../state/monitor/monitor.facade';
import { MonitorItem } from '../../domain/monitor-item';
import { TranslatePipe } from '../lang/translate.pipe';
import { LanguageService } from '../lang/language.service';
import { LANGUAGE } from '../lang';

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
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  translatePipe = new TranslatePipe();

  personControl = new FormControl();
  searchControl = new FormControl();
  langService = inject(LanguageService);
  lang = inject(LANGUAGE);
  langControl = new FormControl();

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

  text$ = combineLatest([
    interval(60000).pipe(startWith(0)),
    this.personControl.valueChanges.pipe(startWith(this.personControl.value)),
    this.authState,
  ]).pipe(
    map(([time, name, auth]) => this.generateGreeting(auth?.displayName || ''))
  );

  generateGreeting(name: string): string {
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
