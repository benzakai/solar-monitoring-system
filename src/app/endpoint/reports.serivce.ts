import { inject, Injectable } from '@angular/core';
import {
  collection,
  Firestore,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  onSnapshot,
  QuerySnapshot,
  Query,
  DocumentData,
} from '@angular/fire/firestore';
import { from, map, Observable, of, switchMap } from 'rxjs';
import { ReportData } from '../domain/report';

const alignDateToReport = (date: Date) => {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'reportsData');

  public getReportsFromMonth(
    year: number,
    month: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | number
  ): Observable<ReportData[]> {
    const startDate = alignDateToReport(new Date(Date.UTC(year, month, 1)));
    const endDate = alignDateToReport(new Date(Date.UTC(year, month + 1, 1)));
    endDate.setHours(endDate.getUTCHours() - 1);
    const q = query(
      this.collection,
      where('isAnnual', '==', false),
      where('date', '>=', startDate.getTime()),
      where('date', '<=', endDate.getTime())
    );

    return this.getSnap(q).pipe(
      switchMap((snapshot) => {
        let state = (snapshot || []).reduce(
          (acc, report) => Object.assign(acc, { [report.id]: report }),
          {} as Record<string, ReportData>
        );
        return this.getChanges(q).pipe(
          map((changes) => {
            (changes.added || []).forEach(
              (report: ReportData) => (state[report.id] = report)
            );
            (changes.modified || []).forEach(
              (report: ReportData) => (state[report.id] = report)
            );
            (changes.removed || []).forEach(
              (report: ReportData) => delete state[report.id]
            );

            return Object.keys(state).map((id) => state[id]);
          })
        );
      })
    );
  }

  public getForClientAndTime(
    client: string,
    time: number,
    isAnnual: boolean = false
  ) {
    const q = query(
      this.collection,
      where('isAnnual', '==', isAnnual),
      where('date', '==', time),
      where('client.id', '==', client)
    );

    return this.getSnap(q);
  }

  public getForClientFromYearStart(
    clientId: string,
    year: number = new Date().getUTCFullYear(),
    isAnnual: boolean = false
  ): Observable<ReportData[]> {
    const startDate = alignDateToReport(new Date(Date.UTC(year, 0, 1)));
    const endDate = alignDateToReport(new Date(Date.UTC(year + 1, 0, 1)));
    endDate.setHours(endDate.getUTCHours() - 1);

    const q = query(
      this.collection,
      where('isAnnual', '==', isAnnual),
      where('client.id', '==', clientId),
      where('date', '>=', startDate.getTime()),
      where('date', '<=', endDate.getTime())
    );

    return this.getSnap(q).pipe(
      switchMap((snapshot) => {
        let state = (snapshot || []).reduce(
          (acc, report) => Object.assign(acc, { [report.id]: report }),
          {} as Record<string, ReportData>
        );
        return this.getChanges(q).pipe(
          map((changes) => {
            (changes.added || []).forEach(
              (report: ReportData) => (state[report.id] = report)
            );
            (changes.modified || []).forEach(
              (report: ReportData) => (state[report.id] = report)
            );
            (changes.removed || []).forEach(
              (report: ReportData) => delete state[report.id]
            );

            return Object.keys(state)
              .map((id) => state[id])
              .sort((a, b) => (b.date as number) - (a.date as number));
          })
        );
      })
    );
  }

  public setDocument(id: string, data: any) {
    const docRef = doc(this.collection, id);
    return from(setDoc(docRef, data));
  }

  private getSnap(
    query: Query<DocumentData, DocumentData>
  ): Observable<ReportData[]> {
    return from(getDocs(query)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return {
            id: doc.id,
            ...data,
          } as ReportData;
        })
      )
    );
  }

  private getChanges(
    query: Query
  ): Observable<Record<'added' | 'modified' | 'removed', ReportData[]>> {
    return new Observable<
      Record<'added' | 'modified' | 'removed', ReportData[]>
    >((observer) => {
      return onSnapshot(query, (snapshot: QuerySnapshot) => {
        const changes: Record<'added' | 'modified' | 'removed', ReportData[]> =
          {
            added: [],
            modified: [],
            removed: [],
          };

        snapshot.docChanges().map((doc) => {
          changes[doc.type].push({
            id: doc.doc.id,
            ...doc.doc.data(),
          } as ReportData);
        });

        observer.next(changes);
      });
    });
  }
}
