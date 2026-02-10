import { System } from '../../../../domain/system';
import { Energy, EnergySample } from '../../../../domain/energy';
import { Malfunction } from '../../../../domain/malfunction';
import { SystemWash } from '../../../../domain/system-wash';
import { DateUtil } from '../../../../core/date/DateUtil';
import { EnergyCalc } from '../../../../core/energy/energy-calculator';
import { AppPrediction } from '../../../../domain/app';
import { PredictionCalculator } from '../../../../core/energy/prediction-calculator';
import { TaarifCalculator } from '../../../../core/energy/taarif-calculator';
import { formatDate } from '@angular/common';
import { Tarifs } from '../../../../domain/tarifs';

export const createReport = (
  system: System | undefined,
  systemEnergy: Energy | null,
  environmentMeanEnergy: EnergySample[],
  malfunctions: Malfunction[],
  malfunctionTypesTree: any,
  systemWash: SystemWash | null,
  date: Date,
  isAnnual: boolean,
  predictions: AppPrediction,
  tarifs: Tarifs,
  comment: string = ''
) => {
  if (!system) {
    return;
  }

  const reportComment = comment;
  if (isAnnual) {
    date.setUTCMonth(0);
  }
  date.setUTCDate(1);
  const KWP = system.KWP;
  const startDate = system.startTime ? +new Date(system.startTime) : null;

  const calcedAnnualPredictionPerMonth =
    PredictionCalculator.getPredictionCalculation(system, predictions);

  const prediction = calcedAnnualPredictionPerMonth.map((v) => v * KWP);

  let multiAnnualAll = systemEnergy
    ? [...(systemEnergy?.multiAnnual || [])]
    : [];

  if (systemEnergy) {
    systemEnergy.annual = systemEnergy.annual?.filter(
      (e) => !startDate || e.time >= startDate
    );
    systemEnergy.multiAnnual = systemEnergy.multiAnnual?.filter(
      (e) => !startDate || e.time >= startDate
    );
  }
  environmentMeanEnergy = environmentMeanEnergy.filter((e) => {
    return !startDate || e.time >= startDate;
  });

  let environmentAnnualMeanEnergy;
  let environmentMonthEnergy;

  if (isAnnual) {
    environmentAnnualMeanEnergy = EnergyCalc.Sum(
      environmentMeanEnergy.map((e) => e.valueKwh)
    );
  } else {
    environmentMonthEnergy = environmentMeanEnergy;
  }

  let energyInMonth: EnergySample[] | undefined;
  let monthProfit: number | undefined;

  if (!isAnnual) {
    energyInMonth =
      systemEnergy?.annual.filter((e) => {
        const d = new Date(e.time);
        return DateUtil.IsSameMonth(d, date);
      }) || [];

    monthProfit = TaarifCalculator.calcProfit(system, energyInMonth, tarifs);
  }

  const monthsForEnergy = DateUtil.GetUTCMonths(date);

  const annualEnergy = monthsForEnergy
    .filter((m) => {
      return isAnnual || m.getUTCMonth() <= date.getUTCMonth();
    })
    .map((d) => {
      return (
        systemEnergy?.multiAnnual?.find((e) =>
          DateUtil.IsSameMonthUTC(e.time, d)
        )?.valueKwh || 0
      );
    });

  const lastYear = new Date(date.getTime());
  lastYear.setFullYear(lastYear.getFullYear() - 1);

  const lastAnnualEnergy = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((d) => {
    return (
      multiAnnualAll.find((e) => {
        const dm = new Date(e.time).getUTCMonth();
        const dy = new Date(e.time).getUTCFullYear();
        const hit = dm === d && dy === lastYear.getFullYear();
        return hit;
      })?.valueKwh || 0
    );
  });

  const multiAnnual =
    getAnnualEnergy(systemEnergy?.multiAnnual || [])
      ?.sort((a, b) => a.time - b.time)
      .filter((e) => new Date(e.time).getUTCFullYear() <= date.getUTCFullYear())
      .slice(1) || [];

  // Calc profit for every month of the year
  const annualProfit = TaarifCalculator.calcProfit(
    system,
    annualEnergy.map((prod, m) => ({
      time: new Date().setMonth(m),
      valueKwh: prod,
    })),
    tarifs
  );

  const washDates =
    systemWash?.washes
      .filter((w) => w.done || w.washDone)
      .reverse()
      .map((w) => w.date)
      .filter((d) => DateUtil.IsSameYear(d, date)) || [];

  // All relevant malfunctions for the report's year
  const calcedMalfunctions = malfunctions
    .filter(
      (m) =>
        // Not marked with "not to report"
        !m.notToReport &&
        // All the reports that were opened until this year
        +new Date(m.openTime) <= DateUtil.EndOfYear(date) &&
        // Not closed yet, or were closed during or after this month/year
        (!m.closeTime || +new Date(m.closeTime) >= DateUtil.StartOfYear(date))
    )
    .map((m) => ({
      openTime: m.openTime,
      // Hide future close time
      closeTime:
        (+new Date(m.closeTime || 0) <=
        (isAnnual ? DateUtil.EndOfYear(date) : DateUtil.EndOfMonth(date))
          ? m.closeTime
          : undefined) || null,
      type: [malfunctionTypeString(m, malfunctionTypesTree), ''],
      handler: m.handler,
      status: m.status,
      reportText: m.reportText,
    }));

  return {
    reportComment,
    date: date.setUTCHours(0, 0, 0, 0),
    systemId: system.id,
    client: system.client!,
    systemName: system.name,
    systemType: system.type,
    KWP,
    ...(startDate !== null ? { startDate } : {}),
    prediction,
    ...(environmentAnnualMeanEnergy !== undefined
      ? { environmentAnnualMeanEnergy }
      : {}),
    ...(environmentMonthEnergy !== undefined ? { environmentMonthEnergy } : {}),
    ...(energyInMonth !== undefined ? { energyInMonth } : {}),
    ...(monthProfit !== undefined ? { monthProfit } : {}),
    annualEnergy,
    lastAnnualEnergy,
    multiAnnual,
    annualProfit,
    washDates,
    isAnnual: Boolean(isAnnual),
    malfunctions: calcedMalfunctions,
  };
};

export const createReportDataId = (id: string, date: Date, annual: boolean) =>
  `${date.getUTCFullYear()}_${annual ? -1 : date.getUTCMonth()}_${id}`;

const getAnnualEnergy: (e: EnergySample[]) => EnergySample[] = (
  multiAnnual: EnergySample[]
) => {
  const years = new Map<number, number>();
  multiAnnual.forEach((e) => {
    const year = new Date(e.time).getFullYear();
    const totalYear = years.get(year) || 0;
    years.set(year, totalYear + e.valueKwh);
  });
  return [...years.entries()].map(([year, e]) => ({
    valueKwh: e,
    time: +new Date(year, 0),
  }));
};

const malfunctionTypeString = (malfunction: Malfunction, tree: any) => {
  const main = malfunction?.type?.[0] || '';
  const sub = malfunction?.type?.[1] || '';

  const mainStr = (main && tree[main] && tree[main].text) || main;
  const subStr = (main && sub && tree[main]?.children?.[sub]?.text) || sub;

  let str = mainStr;
  if (subStr && subStr !== sub) {
    str += ' / ' + subStr;
  }
  return str;
};

export const reportFileName = (
  clientName: string,
  date: number,
  isAnnual: boolean
) => {
  const text = isAnnual ? 'דוח ניטור שנת' : 'דוח ניטור חודש';
  return `${text} ${formatDate(date, isAnnual ? 'yyyy' : 'MMMM', 'he')} - ${clientName}`;
};

export const alignDateToReport = (date: Date) => {
  const newDate = new Date(date);
  newDate.setUTCDate(1);
  newDate.setUTCFullYear(date.getFullYear());
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
};
