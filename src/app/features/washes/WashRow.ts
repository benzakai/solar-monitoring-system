import { MonitorItem } from '../../domain/monitor-item';
import { Wash } from './washes.service';
import { DateUtil } from '../../core/date/DateUtil';

export class WashRow {
  clientName: string;
  washType?: string;
  lastWashDate?: number;
  nextWash?: number;
  supplier?: string;
  numOfWashes?: number;
  sinceLastWash?: number;

  constructor(
    public system: MonitorItem,
    public wash: Wash | undefined
  ) {
    this.clientName = system.client?.name ?? '';

    if (wash) {
      this.lastWashDate = wash.last_wash_date;
      this.nextWash = wash.nextWash;
      this.supplier = wash.supplier;
      this.numOfWashes = wash.washes?.length ?? 0;
      if (wash.last_wash_date) {
        const lastWash = new Date(wash.last_wash_date * 1000);
        const today = new Date();
      }
    }
  }
}
