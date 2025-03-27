import { inject, Injectable } from '@angular/core';
import { Person } from '../../domain/person';
import { map, Observable } from 'rxjs';
import { PeopleService } from '../../endpoint/people.service';

@Injectable({
  providedIn: 'root',
})
export class PeopleFacade {
  cashedPeople: { [id: string]: Person } = {};
  peopleService = inject(PeopleService);

  getPeopleByIds(ids: string[]): Observable<Person[]> {
    const peopleFromCache = ids
      .map((id) => this.cashedPeople[id])
      .filter(Boolean);
    const peopleNotFromCache = ids.filter((id) => !this.cashedPeople[id]);

    return this.peopleService
      .getPeopleByIds([...new Set(peopleNotFromCache)])
      .pipe(
        map((people) => {
          people.forEach((person) => {
            this.cashedPeople[person._id] = person;
          });
          return [...peopleFromCache, ...people];
        })
      );
  }
}
