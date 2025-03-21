import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogClose,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Energy } from '../../../../domain/energy';
import { System } from '../../../../domain/system';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-environmental-systems-dialog',
  standalone: true,
  imports: [
    MatDialogClose,
    MatDialogModule,
    DecimalPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    DatePipe,
  ],
  templateUrl: './environmental-systems-dialog.component.html',
  styleUrl: './environmental-systems-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentalSystemsDialogComponent {
  means: {
    today: number;
    lastDay: number;
    last3Days: number;
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
  };

  displayedColumns: string[] = [
    'systemName',
    'today',
    'yesterday',
    'threeDays',
    'weekly',
    'monthly',
    'yearly',
    'lastUpdate',
  ];

  systemMap: { [key: string]: number } = {};
  lastConnection: { [key: string]: Date } = {};

  dataSrc = new MatTableDataSource();

  asPercent = (ratio: number) => {
    if (!isNaN(ratio)) {
      let str = Math.round(Math.abs(ratio) * 100) + '%';
      str = str.replace('Infinity%', '∞');
      return str;
    } else {
      return 'N/A';
    }
  };
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { system: System; energy: Energy }[],
    private dialogRef: MatDialogRef<EnvironmentalSystemsDialogComponent>
  ) {
    const environmentals = this.data.slice(1);
    const systemAndEnergy = this.data[0];
    const lastDaily = systemAndEnergy.energy.daily.slice(-1)[0]?.time || NaN;
    const maxHour = new Date(lastDaily).getHours();
    const dailyEnergies = environmentals.map(
      (se) =>
        EnergyCalc.Sum(
          se.energy.daily
            .filter((e) => !maxHour || new Date(e.time).getHours() <= maxHour)
            .map((e) => e.valueKwh)
        ) / se.system.KWP
    );

    environmentals.forEach((se) => {
      this.lastConnection[se.system.id] = new Date(
        se.energy.daily[se.energy.daily.length - 1].time
      );
    });

    this.means = {
      today: EnergyCalc.Mean(dailyEnergies),
      lastDay: this.meanEnergy(environmentals, 1),
      last3Days: this.meanEnergy(environmentals, 3),
      lastWeek: this.meanEnergy(environmentals, 7),
      lastMonth: this.meanEnergy(environmentals, 30),
      lastYear: this.meanEnergy(environmentals, 365),
    };

    this.dataSrc.data = data;
  }

  meanEnergy(
    envs: { system: System; energy: Energy }[],
    numOfDays: number
  ): number {
    return EnergyCalc.Mean(
      envs.map((se) => {
        const m = this.totalEnergyInPeriod(
          se.system,
          se.energy,
          EnergyCalc.DaysBack(numOfDays)
        );

        this.systemMap[se.system.id + '-' + numOfDays] = m;

        return m;
      })
    );
  }

  totalEnergyInPeriod(
    system: System,
    energy: Energy,
    from: number = -Infinity,
    to: number = Infinity,
    normalizedKWP: boolean = true
  ): number {
    const sum = EnergyCalc.Sum(
      energy.annual
        .filter((e) => e.time >= from && e.time <= to)
        .map((e) => e.valueKwh)
    );
    return normalizedKWP ? sum / system.KWP : sum;
  }
}
