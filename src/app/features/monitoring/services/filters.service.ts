import {Injectable} from '@angular/core';
import {collection, Firestore, getDocs, limit, orderBy, query} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FiltersService {

  constructor(private firestore: Firestore) {}

  getMinMaxKwp(): Observable<{ min: number, max: number }> {
    const dataCollection = collection(this.firestore, 'systems');
    const minQuery = query(dataCollection, orderBy('KWP', 'asc'), limit(1));
    const maxQuery = query(dataCollection, orderBy('KWP', 'desc'), limit(1));

    const minPromise = getDocs(minQuery).then(minSnapshot => minSnapshot.docs[0]?.data()['KWP']);
    const maxPromise = getDocs(maxQuery).then(maxSnapshot => maxSnapshot.docs[0]?.data()['KWP']);

    return from(Promise.all([minPromise, maxPromise]).then(([minValue, maxValue]) => ({ min: minValue, max: maxValue })));
  }

}
