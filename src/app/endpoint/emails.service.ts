import { inject, Injectable } from '@angular/core';
import {
  collection,
  Firestore,
  query,
  where,
  limit,
  orderBy,
  getDocs,
  doc,
  writeBatch,
  getFirestore,
  Query,
  DocumentData,
  onSnapshot,
  QuerySnapshot,
} from '@angular/fire/firestore';
import { from, map, Observable, switchMap } from 'rxjs';
import { Email } from '../domain/email';
import {} from 'firebase/firestore';
import { ReportData } from '../domain/report';

const alignDateToReport = (date: Date) => {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

@Injectable({
  providedIn: 'root',
})
export class EmailsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'emails');

  public getNewestEmails(limitNumber: number = 100): Observable<Email[]> {
    const q = query(
      this.collection,
      where('template.name', 'in', ['report', 'annualReport']),
      orderBy('delivery.startTime', 'desc'),
      limit(limitNumber)
    );

    return new Observable<Email[]>((observer) => {
      (async () => {
        try {
          const snapshot = await getDocs(q);
          const emails = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
            } as Email;
          });
          observer.next(emails);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  public getEmailsFromMonth(
    year: number,
    month: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | number
  ): Observable<Email[]> {
    console.log(new Date(Date.UTC(year, month, 1)).toISOString());
    console.log(new Date(Date.UTC(year, month + 1, 0)).toISOString());

    const startDate = alignDateToReport(new Date(Date.UTC(year, month, 1)));
    const endDate = alignDateToReport(new Date(Date.UTC(year, month + 1, 1)));
    endDate.setHours(endDate.getUTCHours() - 1);

    const q = query(
      this.collection,
      where('template.name', 'in', ['report', 'annualReport']),
      where('template.data.date', '>=', startDate.getTime()),
      where('template.data.date', '<=', endDate.getTime())
    );

    return this.getSnap(q).pipe(
      switchMap((snapshot) => {
        let state = (snapshot || []).reduce(
          (acc, email) => Object.assign(acc, { [email.id]: email }),
          {} as Record<string, Email & { id: string }>
        );
        return this.getChanges(q).pipe(
          map((changes) => {
            (changes.added || []).forEach((e) => (state[e.id] = e));
            (changes.modified || []).forEach((e) => (state[e.id] = e));
            (changes.removed || []).forEach((e) => delete state[e.id]);

            return Object.keys(state).map((id) => state[id]);
          })
        );
      })
    );

    return new Observable<Email[]>((observer) => {
      (async () => {
        try {
          const snapshot = await getDocs(q);
          const emails = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
            } as Email;
          });
          observer.next(emails);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  saveDocsToSend(docs: any[] = []) {
    const firestore = getFirestore();
    const batch = writeBatch(firestore);
    const batchId = doc(this.collection).id;

    docs.forEach((docData, idx) => {
      const docId = batchId + '_' + idx;
      console.log(docId);
      const docRef = doc(this.collection, docId);
      docData.batchId = batchId;
      batch.set(docRef, docData);
    });

    return from(batch.commit());
  }

  private getSnap(
    query: Query<DocumentData, DocumentData>
  ): Observable<(Email & { id: string })[]> {
    return from(getDocs(query)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data() as Record<string, unknown>;
          return {
            id: doc.id,
            ...data,
          } as Email & { id: string };
        })
      )
    );
  }

  private getChanges(
    query: Query
  ): Observable<
    Record<'added' | 'modified' | 'removed', (Email & { id: string })[]>
  > {
    return new Observable<
      Record<'added' | 'modified' | 'removed', (Email & { id: string })[]>
    >((observer) => {
      return onSnapshot(query, (snapshot: QuerySnapshot) => {
        const changes: Record<
          'added' | 'modified' | 'removed',
          (Email & { id: string })[]
        > = {
          added: [],
          modified: [],
          removed: [],
        };

        snapshot.docChanges().map((doc) => {
          changes[doc.type].push({
            id: doc.doc.id,
            ...doc.doc.data(),
          } as Email & { id: string });
        });

        observer.next(changes);
      });
    });
  }
}
