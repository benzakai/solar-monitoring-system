import { inject, Injectable } from '@angular/core';
import {
  collection,
  documentId,
  Firestore,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';

/** Matches `recursiveEnergy` in golan-solar `functions/.../energy.ts` */
const APP_TIME_ZONE = 'Asia/Jerusalem';

export type EnergyFailureEntry = {
  runId: string;
  api: string;
  error: { code?: string; status?: string; message?: string };
};

export type EnergyFailedSystem = {
  systemId: string;
  api: string;
  error: { code?: string; status?: string; message?: string };
};

type FailedSystemPayload = EnergyFailedSystem;

export type EnergyRunDoc = {
  id: string;
  failedSystems: EnergyFailedSystem[];
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

@Injectable({
  providedIn: 'root',
})
export class EnergyErrorsService {
  private firestore = inject(Firestore);
  private energyErrorsRef = collection(this.firestore, 'energyErrors');

  getOf(docId: string): Observable<Record<string, unknown> | null> {
    const q = query(this.energyErrorsRef, where(documentId(), '==', docId));

    return new Observable((observer) => {
      getDocs(q)
        .then((querySnapshot) => {
          if (!querySnapshot.empty) {
            const records = querySnapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            observer.next(records[0] as Record<string, unknown>);
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

  /**
   * Loads `energyErrors` docs whose id matches the Cloud Function run-hour key
   * (`UTC date` + `_` + Jerusalem hour) for hourly samples over the last {@link days} days,
   * then returns failures for {@link systemId}.
   */
  getRecentRunDocs(days: number): Observable<EnergyRunDoc[]> {
    const ids = this.runHourDocIdsCoveringLastDays(days);
    return from(this.getDocsByIds(ids)).pipe(
      map((docs) =>
        docs
          .map((d) => ({ id: d.id, failedSystems: d.failedSystems ?? [] }))
          .sort((a, b) => b.id.localeCompare(a.id))
      )
    );
  }

  getFailuresForSystemLastDays(
    systemId: string,
    days: number
  ): Observable<EnergyFailureEntry[]> {
    return from(this.fetchFailuresForSystem(systemId, days));
  }

  private jerusalemHour(d: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIME_ZONE,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(d);
    const h = parts.find((p) => p.type === 'hour')?.value;
    return parseInt(h ?? '0', 10);
  }

  /** Same key as `runHour` in `recursiveEnergy`. */
  private runHourKeyAt(ts: number): string {
    const d = new Date(ts);
    const utcDate = d.toISOString().slice(0, 10);
    return `${utcDate}_${this.jerusalemHour(d)}`;
  }

  private runHourDocIdsCoveringLastDays(days: number): string[] {
    const ids = new Set<string>();
    const now = Date.now();
    const stepMs = 60 * 60 * 1000;
    const hours = days * 24 + 1;
    for (let h = 0; h <= hours; h++) {
      ids.add(this.runHourKeyAt(now - h * stepMs));
    }
    return [...ids];
  }

  private async getDocsByIds(
    ids: string[]
  ): Promise<{ id: string; failedSystems?: FailedSystemPayload[] }[]> {
    if (!ids.length) {
      return [];
    }
    const out: { id: string; failedSystems?: FailedSystemPayload[] }[] = [];
    for (const group of chunk(ids, 30)) {
      const q = query(this.energyErrorsRef, where(documentId(), 'in', group));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data() as { failedSystems?: FailedSystemPayload[] };
        out.push({ id: docSnap.id, failedSystems: data.failedSystems });
      });
    }
    return out;
  }

  private async fetchFailuresForSystem(
    systemId: string,
    days: number
  ): Promise<EnergyFailureEntry[]> {
    const ids = this.runHourDocIdsCoveringLastDays(days);
    const docs = await this.getDocsByIds(ids);
    const rows: EnergyFailureEntry[] = [];
    for (const d of docs) {
      const failed = d.failedSystems;
      if (!failed?.length) {
        continue;
      }
      for (const f of failed) {
        if (f.systemId === systemId) {
          rows.push({
            runId: d.id,
            api: f.api,
            error: f.error ?? {},
          });
        }
      }
    }
    return rows.sort((a, b) => b.runId.localeCompare(a.runId));
  }
}
