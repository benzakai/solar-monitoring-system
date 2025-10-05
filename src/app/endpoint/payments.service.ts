import { inject, Injectable } from '@angular/core';
import { Firestore, collection, onSnapshot } from '@angular/fire/firestore';
import { AnyPayment } from '../domain/payment';
import { Observable, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'payments');

  getAllPayments(): Observable<AnyPayment[]> {
    return new Observable<AnyPayment[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        this.collection,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            ...(doc.data() as AnyPayment),
            id: doc.id,
          }));
          subscriber.next(list);
        },
        (error) => subscriber.error(error)
      );

      return () => unsubscribe();
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }
}


