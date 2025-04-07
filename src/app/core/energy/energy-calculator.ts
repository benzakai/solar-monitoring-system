import { Energy, EnergyApiRecord, EnergySample } from '../../domain/energy';
import { System } from '../../domain/system';
import { DateUtil } from '../date/DateUtil';

export interface SolarEdgeAlerts {
  quantity: number;
  highestImpact: number;
}

export interface EnergyIndices {
  // Today's total production (from 00:00 until now)
  today: number;
  // Yesterday's production
  lastDay: number;
  // Last 3 days production (yesterday + 2 days before)
  last3Days: number;
  // Last 7 days production
  lastWeek: number;
  // Last 30 days production
  lastMonth: number;
  // Last 365 days production
  lastYear: number;
}

// List of highest monthly values for every year
export type MaxMonth = {
  [year: string]: number[];
};

export type EnergyDoc = {
  id: string;
  annual: EnergyApiRecord[];
  daily: EnergyApiRecord[];
  seAlerts?: SolarEdgeAlerts;
  multiAnnual: EnergyApiRecord[];
  '#modified': number;
};

export class EnergyCalc {
  static daysBackEnergy(
    energy: Energy,
    days = 1,
    systemKwp: number | undefined = undefined
  ): number {
    const from = EnergyCalc.DaysBack(days);
    const to: number = Infinity;
    const sum = EnergyCalc.Sum(
      energy.annual
        .filter((e) => e.time >= from && e.time <= to)
        .map((e) => e.valueKwh)
    );
    return systemKwp ? sum / systemKwp : sum;
  }
  /**
   * Sum energy production.
   * If there are no values, return NaN - means there is no data.
   */
  static Sum(list: number[] = []): number {
    const relevantData = list.filter((v) => !isNaN(v));
    return relevantData.length
      ? relevantData.reduce(
          (previousValue, currentValue) => previousValue + currentValue,
          0
        )
      : NaN;
  }

  /**
   * Calc mean value for all the given data.
   * Ignore no data values (NaN) and 0 values (unless includeZero is checked).
   * If there is no relevant data, return NaN (0/0)
   */
  static Mean(list: number[] = [], includeZero: boolean = false) {
    const relevantData = list.filter(
      (v) => !isNaN(v) && (includeZero || v !== 0)
    );
    return EnergyCalc.Sum(relevantData) / relevantData.length;
  }

  /**
   * Get the midnight time of X days ago.
   * On server - use UTC midnight time
   * On Frontend - use local midnight time
   */
  static DaysBack(
    numOfDaysBack: number,
    from: number = Date.now(),
    fromServer?: boolean
  ) {
    // Convert to date only (UTC midnight)
    const date = new Date(from);
    if (fromServer) {
      date.setUTCHours(0, 0, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    // Set to X days ago
    date.setDate(date.getDate() - numOfDaysBack);
    return +date;
  }

  /**
   * Convert pairs of time-power (in kW) into pairs of time-energy (kWh) for every round hour
   * @param power
   */
  static FromPowerToEnergy(power: EnergyApiRecord[]): EnergyApiRecord[] {
    // Get all timestamps of the round hours
    const roundHours = new Set<number>();
    power.forEach((p) => {
      const d = new Date(p.time);
      d.setMinutes(0, 0, 0);
      roundHours.add(+d);
    });
    // For every hour, calc the mean value of the power
    const energy: EnergyApiRecord[] = [];
    roundHours.forEach((time) => {
      const relevantPower = power.filter(
        (p) => new Date(p.time).getHours() === new Date(time).getHours()
      );
      energy.push({
        time,
        valueKwh: this.Mean(
          relevantPower.map((p) => p.valueKwh),
          true
        ),
      });
    });
    return energy;
  }

  static MonthlyMean(data: EnergyApiRecord[]): EnergyApiRecord[] {
    const months = new Map<number, number>();
    data.forEach((e) => {
      const m = new Date(e.time).setDate(1);
      months.set(m, (months.get(m) || 0) + e.valueKwh);
    });
    return [...months.entries()].map((entry) => ({
      time: entry[0],
      valueKwh: entry[1],
    }));
  }

  static IsPartOfAverage(system: System): boolean {
    return !!system.KWP && !system.excludeFromAverage;
  }

  static GetMeanCalculation(
    envEnergies: { system: System; energy: Energy }[],
    from: number,
    to: number,
    daily: boolean = false
  ) {
    const grouped = new Map<number, number[]>();

    envEnergies.forEach(({ energy, system }) => {
      const list = daily ? energy?.daily : energy?.annual;
      if (!list) return;

      for (const e of list) {
        if (e.time >= from && e.time <= to) {
          const centeredTime = daily
            ? this.startOfHour(e.time)
            : this.startOfDay(e.time);
          const valueKwh = e.valueKwh / system.KWP;

          if (!grouped.has(centeredTime)) {
            grouped.set(centeredTime, []);
          }
          grouped.get(centeredTime)?.push(valueKwh);
        }
      }
    });

    return [...grouped.entries()]
      .map(([time, values]) => ({
        x: time,
        y: EnergyCalc.Mean(values),
      }))
      .sort((a, b) => a.x - b.x);
  }

  static GetMeanCalculationReport(
    envEnergies: { system: System; energy: Energy }[],
    from: number,
    to: number,
    daily: boolean = false
  ): EnergySample[] {
    const grouped = new Map<number, number[]>();

    envEnergies.forEach(({ energy, system }) => {
      const list = daily ? energy?.daily : energy?.annual;
      if (!list) return;

      for (const e of list) {
        if (e.time >= from && e.time <= to) {
          const centeredTime = daily
            ? this.startOfHour(e.time)
            : this.startOfDay(e.time);
          const valueKwh = e.valueKwh / system.KWP;

          if (!grouped.has(centeredTime)) {
            grouped.set(centeredTime, []);
          }
          grouped.get(centeredTime)?.push(valueKwh);
        }
      }
    });

    const data = [...grouped.entries()].map(([time, values]) => ({
      time,
      valueKwh: EnergyCalc.Mean(values),
    }));

    if (daily) {
      this.addDayEmptyData(data);
    }

    return data;
  }

  static addDayEmptyData(energy: { valueKwh?: number; time: number }[]) {
    if (energy.length) {
      const lastValueIdx = energy
        .slice()
        .reverse()
        .findIndex((e) => !!e.valueKwh);
      if (lastValueIdx > 0) {
        energy.splice(-lastValueIdx);
      }
      while (energy.length < 24) {
        const last = energy.slice(-1)[0];
        energy.push({
          time: last.time + DateUtil.HOUR,
          valueKwh: NaN,
        });
      }
    }
  }

  static startOfDay(time: number): number {
    const date = new Date(time);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  static startOfHour(time: number): number {
    const date = new Date(time);
    date.setMinutes(0, 0, 0);
    return date.getTime();
  }
}
