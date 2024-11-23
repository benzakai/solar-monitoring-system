import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'issuesCount',
  standalone: true
})
export class IssuesCountPipe implements PipeTransform {

  transform(value: any[], status: string): number {
    if (!Array.isArray(value)) {
      return 0;
    }
    return value.filter(item => item.status === status).length;
  }

}
