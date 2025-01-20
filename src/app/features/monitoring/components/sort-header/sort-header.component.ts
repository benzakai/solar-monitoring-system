import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { BehaviorSubject, filter, first, map } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { Sort } from '@angular/material/sort';

interface SortState {
  activeColumn: string;
  activeDirection: string;
  column: string;
}

@Component({
  selector: 'app-sort-header',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './sort-header.component.html',
  styleUrl: './sort-header.component.scss',
})
export class SortHeaderComponent {
  private setup = new BehaviorSubject<Partial<SortState>>({});
  private inited = this.setup.pipe(
    filter((s) => Boolean(s.column && s.activeColumn && s.activeDirection))
  );

  @Input() set active(
    active: { sortField?: any; sortDirection?: number } | null
  ) {
    this.patchSetup({
      activeColumn: active?.sortField,
      activeDirection: active?.sortDirection === 1 ? 'asc' : 'desc',
    });
  }

  @Input() set column(column: string) {
    this.patchSetup({ column });
  }

  @Output() onSort = new EventEmitter<Sort>();

  fit = this.inited.pipe(
    map(({ column, activeColumn }) => column === activeColumn)
  );

  direction = this.inited.pipe(map(({ activeDirection }) => activeDirection));

  private patchSetup(patch: Partial<SortState>) {
    const current = this.setup.getValue();
    this.setup.next({
      ...current,
      ...patch,
    });
  }

  @HostListener('click') toogle() {
    const { column, activeColumn, activeDirection } = this.setup.getValue();
    if (column) {
      if (column === activeColumn) {
        this.onSort.emit({
          active: column,
          direction: activeDirection === 'asc' ? 'desc' : 'asc',
        });
      } else {
        this.onSort.emit({
          active: column,
          direction: 'desc',
        });
      }
    }
  }
}
