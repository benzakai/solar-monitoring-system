import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogService } from '../../../../core/dialog/dialog.service';
import { SystemsService } from '../../../../core/systems/systems.service';
import { SystemLocationService } from '../../../../core/system-location/system-location.service';
import { SystemLocation } from '../../../../domain/system-location';
import { System } from '../../../../domain/system';
import { DictionaryPipe } from '../../../../core/lang/dictionary.pipe';
import { take } from 'rxjs/operators';

export type RegionGroupDialogData = {
  initialLocation: SystemLocation;
  allSystems: System[];
};

@Component({
  selector: 'app-region-group-dialog',
  templateUrl: './region-group-dialog.component.html',
  styleUrls: ['./region-group-dialog.component.scss'],
})
export class RegionGroupDialogComponent implements OnInit {
  location: SystemLocation;
  allSystems: System[];

  constructor(
    @Inject(MAT_DIALOG_DATA) data: RegionGroupDialogData,
    private systemsService: SystemsService,
    private systemLocationService: SystemLocationService,
    private dialogRef: MatDialogRef<RegionGroupDialogComponent>,
    private dialogService: DialogService
  ) {
    this.location = JSON.parse(JSON.stringify(this.initialLocation));
  }

  ngOnInit() {
    this.systemLocationService
      .allSystems()
      .pipe(take(1))
      .subscribe((systems) => {
        this.allSystems = systems;
        this.calcDistances();
      });
  }

  onChange(ev: SystemLocation) {
    this.location = ev;
    this.calcDistances();
  }

  private calcDistances() {
    // This method needs to be implemented to calculate distances
    // based on the current location and all systems.
    // For now, it's a placeholder.
    console.log('Calculating distances...');
  }
} 