import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dictionary',
  standalone: true,
})
export class DictionaryPipe implements PipeTransform {
  transform(value: string, dictionary: Record<string, string>): string {
    return dictionary[value] || value;
  }
} 