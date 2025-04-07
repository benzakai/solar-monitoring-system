import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { SystemWash } from '../domain/system-wash';
import { DateUtil } from '../core/date/DateUtil';
import { from, map, Observable } from 'rxjs';
import { System } from '../domain/system';

@Injectable({
  providedIn: 'root',
})
export class WashesService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'washes');

  public getBySystemId(
    id: string,
    allYears?: boolean
  ): Observable<SystemWash | null> {
    const docRef = doc(this.collection, id);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          const systemWash = {
            id: snapshot.id,
            ...snapshot.data(),
          } as SystemWash;
          if (!allYears) {
            return this.filterCurrentYearWashes(systemWash);
          } else {
            return systemWash;
          }
        } else {
          return null;
        }
      })
    );
  }

  private filterCurrentYearWashes(systemWash: SystemWash): SystemWash {
    const currentYear = systemWash.washes.filter((w) =>
      DateUtil.IsSameYear(w.date, Date.now())
    );
    return { ...systemWash, washes: currentYear };
  }
}
