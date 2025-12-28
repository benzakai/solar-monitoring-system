import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PeopleService } from '../../../endpoint/people.service';
import { SystemsService } from '../../../endpoint/systems.service';
import { Person } from '../../../domain/person';
import { System } from '../../../domain/system';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import { PersonInfoDialogComponent } from '../../system-settings/components/person-info-dialog/person-info-dialog.component';
import { ContactSelectionDialogComponent } from '../../system-settings/components/contact-selection-dialog/contact-selection-dialog.component';

type ContactRow = {
  contact: Person;
  selectedSystemIds: string[];
};

@Component({
  selector: 'app-client-contacts-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatDialogModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  templateUrl: './client-contacts-table.component.html',
  styleUrls: ['./client-contacts-table.component.scss'],
})
export class ClientContactsTableComponent implements OnChanges {
  private people = inject(PeopleService);
  private systemsService = inject(SystemsService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  @Input() systems: System[] | null = [];

  loading$ = new BehaviorSubject<boolean>(false);
  rows: ContactRow[] = [];

  displayedColumns = ['contact', 'email', 'phone', 'systems', 'actions'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['systems']) {
      this.loadContacts();
    }
  }

  private async loadContacts() {
    const systemsArr = Array.isArray(this.systems) ? this.systems : [];
    if (!systemsArr.length) {
      this.rows = [];
      return;
    }
    this.loading$.next(true);
    try {
      const allIds = Array.from(
        new Set(
          systemsArr
            .map((s) => s.contactsIds || [])
            .reduce((acc, v) => acc.concat(v), [] as string[])
        )
      );
      const people = await firstValueFrom(this.people.getPeopleByIds(allIds));
      this.rows = people.map((p) => ({
        contact: p,
        selectedSystemIds: systemsArr.filter((s) => (s.contactsIds || []).includes(p._id)).map((s) => s.id),
      }));
    } finally {
      this.loading$.next(false);
    }
  }

  async saveRow(row: ContactRow) {
    const systemsArr = Array.isArray(this.systems) ? this.systems : [];
    const contactId = row.contact._id;
    const selectedSet = new Set(row.selectedSystemIds);

    this.loading$.next(true);
    try {
      for (const sys of systemsArr) {
        const hasContact = (sys.contactsIds || []).includes(contactId);
        const shouldHave = selectedSet.has(sys.id);
        if (hasContact !== shouldHave) {
          const updated = new Set(sys.contactsIds || []);
          if (shouldHave) {
            updated.add(contactId);
          } else {
            updated.delete(contactId);
          }
          await firstValueFrom(
            this.systemsService.updateSystem(sys.id, { contactsIds: Array.from(updated) })
          );
        }
      }
    } finally {
      this.loading$.next(false);
    }
  }

  openPersonInfo(row: ContactRow) {
    const id = row.contact._id;
    if (!id) return;
    this.dialog.open(PersonInfoDialogComponent, {
      width: '500px',
      data: { personId: id },
    });
  }

  async addContact() {
    const ref = this.dialog.open(ContactSelectionDialogComponent, { width: '600px' });
    const sel = await firstValueFrom(ref.afterClosed());
    if (!sel) return;
    
    // Dialog returns _id (not id), and for new contacts it returns the full object
    const personId = sel._id;
    if (!personId) return;
    
    // Check if already in rows
    if (this.rows.some((r) => r.contact._id === personId)) return;
    
    // If it's a new contact, sel already has all the data; otherwise fetch it
    let person: Person;
    if (sel.name && sel.email !== undefined) {
      // New contact - use returned data directly
      person = sel as Person;
    } else {
      // Existing contact - fetch full data
      const fetched = await firstValueFrom(this.people.getById(personId));
      if (!fetched) return;
      person = fetched;
    }
    
    this.rows = [
      ...this.rows,
      { contact: person, selectedSystemIds: [] },
    ];
    this.cdr.detectChanges();
  }

  async deleteContact(row: ContactRow) {
    const systemsArr = Array.isArray(this.systems) ? this.systems : [];
    const contactId = row.contact._id;

    this.loading$.next(true);
    try {
      // Remove contact from all systems (same logic as old system when saving with empty systems)
      for (const sys of systemsArr) {
        const hasContact = (sys.contactsIds || []).includes(contactId);
        if (hasContact) {
          const updated = new Set(sys.contactsIds || []);
          updated.delete(contactId);
          await firstValueFrom(
            this.systemsService.updateSystem(sys.id, { contactsIds: Array.from(updated) })
          );
        }
      }
      // Remove from local rows
      this.rows = this.rows.filter((r) => r.contact._id !== contactId);
    } finally {
      this.loading$.next(false);
    }
  }
}


