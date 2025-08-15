import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc } from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppMetadataService {
  private firestore = inject(Firestore);
  private appCollection = collection(this.firestore, 'app');

  clientTypes$(): Observable<Record<string, string>> {
    const ref = doc(this.appCollection, 'clientTypes');
    return from(getDoc(ref)).pipe(
      map((snapshot) => (snapshot.exists() ? ((snapshot.data() as any) || {}) : {}))
    );
  }
}


