import {Component, DestroyRef, inject, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FiltersComponent} from "../filters/filters.component";
import {HeaderComponent} from "../header/header.component";
import {MatButtonModule} from "@angular/material/button";
import {
  MatTableDataSource, MatTableModule
} from "@angular/material/table";
import {MatIconModule} from "@angular/material/icon";
import {MatMenuModule} from "@angular/material/menu";
import {MatSortModule, Sort} from "@angular/material/sort";
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {MatCard} from '@angular/material/card';
import {DataService} from '../../data.service';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, of} from 'rxjs';
import {FiltersControlService} from '../../services/filters-control.service';

@Component({
  selector: 'app-systems-page',
  standalone: true,
    imports: [
      [
        CommonModule,
        RouterOutlet,
        MatTableModule,
        MatIconModule,
        MatSortModule,
        MatCard, MatPaginator,
        MatButtonModule, MatMenuModule, FiltersComponent, HeaderComponent
      ]
    ],
  templateUrl: './systems-page.component.html',
  styleUrl: './systems-page.component.css',
  providers: [FiltersControlService, DataService]
})
export class SystemsPageComponent {
  dataService = inject(DataService);
  length$ = this.dataService.count.asObservable();
  isLoading = true;
  displayedColumns: string[] = [
    'notes',
    'actions',
    'openAlerts',
    'clearedAlerts',
    'startOfYear',
    'startOfMonth',
    'lastMonth',
    'today',
    'monthly',
    'weekly',
    'threeDays',
    'yesterday',
    'communication',
    'portal',
    'KWP',
    'name',
    'tested',
  ];

  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  pageIndex = 0;
  pageSize = 10;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngAfterViewInit() {
    if (!this.paginator) {
      return;
    }
    this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e: PageEvent) => {
      this.pageIndex = e.pageIndex;
      this.pageSize = e.pageSize;
      this.loadPage();
    });

    this.loadPage();
  }

  pivot: any = null;

  loadPage() {
    this.isLoading = true;
    this.dataSource.data = [];
    this.dataService.getSystemsData(this.pageSize, this.pageIndex > 0 ? 'next' : undefined).pipe(takeUntilDestroyed(this.destroyRef), catchError((e) => {
      this.router.navigate(['login']);
      return of([]);
    })).subscribe(data => {
      this.pivot = data[data.length - 1];
      this.isLoading = false;
      this.dataSource.data = data || [];
    });
  }

  onSort(sortState: Sort) {
    const direction = sortState.direction
      ? `${sortState.active},${sortState.direction}`
      : '';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: direction },
      queryParamsHandling: 'merge',
    });
  }
}
