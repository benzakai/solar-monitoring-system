import { inject, Injectable } from '@angular/core';
import { collection, Firestore, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { getDocs } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class EnergyErrorsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'energyErrors');

  getOf(documentId: string): Observable<any> {
    const currentTime = new Date().getTime();

    const q = query(this.collection, where('__name__', '==', documentId));

    return new Observable((observer) => {
      getDocs(q)
        .then((querySnapshot) => {
          if (!querySnapshot.empty) {
            const records = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            observer.next(records[0]);
          } else {
            observer.next(null);
          }
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }
}
