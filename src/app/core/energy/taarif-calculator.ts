import { EnergySample } from '../../domain/energy';
import { Tarif, Tarifs } from '../../domain/tarifs';

const summerMonths = [6, 7]; // July - August
const winterMonths = [11, 0, 1]; // December - February

export interface TaozPeriods {
  summer: number;
  winter: number;
  between: number;
}

export interface TaarifConstants {
  highTaoz: TaozPeriods;
  lowTaoz: TaozPeriods;
}

export class TaarifCalculator {
  static Constants: TaarifConstants;

  // Get the taoz taarif according to the given month
  static CalcTaarifForTaoz(tarif: Tarif, date = Date.now()): number {
    const month = new Date(date).getMonth();
    if (summerMonths.includes(month)) {
      return tarif.summer;
    }
    if (winterMonths.includes(month)) {
      return tarif.winter;
    }
    return tarif.between;
  }

  // Get the system taarif according to the given date
  static CalcSystemTaarif(
    system: any,
    date = Date.now(),
    tarifs: Tarifs
  ): number {
    switch (system.taoz) {
      case 'high':
        return this.CalcTaarifForTaoz(tarifs.highTaoz, date);
      case 'low':
        return this.CalcTaarifForTaoz(tarifs.lowTaoz, date);
      default:
        return system.regulation;
    }
  }

  // Calc the system profit according to the given production
  static calcProfit(
    system: any,
    energy: EnergySample[],
    tarifs: Tarifs
  ): number {
    return energy
      .map((e) => this.CalcSystemTaarif(system, e.time, tarifs) * e.valueKwh)
      .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
  }
}
