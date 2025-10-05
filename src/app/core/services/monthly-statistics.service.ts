import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { SystemsService } from '../../endpoint/systems.service';
import { PeopleService } from '../../endpoint/people.service';
import { System } from '../../domain/system';
import { firstValueFrom } from 'rxjs';

export interface MonthSnapshot {
  numOfPayingSystems: number;
  numOfTrialSystems: number;
  numOfNewSource: number;
  numOfProjectSource: number;
  payingKWP: number;
  trialKWP: number;
  incomes: number;
}

export class DoubleMonthSnapshot {
  readonly change = {} as MonthSnapshot;
  readonly changeRatio = {} as MonthSnapshot;
  readonly hasPrevMonth: boolean;

  constructor(readonly currentMonth: MonthSnapshot, prevMonth?: MonthSnapshot) {
    this.hasPrevMonth = !!prevMonth;
    (Object.keys(this.currentMonth) as Array<keyof MonthSnapshot>).forEach(
      (key) => {
        const prevVal = prevMonth ? prevMonth[key] : NaN;
        const curVal = this.currentMonth[key];
        this.change[key] = prevMonth ? curVal - (prevVal as number) : NaN;
        this.changeRatio[key] = prevMonth
          ? (curVal / (prevVal as number)) - 1
          : NaN;
      }
    );
  }
}

@Injectable({ providedIn: 'root' })
export class MonthlyStatisticsService {
  private systemsService = inject(SystemsService);
  private peopleService = inject(PeopleService);

  constructor(private firestore: Firestore) {}

  private getDocId(date: number) {
    return new Date(date).toISOString().slice(0, 7); // YYYY-MM
  }

  private async getMonth(date: number): Promise<MonthSnapshot | undefined> {
    const id = this.getDocId(date);
    const ref = doc(this.firestore, `monthlyStatistics/${id}`);
    const snapshot = await getDoc(ref);
    return (snapshot.exists() ? (snapshot.data() as MonthSnapshot) : undefined);
  }

  async getTwoMonths(date: number): Promise<DoubleMonthSnapshot | undefined> {
    const d = new Date(date);
    const prev = new Date(d);
    prev.setMonth(prev.getMonth() - 1);
    
    // Try to get from Firestore first
    let [curData, prevData] = await Promise.all([
      this.getMonth(+d),
      this.getMonth(+prev),
    ]);

    // If current month data doesn't exist, build it live
    if (!curData) {
      console.log('Building monthly snapshot live for', this.getDocId(+d));
      curData = await this.buildSnapshot(d);
      // Optionally save it to Firestore for future use
      try {
        await setDoc(
          doc(this.firestore, `monthlyStatistics/${this.getDocId(+d)}`),
          curData
        );
      } catch (e) {
        console.warn('Failed to save monthly snapshot', e);
      }
    }

    return curData ? new DoubleMonthSnapshot(curData, prevData) : undefined;
  }

  private async buildSnapshot(date: Date): Promise<MonthSnapshot> {
    const currentMonth = date.getMonth();
    const systems = await firstValueFrom(this.systemsService.getSystems());
    const clients = await firstValueFrom(this.peopleService.getAllClients());

    // Filter active systems with contract and KWP
    const activeSystems = systems.filter(
      (s) => s.isActive && s.contract && Number.isFinite(s.KWP)
    );

    // Trial = 'month' (old SystemContract.TWO_MONTH enum value)
    const isTrial = (contract: string) => contract === 'month';

    const trialSystems = activeSystems.filter((s) => isTrial(s.contract));
    const payingSystems = activeSystems.filter(
      (s) => s.contract && !isTrial(s.contract)
    );

    const newSource = payingSystems.filter((s) => s.source === 'new');
    const projectSource = payingSystems.filter((s) => s.source === 'project');

    const sum = (arr: System[], fn: (s: System) => number) =>
      arr.reduce((acc, s) => acc + (Number(fn(s)) || 0), 0);

    const trialKWP = sum(trialSystems, (s) => s.KWP);
    const payingKWP = sum(payingSystems, (s) => s.KWP);

    // Filter systems that should be charged this month
    const payingCurrentMonth = payingSystems.filter((s) => {
      const client = clients.find((c: any) => c.id === s.client?.id);
      const chargeMonths = (client as any)?.chargeMonths;
      return Array.isArray(chargeMonths) && chargeMonths.includes(currentMonth);
    });

    // Calculate incomes: monitorPriceKw * KWP for systems charged this month
    const incomes = sum(
      payingCurrentMonth,
      (s) => (s.monitorPriceKw || 0) * (s.KWP || 0)
    );

    return {
      numOfPayingSystems: payingSystems.length,
      numOfTrialSystems: trialSystems.length,
      numOfNewSource: newSource.length,
      numOfProjectSource: projectSource.length,
      payingKWP,
      trialKWP,
      incomes,
    };
  }

  public async checkCurrentMonth() {
    try {
      const currentMonth = await this.getMonth(Date.now());
      if (!currentMonth) {
        const snapshot = await this.buildSnapshot(new Date());
        return setDoc(
          doc(this.firestore, `monthlyStatistics/${this.getDocId(Date.now())}`),
          snapshot
        );
      }
    } catch {
      console.warn('Failed to check current month statistics');
    }
  }
}


