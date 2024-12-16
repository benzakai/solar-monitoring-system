import { Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  combineLatest,
  distinctUntilChanged,
  interval,
  map,
  startWith,
} from 'rxjs';
import { AsyncPipe, NgForOf } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { LANGUAGE } from '../../../lang';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { LanguageService } from '../../services/language.service';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '../../pipes/translate.pipe';

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
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  auth = inject(AngularFireAuth);
  authState = this.auth.authState.pipe(startWith(undefined));
  translatePipe = new TranslatePipe();

  personControl = new FormControl();
  langService = inject(LanguageService);
  lang = inject(LANGUAGE);
  langControl = new FormControl();

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

  reloadPage() {
    window.location.reload();
  }
}
