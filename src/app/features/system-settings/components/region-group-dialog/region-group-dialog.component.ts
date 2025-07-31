import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SystemLocation } from '../../../../domain/system-location';
import { SystemsService } from '../../../../endpoint/systems.service';
import { SystemLocationService } from '../../../google-maps/system-location.service';
import { DialogService } from '../../../../core/dialog/services/dialog.service';
import { Regions, RegionsDictionary } from '../../../../domain/regions';
import { EnumUtil } from '../../../../core/math/enum-util';
import { SystemLocationComponent } from '../../../google-maps/system-location/system-location.component';
import { DictionaryPipe } from '../../../../core/lang/dictionary.pipe';
import { take } from 'rxjs/operators';
import { System } from '../../../../domain/system';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

export type RegionGroupDialogData = {
  mySystem: string;
  location: SystemLocation;
};

@Component({
  selector: 'app-region-group-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SystemLocationComponent,
    DictionaryPipe,
    DecimalPipe,
    TranslatePipe,
  ],
  templateUrl: './region-group-dialog.component.html',
  styleUrls: ['./region-group-dialog.component.scss'],
})
export class RegionGroupDialogComponent implements OnInit {
  @ViewChild('mapComp') mapComp!: SystemLocationComponent;
  readonly MIN_ALERT = 5;

  regions = EnumUtil.ListValues(Regions);
  regionsDictionary = RegionsDictionary;

  mySystem: string;
  initialLocation: SystemLocation;
  location: SystemLocation;

  relatedSystemsData: { name: string; dist: number; id: string }[] = [];
  allSystems: System[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) data: RegionGroupDialogData,
    private systemsService: SystemsService,
    private systemLocationService: SystemLocationService,
    private dialogRef: MatDialogRef<RegionGroupDialogComponent>,
    private dialogService: DialogService
  ) {
    this.mySystem = data.mySystem;
    this.initialLocation = data.location
      ? JSON.parse(JSON.stringify(data.location))
      : {};
    if (!this.initialLocation.region) {
      this.initialLocation.region = [];
    }
    this.location = JSON.parse(JSON.stringify(this.initialLocation));
  }

  ngOnInit() {
    this.systemLocationService
      .allSystems()
      .pipe(take(1))
      .subscribe((systems) => {
        this.allSystems = systems.filter((s) => s);
        this.calcDistances();
      });
  }

  onChange(ev: SystemLocation) {
    this.location = ev;
    this.calcDistances();
  }

  calcDistances() {
    this.relatedSystemsData =
      this.location?.relatedSystems
        ?.map((systemId) => this.allSystems.find((s) => s.id === systemId))
        .filter((system) => Boolean(system?.isActive))
        .map((system) => {
          let dist = NaN;
          if (system?.location?.coords && this.location?.coords) {
            dist = this.systemLocationService.computeDistance(
              system.location.coords,
              this.location.coords
            );
          }
          return {
            id: system!.id,
            name: system!.name,
            dist,
          };
        })
        .sort((a, b) => a.dist - b.dist) || [];
  }

  hasChanges() {
    return (
      JSON.stringify(this.location) !== JSON.stringify(this.initialLocation)
    );
  }

  async save() {
    const loader = this.dialogService.loader();
    try {
      const system = this.allSystems.find((s) => s.id === this.mySystem);
      if (system) {
        system.location = this.location;
        await this.systemsService
          .updateSystem(this.mySystem, system)
          .toPromise();
      }
    } catch (e) {
      console.error(e);
    } finally {
      loader.close();
    }
    this.dialogRef.close(this.location);
  }

  async close() {
    const confirm = await this.dialogService.confirm({
      message: 'האם לסגור את החלון ללא שמירת המיקום?',
      title: 'סגירה ללא שמירת מיקום',
    });
    if (confirm) {
      this.dialogRef.close();
    }
  }
}
