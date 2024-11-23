import {inject, Injectable} from '@angular/core';
import {collection, Firestore, getDocs, limit, query, where} from '@angular/fire/firestore';
import {from, map, Observable} from 'rxjs';

interface MonitorItem {
  id: string;
  communication: string;
  today_average: number;
  since_year_average: number;
  since_month_average: number;
  weekly_comparable: number;
  monthly_comparable: number;
  portal: string;
  system_name: string;
  today_comparable: number;
  last_month_average: number;
  three_days_comparable: number;
  yesterday_comparable: number;
  alerts_from_portal: {
    quantity: number;
    highestImpact: string;
  }
  kwp: number;
  comments: string;
  open_issues: {
    status: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class DirectMonitorService {
  private firestore = inject(Firestore);

  private collection = collection(this.firestore, 'directMoniterLife');

  getAll(): Observable<MonitorItem[]> {
    const limitedQuery = query(this.collection);
    return from(getDocs(limitedQuery)).pipe(
      map((querySnapshot) =>
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        } as MonitorItem))
      )
    );
  }
}
