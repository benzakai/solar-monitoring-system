import { MonitorItem } from '../../domain/monitor-item';
import { Wash } from './washes.service';
import { DateUtil } from '../../core/date/DateUtil';
import { Energy } from '../../domain/energy';
import { DestroyRef } from '@angular/core';
import { last, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnergyCalc } from '../../core/energy/energy-calculator';
import { TaarifCalculator } from '../../core/energy/taarif-calculator';

export class WashRow {
  id: string;
  name: string;
  clientName: string;
  KWP: number;
  washType?: string;
  washRate: number;
  lastWashDate?: number;
  nextWash?: number;
  supplier?: string;
  numOfWashes?: number;
  sinceLastWash?: number;
  lastWeekPotential?: number;
  // Fields from golan-solar
  potentialRate = 0;
  potential = '';
  washDone = false;
  comment = '';
  daysFromLast = 0;
  lastWash: Wash | undefined;

  constructor(
    public system: MonitorItem,
    public wash: Wash | undefined
  ) {
    this.id = system.id;
    this.name = system.system_name;
    this.clientName = system.client?.name ?? '';
    this.KWP = system.kwp;
    this.washRate = system.washRate;

    const lastWeekMeanEnergy = this.system.past1Week * this.KWP;
    this.potentialRate = this.potentialRate =
      lastWeekMeanEnergy / this.system.potential;
    this.potential = this.potentialRate
      ? Math.round(this.potentialRate * 100) + '%'
      : '';

    if (wash) {
      this.nextWash = wash.nextWash;
      this.supplier = wash.supplier;
      this.numOfWashes = wash.washes?.length ?? 0;
      if (wash.last_wash_date) {
        this.sinceLastWash = DateUtil.DaysFromToday(
          new Date(wash.last_wash_date * 1000)
        );
      }

      if (wash?.washes?.length) {
        this.lastWash = wash?.washes.sort((a, b) => b.date - a.date)[0];
        this.lastWashDate = (this.lastWash as any).date;
        this.washDone = Boolean((this.lastWash as any).done);
        this.nextWash = this.lastWash?.nextWash;
        if (this.lastWashDate) {
          this.daysFromLast = DateUtil.DaysFromToday(this.lastWashDate);
        }
      }
    }
  }
}
