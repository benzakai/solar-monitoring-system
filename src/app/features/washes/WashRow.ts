import { MonitorItem } from '../../domain/monitor-item';
import { DateUtil } from '../../core/date/DateUtil';
import { SystemWash, Wash } from '../../domain/system-wash';
import { Timestamp } from 'firebase/firestore';

export class WashRow {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  KWP: number;
  washType?: string;
  washRate: number;
  lastWashDate?: Date;
  nextWash?: Date;
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
    public systemWash: SystemWash | undefined,
    clientName?: string
  ) {
    this.id = system.id;
    this.name = system.system_name;
    this.clientName = clientName ?? system.client?.name ?? '';
    this.clientId = system.client?.id ?? '';
    this.KWP = system.kwp;
    this.washRate = system.washRate;

    const lastWeekMeanEnergy = this.system.past1Week * this.KWP;
    this.potentialRate = this.potentialRate =
      lastWeekMeanEnergy / this.system.potential;
    this.potential = this.potentialRate
      ? Math.round(this.potentialRate * 100) + '%'
      : '';

    if (systemWash) {
      this.numOfWashes = systemWash.washes?.length ?? 0;
      if (systemWash?.washes?.length) {
        this.lastWash = systemWash?.washes.sort((a, b) => b.date - a.date)[0];
        this.lastWashDate = this.dateParse((this.lastWash as any).date);
        this.washDone = Boolean((this.lastWash as any).done);
        this.supplier = this.lastWash.supplier;
        this.nextWash = this.dateParse(this.lastWash?.nextWash);
        if (this.lastWashDate) {
          this.daysFromLast = DateUtil.DaysFromToday(this.lastWashDate);
        }
      }
    }
  }

  dateParse(velue: unknown): Date | undefined {
    const number = this.parseDatesToSimple(velue);
    const localDate = number ? new Date(number) : null;
    return localDate
      ? new Date(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getDate()
        )
      : undefined;
  }

  parseDatesToSimple(value: unknown): number | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (value instanceof Timestamp) return value.toMillis();
    return undefined;
  }
}
