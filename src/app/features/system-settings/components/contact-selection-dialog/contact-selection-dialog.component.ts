import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import { IdName } from '../../../../domain/id-name';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import {NgIf} from "@angular/common";
import { PeopleService } from '../../../../endpoint/people.service';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";

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

  searchControl = new FormControl('');
  newContactForm: FormGroup;
  selectedTabIndex = 0;
  isSaving = false;

  clients$ = this.monitorFacade.clientsAll;
  filteredClients$: Observable<IdName[]>;

  constructor() {
    this.newContactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required]
    });

    this.filteredClients$ = combineLatest([
      this.clients$,
      this.searchControl.valueChanges.pipe(startWith('')),
    ]).pipe(
      map(([clients, searchTerm]) => {
        const filterValue = (searchTerm || '').toLowerCase();
        return clients.filter((client) =>
          client.name.toLowerCase().includes(filterValue)
        );
      })
    );
  }

  onClientSelected({ id, name }: IdName): void {
    this.dialogRef.close({ id, name });
  }

  onSaveNewContact() {
    if (this.newContactForm.invalid) {
      return;
    }
    this.isSaving = true;
    const { name, email, phone } = this.newContactForm.value;
    this.peopleService
      .addClient({ clientName: name, email, phone })
      .subscribe((newClient) => {
        this.isSaving = false;
        this.dialogRef.close(newClient);
      });
  }
}
