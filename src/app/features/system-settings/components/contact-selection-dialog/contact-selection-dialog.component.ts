import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import { IdName } from '../../../../domain/id-name';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { NgIf } from '@angular/common';
import { PeopleService } from '../../../../endpoint/people.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface ContactSelectionDialogData {
  mode: 'client' | 'contact';
}

@Component({
  selector: 'app-contact-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    AsyncPipe,
    TranslatePipe,
    MatTabsModule,
    NgIf,
    MatProgressSpinnerModule,
  ],
  templateUrl: './contact-selection-dialog.component.html',
  styleUrls: ['./contact-selection-dialog.component.scss'],
})
export class ContactSelectionDialogComponent {
  private monitorFacade = inject(MonitorFacade);
  private dialogRef = inject(MatDialogRef<ContactSelectionDialogComponent>);
  private fb = inject(FormBuilder);
  private peopleService = inject(PeopleService);
  private data = inject<ContactSelectionDialogData>(MAT_DIALOG_DATA, {
    optional: true,
  });

  searchControl = new FormControl('');
  newContactForm: FormGroup;
  selectedTabIndex = 0;
  isSaving = false;

  /** 'client' mode shows only clients, 'contact' mode shows only contacts (non-clients) */
  mode: 'client' | 'contact' = this.data?.mode ?? 'client';

  /** Title key for translation */
  get titleKey(): string {
    return this.mode === 'client'
      ? 'system_settings.add_client'
      : 'system_settings.add_contact';
  }

  filteredPeople$: Observable<
    { _id: string; name: string; clientName?: string }[]
  >;

  constructor() {
    console.log(
      '[ContactSelectionDialog] mode:',
      this.mode,
      'data:',
      this.data
    );

    this.newContactForm = this.fb.group({
      name: [''],
      email: ['', [Validators.email]],
      phone: [''],
    });

    const people$ =
      this.mode === 'client'
        ? this.peopleService.getAllClients()
        : this.peopleService.getAllContacts();

    this.filteredPeople$ = combineLatest([
      people$,
      this.searchControl.valueChanges.pipe(startWith('')),
    ]).pipe(
      map(([people, searchTerm]) => {
        console.log('[ContactSelectionDialog] People received:', people);
        const filterValue = (searchTerm || '').toLowerCase();
        return people.filter(
          (person) =>
            person.name?.toLowerCase().includes(filterValue) ||
            person.clientName?.toLowerCase().includes(filterValue) //
        );
      })
    );
  }

  onPersonSelected({ _id, name }: any): void {
    this.dialogRef.close({ _id, name });
  }

  onSaveNew() {
    if (this.newContactForm.invalid) {
      return;
    }
    this.isSaving = true;
    const { name, email, phone } = this.newContactForm.value;

    const save$ =
      this.mode === 'client'
        ? this.peopleService.addClient({ clientName: name, email, phone })
        : this.peopleService.addContact({ name, email, phone });

    save$.subscribe({
      next: (newPerson) => {
        this.isSaving = false;
        this.dialogRef.close(newPerson);
      },
      error: () => {
        this.isSaving = false;
      },
    });
  }
}
