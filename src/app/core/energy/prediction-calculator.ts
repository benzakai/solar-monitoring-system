import { AppPrediction } from '../../domain/app';
import { System } from '../../domain/system';
import { EnergyCalc } from './energy-calculator';

export class PredictionCalculator {
  static calcDefaultValue(system: any, predictions: AppPrediction): number {
    let value = predictions.DEFAULT_ANNUAL;
    if (system.autoWash) {
      value = Math.round(value * (1 + predictions.AUTO_WASH_FACTOR));
    }
    if (system.isTracker) {
      return value * (1 + predictions.TRACKER_FACTOR);
    } else {
      const azimuth = Math.abs(system.azimuth || 0);
      const reduce = Math.floor(azimuth / 30) * predictions.AZIMUTH_FACTOR;
      return value * (1 - reduce);
    }
  }

  static calcMonthsDistribution(
    annual: number,
    isTaoz: boolean,
    predictions: AppPrediction,
    system?: any,
    isAutoWash?: boolean
  ): number[] {
    const dist = isTaoz
      ? predictions.MONTH_DIST_TAOZ
      : predictions.MONTH_DIST_NORMAL;
    let annualDis = isAutoWash
      ? dist.map((d, i) =>
          i >= 3 && i <= 8
            ? Math.round(d * annual)
            : Math.round(
                d * Math.floor(annual / (1 + predictions.AUTO_WASH_FACTOR))
              )
        )
      : dist.map((d) => Math.round(d * annual));
    return annualDis;
  }

  static calcSystemAge(
    systemStartTime: number,
    predictions: AppPrediction
  ): number {
    const today = new Date();
    const startTime = new Date(systemStartTime);
    const yearGap = today.getFullYear() - startTime.getFullYear();
    if (today.getMonth() < startTime.getMonth()) {
      return yearGap - 1;
    }
    if (
      today.getMonth() === startTime.getMonth() &&
      today.getDate() < startTime.getDate()
    ) {
      return yearGap - 1;
    }
    return yearGap;
  }

  static calcProductionByAge(
    production: number,
    age: number,
    predictions: AppPrediction
  ): number {
    return production * (1 - age * predictions.AGE_FACTOR);
  }

  static getPredictionCalculation(
    system: System,
    predictions: AppPrediction
  ): number[] {
    const annual =
      EnergyCalc.Sum(system.annualPredictionPerMonth) ||
      PredictionCalculator.calcDefaultValue(system, predictions);
    const age = PredictionCalculator.calcSystemAge(
      system.startTime ? new Date(system.startTime).getTime() : Date.now(),
      predictions
    );
    const calcedAnnualPrediction = PredictionCalculator.calcProductionByAge(
      annual,
      age,
      predictions
    );
    const isTaoz = !!system.taoz;
    return PredictionCalculator.calcMonthsDistribution(
      calcedAnnualPrediction,
      isTaoz,
      predictions
    );
  }
}
