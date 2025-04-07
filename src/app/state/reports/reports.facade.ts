import { inject, Inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Injectable()
export class ReportsFacade {
  route = inject(ActivatedRoute);

  yearAndMonth = this.route.params.pipe(
    map((params) => {
      const currentDate = new Date();
      const year = params['year'] ? +params['year'] : currentDate.getFullYear();
      const month = params['month'] ? +params['month'] : currentDate.getMonth();
      return { year, month };
    })
  );

  reports = this.yearAndMonth.pipe();
}
