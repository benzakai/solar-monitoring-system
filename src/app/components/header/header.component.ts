import {Component, DestroyRef, inject} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {combineLatest, distinctUntilChanged, interval, map, of, startWith} from 'rxjs';
import {AsyncPipe, NgForOf} from '@angular/common';
import {MatFormField} from '@angular/material/form-field';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MatInput} from '@angular/material/input';
import {LANGUAGE} from '../../../lang';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

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
    MatInput
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  people = ['Katia Levenstein', 'Marek'];
  personControl = new FormControl(this.people[0])
  lang = inject(LANGUAGE);
  destroyRef = inject(DestroyRef);
  langControl = new FormControl();

  constructor() {
    this.lang.pipe(takeUntilDestroyed(), distinctUntilChanged()).subscribe((lng) => {
      this.langControl.setValue(lng);
    });
    this.langControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((lang) => {
      this.lang.next(lang);
    } );
  }

  text$ = combineLatest([
    interval(60000).pipe(startWith(0)),
    this.personControl.valueChanges.pipe(startWith(this.personControl.value))
  ]).pipe(
    map(([time, name]) => this.generateGreeting(name || ''))
  )


  generateGreeting(name: string): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const hours = today.getHours();
    const minutes = String(today.getMinutes()).padStart(2, '0');

    let greet

    if (hours < 12) {
      greet = 'Good morning';
    } else if (hours < 18) {
      greet = 'Good afternoon';
    } else {
      greet = 'Good evening';
    }

    return `${day}/${month}/${year} ${hours}:${minutes}  ${greet} ${name}`;
  }


}
