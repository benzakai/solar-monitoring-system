import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest, filter,
  from,
  map,
  Observable,
  of, startWith,
  switchMap, tap,
} from 'rxjs';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  getCountFromServer,
  getDocs,
} from '@angular/fire/firestore';
import { FiltersControlService } from './services/filters-control.service';
const startOfYearTime = new Date(new Date().getFullYear(), 0, 1).getTime();
const startOfMonthTime = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
).getTime();

function getDateDaysBefore(days: number): number {
  const now = new Date();
  now.setDate(now.getDate() - days);
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function getStartOfYesterday(): number {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

function daysSinceStartOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffInTime = date.getTime() - startOfYear.getTime();
  const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
  return diffInDays;
}

const daysSinceStartOfYearsNum = daysSinceStartOfYear(new Date()) - 1;

function daysSinceStartOfMonth(date: Date): number {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const diffInTime = date.getTime() - startOfMonth.getTime();
  const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
  return diffInDays;
}

const daysSinceStartOfMonthNum = daysSinceStartOfMonth(new Date()) - 1;

function getStartOfPreviousMonth(): number {
  const now = new Date();
  const startOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
  startOfPreviousMonth.setHours(0, 0, 0, 0);
  return startOfPreviousMonth.getTime();
}

const startOfPreviousMonth = getStartOfPreviousMonth();

const startOfYesterday = getStartOfYesterday();

const sevenDaysAgo = getDateDaysBefore(7);
const threeDaysAgo = getDateDaysBefore(3);
const thirtyDaysAgo = getDateDaysBefore(30);

type KwhInTime = {
  time: number;
  valueKwh: number;
};

type Sys = {
  KWP: number;
  id: string;
  location: {
    relatedSystems: string[];
  };
};

type Energy = {
  daily: KwhInTime[];
  annual: KwhInTime[];
  id: string;
  multiAnnual: KwhInTime[];
};

function sum(numbers: number[]): number {
  return numbers.reduce((acc, val) => acc + val, 0);
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function sumTimes(collection: KwhInTime[], minTime: number = 0): number {
  const timeCollection = collection.filter((item) => item.time >= minTime);
  return timeCollection.reduce((acc, val) => acc + val.valueKwh, 0);
}

function findTime(collection: KwhInTime[], time: number): number {
  const timeCollection = collection.filter((item) => item.time === time);
  return timeCollection.reduce((acc, val) => acc + val.valueKwh, 0);
}

@Injectable()
export class DataService {
  public loading = new BehaviorSubject(false);
  public count = new BehaviorSubject(0);
  filtersControl = inject(FiltersControlService);
  public systemsLoaded = [];
  lastVisibleDocument: any = null;

  constructor(private firestore: Firestore) {}

  reset() {
    this.count.next(0);
  }

  getQuery(pageSize: number = 10, pivot: any, action?: 'next' | 'prev') {
    const dataCollection = collection(this.firestore, 'systems');
    const initKwp = this.filtersControl.kwpControl.value

    return combineLatest([
      of(pivot),
      this.filtersControl.kwpControl.valueChanges.pipe(startWith(initKwp), filter(Boolean), tap(() => this.reset())),
    ]).pipe(
      switchMap(([start, [min, max]]) => {
        const q = query(
          dataCollection,
          where('isActive', '==', true),
          where('KWP', '>=', min),
          where('KWP', '<=', max)
        );

        if (start) {
          const q1 = query(
            dataCollection,
            where('isActive', '==', true),
            where('KWP', '>=', min),
            where('KWP', '<=', max),
            orderBy('startTime'),
            startAfter(this.lastVisibleDocument),
            limit(pageSize)
          );
          return of(q1);
        } else {
          this.count.next(0);
          return of(q).pipe(
            switchMap((a) => {
              return from(getCountFromServer(a)).pipe(
                map((c) => {
                  const count = c.data().count;
                  this.count.next(count || 0);
                  return query(
                    dataCollection,
                    where('isActive', '==', true),
                    where('KWP', '>=', min),
                    where('KWP', '<=', max),
                    orderBy('startTime'),
                    limit(pageSize)
                  );
                })
              );
            })
          );
        }
      })
    );
  }

  getSystems(
    pageSize: number = 10,
    action?: 'next' | 'prev'
  ): Observable<Sys[]> {
    return this.getQuery(pageSize, action).pipe(
      switchMap((paginatedQuery) =>
        from(getDocs(paginatedQuery)).pipe(
          map((querySnapshot) => {
            const data = querySnapshot.docs.map((doc) => ({
              ...(doc.data() as Sys),
              id: doc.id,
            }));
            this.lastVisibleDocument =
              querySnapshot.docs[querySnapshot.docs.length - 1];
            return data || [];
          })
        )
      )
    );
  }

  getEnergyByIds(ids: string[]): Observable<Energy[]> {
    const energyCollection = collection(this.firestore, 'energy');
    const idChunks = chunkArray(ids, 30);
    const queries = idChunks.map((chunk) => {
      const energyQuery = query(energyCollection, where('id', 'in', chunk));
      return from(getDocs(energyQuery)).pipe(
        map((querySnapshot) =>
          querySnapshot.docs.map((doc) => ({
            ...(doc.data() as Energy),
            id: doc.id,
          }))
        )
      );
    });
    return combineLatest(queries).pipe(map((results) => results.flat()));
  }

  getSystemsData(
    pageSize: number = 10,
    action?: 'next' | 'prev'
  ): Observable<any[]> {
    return this.getSystems(pageSize, action).pipe(
      switchMap((systems) => {
        const all = systems.flatMap(
          (system) => system?.location?.relatedSystems || []
        );
        const relatedSystemIds = Array.from(new Set(all));
        return this.getEnergyByIds(relatedSystemIds).pipe(
          map((energy) => {
            const energyMap = new Map(energy.map((e) => [e.id, e]));
            return systems.map((system) => {
              const systemDailyNominalPower = system.KWP * 1000;
              const systemWeeklyNominalPower = systemDailyNominalPower * 6;
              const systemMonthlyNominalPower = systemDailyNominalPower * 29;
              const systemNominalPowerSinceStartOfYear =
                systemDailyNominalPower * daysSinceStartOfYearsNum;
              const systemNominalPowerSinceStartOfMonth =
                systemDailyNominalPower * daysSinceStartOfMonthNum;

              const relatedSystems = system?.location?.relatedSystems
                ? system.location.relatedSystems
                    .map((id) => energyMap.get(id))
                    .filter((e) => e)
                : null;
              let aggregation = {};
              if (relatedSystems) {
                const count = relatedSystems.length;

                const today = relatedSystems.map((subsystem) =>
                  subsystem?.daily ? sumTimes(subsystem.daily) : 0
                );
                const todaySum = (sum(today) / systemDailyNominalPower) * 100;

                const weekly = relatedSystems.map((subsystem) =>
                  subsystem?.annual
                    ? sumTimes(subsystem.annual, sevenDaysAgo)
                    : 0
                );
                const weeklySum =
                  (sum([...weekly]) / systemWeeklyNominalPower) * 100;

                const monthly = relatedSystems.map((subsystem) =>
                  subsystem?.annual
                    ? sumTimes(subsystem.annual, thirtyDaysAgo)
                    : 0
                );
                const monthlySum =
                  (sum([...monthly]) / systemMonthlyNominalPower) * 100;

                const startOfMonth = relatedSystems.map((subsystem) =>
                  subsystem?.annual
                    ? sumTimes(subsystem.annual, startOfMonthTime)
                    : 0
                );
                const startOfMonthSum =
                  (sum([...startOfMonth]) /
                    systemNominalPowerSinceStartOfMonth) *
                  100;

                const threeDays = relatedSystems.map((subsystem) =>
                  subsystem?.annual
                    ? sumTimes(subsystem.annual, threeDaysAgo)
                    : 0
                );
                const threeDaysSum = sum([...threeDays]);

                const startOfYear = relatedSystems.map((subsystem) =>
                  subsystem?.annual
                    ? sumTimes(subsystem.annual, startOfYearTime)
                    : 0
                );
                const startOfYearSum =
                  (sum([...startOfYear, sum([...startOfMonth])]) /
                    systemNominalPowerSinceStartOfYear) *
                  100;

                const yesterday = relatedSystems.map((subsystem) =>
                  subsystem?.daily
                    ? findTime(subsystem.daily, startOfYesterday)
                    : 0
                );
                const yesterdaySum = sum(yesterday);

                const lastMonth = relatedSystems.map((subsystem) =>
                  subsystem?.multiAnnual
                    ? findTime(
                        subsystem.multiAnnual || [],
                        startOfPreviousMonth
                      )
                    : 0
                );
                const lastMonthSum = sum(lastMonth);

                aggregation = {
                  todaySum,
                  weeklySum,
                  monthlySum,
                  startOfMonthSum,
                  threeDaysSum,
                  startOfYearSum,
                  yesterdaySum,
                  lastMonthSum,
                };
              }

              this.loading.next(false);

              return {
                ...system,
                aggregation,
              };
            });
          })
        );
      })
    );
  }

  // add() {
  //   const data = {
  //     clearedAlerts: Math.ceil(Math.random() * 10),
  //     communication: false,
  //     kWp: Math.ceil(Math.random() * 1000),
  //     lastMonth: Math.ceil(Math.random() * 10),
  //     monthly: Math.ceil(Math.random() * 10),
  //     notes: Math.ceil(Math.random() * 10) > 5,
  //     openAlerts: Math.ceil(Math.random() * 10),
  //     portal: `Protal ${Math.ceil(Math.random() * 100)}`,
  //     startOfMonth:  Math.ceil(Math.random() * 10),
  //     startOfYear: Math.ceil(Math.random() * 10),
  //     systemName:  `System ${Math.ceil(Math.random() * 100)}`,
  //     tested: Math.ceil(Math.random() * 10) > 5,
  //     threeDays: Math.ceil(Math.random() * 10),
  //     today: Math.ceil(Math.random() * 10),
  //     weekly: Math.ceil(Math.random() * 10),
  //     yesterday: Math.ceil(Math.random() * 10)
  //   };
  //
  //   addDoc(collection(this.firestore, "systems"), data);
  // }
}
