import { EnergySample } from '../../../../domain/energy';
import { Malfunction } from '../../../../domain/malfunction';
import { DateUtil } from '../../../../core/date/DateUtil';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';

export interface ContactView {
  id: string;
  name: string;
}

export interface SystemReportDoc {
  systemId: string;
  date: number;
  isAnnual: boolean;
  client: ContactView;
  systemName: string;
  systemType: string;
  KWP: number;
  startDate: number | null;
  // Prediction of each month
  prediction: number[];
  // Production each day of month
  energyInMonth?: EnergySample[];
  // Environment mean energy for each day of the month
  environmentMonthEnergy?: EnergySample[];
  // Environment mean energy for the whole year
  environmentAnnualMeanEnergy?: number;
  // Production of each month
  annualEnergy: number[];
  lastAnnualEnergy: number[];
  multiAnnual: EnergySample[];
  // Profits
  monthProfit?: number;
  annualProfit: number;
  // Short malfunctions data
  malfunctions: Partial<Malfunction>[];
  // Dates of washes
  washDates: number[];
  // Ex: "Happy new year"
  reportComment: string;
}

export function createSystemReportData(json: SystemReportDoc) {
  const totalMonth =
    EnergyCalc.Sum(json.energyInMonth?.map((e) => e.valueKwh)) || 0;
  const environmentMonthEnergy =
    json.environmentMonthEnergy?.map((e) => {
      e.valueKwh *= json.KWP;
      return e;
    }) || [];
  const totalYear = EnergyCalc.Sum(json.annualEnergy) || 0;
  const multiAnnualMean = EnergyCalc.Mean(
    json.multiAnnual?.map((e) => e.valueKwh)
  );
  const annualMalfunctions = json.malfunctions.sort(
    (a, b) => +new Date(a.openTime || 0) - +new Date(b.openTime || 0)
  );
  const malfunctions = annualMalfunctions.filter(
    (m) =>
      +new Date(m.openTime!) <= DateUtil.EndOfMonth(json.date) &&
      (!m.closeTime || +new Date(m.closeTime) >= json.date)
  );

  return {
    systemId: json.systemId,
    date: json.date,
    isAnnual: json.isAnnual,
    clientName: json.client.name,
    systemName: json.systemName,
    systemType: json.systemType,
    KWP: json.KWP,
    monthProduction: json.energyInMonth,
    monthPrediction: json.prediction[new Date(json.date).getMonth()],
    totalMonth: totalMonth,
    totalMonthNorm: totalMonth / json.KWP,
    totalMonthLastYear: json.lastAnnualEnergy[new Date(json.date).getMonth()],
    environmentMonthEnergy: environmentMonthEnergy,
    monthEnvironmentRatio:
      totalMonth /
      EnergyCalc.Sum(environmentMonthEnergy.map((e) => e.valueKwh)),
    totalYear: totalYear,
    totalLastYear: EnergyCalc.Sum(json.lastAnnualEnergy) || undefined,
    multiAnnual: json.multiAnnual,
    multiAnnualMean: multiAnnualMean,
    annualEnvironmentRatio:
      totalYear / json.KWP / (json.environmentAnnualMeanEnergy || 0),
    monthProfit: json.monthProfit,
    annualProfit: json.annualProfit,
    productionPerMonth: json.annualEnergy,
    productionPerMonthLastYear: json.lastAnnualEnergy,
    predictionPerMonth: json.prediction,
    productionPredictionRatio:
      totalYear /
      EnergyCalc.Sum(
        json.prediction
          .filter(
            (v, i) => json.isAnnual || i <= new Date(json.date).getMonth()
          )
          .map((v, i) => {
            const startDate = new Date(json.startDate || 0);
            if (startDate.getFullYear() === new Date(json.date).getFullYear()) {
              if (i < startDate.getMonth()) {
                return 0;
              }
              if (i === startDate.getMonth()) {
                const daysInMonth = DateUtil.DaysInMonth(
                  startDate.getMonth(),
                  startDate.getFullYear()
                );
                return (v * (daysInMonth - startDate.getDate())) / daysInMonth;
              }
            }
            return v;
          })
      ),
    annualMalfunctions: annualMalfunctions,
    malfunctions: malfunctions,
    malfunctionsStartDates: malfunctions.map((m) => +new Date(m.openTime!)),
    malfunctionsEndDates: malfunctions.map((m) => +new Date(m.closeTime!)),
    washesDates: json.washDates,
    comment: json.reportComment,
  };
}
