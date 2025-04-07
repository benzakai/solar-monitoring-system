import { inject, Injectable } from '@angular/core';
import {
  collection,
  Firestore,
  query,
  where,
  limit,
  orderBy,
  getDocs,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Email } from '../domain/email';
import {} from 'firebase/firestore';

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
}
