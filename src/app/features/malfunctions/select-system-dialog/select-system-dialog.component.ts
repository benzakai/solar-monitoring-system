import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '../../../core/lang/translate.pipe';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import {
  combineLatest,
  debounceTime,
  map,
  Observable,
  withLatestFrom,
} from 'rxjs';
import { MonitorItem } from '../../../domain/monitor-item';
import { MonitorFacade } from '../../../state/monitor/monitor.facade';

@Component({
  selector: 'app-select-system-dialog',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatProgressSpinner,
    MatRow,
    MatRowDef,
    MatTable,
    TranslatePipe,
    MatAutocomplete,
    MatAutocompleteTrigger,
    ReactiveFormsModule,
    MatOption,
  ],
  templateUrl: './select-system-dialog.component.html',
  styleUrl: './select-system-dialog.component.css',
})
export class SelectSystemDialogComponent {
  facade = inject(MonitorFacade);
  searchControl = new FormControl();
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

  dialog = inject(MatDialogRef<SelectSystemDialogComponent>);

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

  selection(system: Partial<MonitorItem>): void {
    this.dialog.close({ ...system });
  }
}
