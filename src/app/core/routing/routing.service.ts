import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { SystemApiService } from '../../features/systems/system-api.service';

@Injectable({
  providedIn: 'root',
})
export class RoutingService {
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);
  systemApiService = inject(SystemApiService);
  constructor() {}

  goToSystemDetails(systemId?: string) {
    this.router.navigate(['system', systemId]);
  }

  navigateToSystemApi(systemId: string) {
    this.systemApiService
      .redirectToSystemApi(systemId)
      .pipe(take(1))
      .subscribe();
  }
}
