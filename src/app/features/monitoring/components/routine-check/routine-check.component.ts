import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MonitoringTableComponent } from '../monitoring-table/monitoring-table.component';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatCard } from '@angular/material/card';
import { MatPaginator } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MonitoringFiltersComponent } from '../monitoring-filters/monitoring-filters.component';
import { HeaderComponent } from '../../../../core/header/header.component';
import { IssuesCountPipe } from '../../pipes/issues-count.pipe';
import { SortHeaderComponent } from '../sort-header/sort-header.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FiltersControlService } from '../../services/filters-control.service';
import { RoutineCheckService } from '../../../../endpoint/routine-check.service';

@Component({
  selector: 'app-routine-check',
  standalone: true,
  imports: [
    [
      CommonModule,
      RouterOutlet,
      MatTableModule,
      MatIconModule,
      MatSortModule,
      MatCard,
      MatPaginator,
      MatButtonModule,
      MatMenuModule,
      MatDialogModule,
      MonitoringFiltersComponent,
      HeaderComponent,
      IssuesCountPipe,
      SortHeaderComponent,
      RouterModule,
      MatTooltipModule,
    ],
    TranslatePipe,
    MatProgressSpinner,
  ],
  templateUrl: './routine-check.component.html',
  styleUrl: './routine-check.component.css',
  providers: [FiltersControlService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutineCheckComponent extends MonitoringTableComponent {
  override displayedColumns: string[] = [
    'notes',
    'actions',
    'check',
    'openAlerts',
    'clearedAlerts',
    'weekly',
    'threeDays',
    'yesterday',
    'today_comparable',
    'daysFromCheck',
    'communication',
    'portal',
    'KWP',
    'name',
  ];
}
