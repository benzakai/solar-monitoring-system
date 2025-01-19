import { inject, Injectable } from '@angular/core';
import { collection, doc, Firestore, setDoc } from '@angular/fire/firestore';
import {filter, firstValueFrom, from, map, Observable, startWith, switchMap} from 'rxjs';
import {Malfunction, MalfunctionActionType} from '../domain/malfunction';
import {AngularFireAuth} from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root',
})
export class MalfunctionsService {
  private firestore = inject(Firestore);
  private auth = inject(AngularFireAuth);

  private collection = collection(this.firestore, 'malfunctions');

  createMalfunction(malfunction: Omit<Malfunction, 'id' | 'log' | '#modified'>): Observable<void> {
    return this.generateLogEntry(malfunction).pipe(
      switchMap((logEntry) => {
        const docRef = doc(this.collection);
        return from(setDoc(docRef, {
          id: docRef.id,
          ...malfunction,
          ...logEntry,
        }));
      })
    )
  }

  private generateLogEntry(malfunction: Partial<Malfunction>, action?: MalfunctionActionType): Observable<Pick<Malfunction, '#modified' | 'log'>> {
    const now = new Date();
    return from(this.auth.currentUser).pipe(
      filter(user => !!user),
      map(user => ({
        log: [{
          action: action || MalfunctionActionType.OPEN,
          by: user?.uid,
          text: '',
          time: now.getTime(),
        }, ...(malfunction?.log || [])],
        '#modified': now.getTime(),
      }))
    );
  }
}
