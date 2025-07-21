import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MonitorFacade } from '../../../../state/monitor/monitor.facade';
import { IdName } from '../../../../domain/id-name';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

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
  ],
  templateUrl: './contact-selection-dialog.component.html',
  styleUrls: ['./contact-selection-dialog.component.scss'],
})
export class ContactSelectionDialogComponent {
  private monitorFacade = inject(MonitorFacade);
  private dialogRef = inject(MatDialogRef<ContactSelectionDialogComponent>);

  searchControl = new FormControl('');

  clients$ = this.monitorFacade.clientsAll;
  filteredClients$: Observable<IdName[]>;

  constructor() {
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
}
