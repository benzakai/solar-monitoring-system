import {inject, Injectable} from '@angular/core';
import {collection, collectionData, Firestore} from '@angular/fire/firestore';
import {map, Observable} from 'rxjs';

export interface SystemWashInfo {
    systemId: string;
    washType: string;
}

@Injectable({
    providedIn: 'root'
})
export class SystemsWashService {
    private firestore: Firestore = inject(Firestore);

    getSystemsWashInfo(): Observable<SystemWashInfo[]> {
        const systemsCollection = collection(this.firestore, 'systems');
        return (collectionData(systemsCollection, {idField: 'systemId'}) as Observable<any[]>)
          .pipe(
            map(systems => systems.map(s => ({ systemId: s.systemId, washType: s.washType } as SystemWashInfo)))
          );
    }
} 