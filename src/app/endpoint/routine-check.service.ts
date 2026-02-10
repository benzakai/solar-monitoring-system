import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { filter, first, from, of, switchMap, take, tap } from 'rxjs';
import { DateUtil } from '../core/date/DateUtil';
import { RoutineCheck } from '../domain/checks';
import { CurrentUserService } from '../features/people/services/current-user.service';

@Injectable({
  providedIn: 'root',
})
export class RoutineCheckService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'routine-checks');
  private auth = inject(AngularFireAuth);
  private currentUserService = inject(CurrentUserService);

  addCheck(id: string) {
    return this.currentUserService.user.pipe(
      filter(Boolean),
      first(),
      switchMap((user) => {
        const docRef = doc(this.collection, id);
        const checkObject = {
          uid: user.uid,
          date: new Date().toJSON(),
        };

        return from(getDoc(docRef)).pipe(
          switchMap((docSnap) => {
            if (docSnap.exists()) {
              const currentData = docSnap.data() as RoutineCheck;

              const checks = currentData.checks;
              checks.unshift(checkObject);
              const lastMonthIdx = checks.findIndex(
                (c) => !DateUtil.IsSameMonth(c.date, Date.now())
              );
              if (lastMonthIdx >= 0) {
                checks.splice(lastMonthIdx);
              }

              return from(
                setDoc(
                  docRef,
                  {
                    checks,
                  },
                  { merge: true }
                )
              );
            } else {
              return from(
                setDoc(
                  docRef,
                  {
                    checks: [checkObject],
                    systemId: id,
                  },
                  { merge: true }
                )
              );
            }
          })
        );
      })
    );
  }

  removeLastCheck(id: string) {
    return this.currentUserService.user.pipe(
      filter(Boolean),
      first(),
      switchMap((user) => {
        const docRef = doc(this.collection, id);

        return from(getDoc(docRef)).pipe(
          switchMap((docSnap) => {
            if (docSnap.exists()) {
              const currentData = docSnap.data() as RoutineCheck;

              const checks = currentData.checks;
              const last = checks[0] || {};
              if (last && DateUtil.IsToday(last.date)) {
                checks.shift();
              }

              return from(
                setDoc(
                  docRef,
                  {
                    checks,
                  },
                  { merge: true }
                )
              );
            } else {
              return of(null);
            }
          })
        );
      })
    );
  }
}
