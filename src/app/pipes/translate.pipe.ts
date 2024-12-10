import {
  Pipe,
  PipeTransform,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { LANGUAGE, LANGUAGE_DICTIONARY } from '../../lang';
import { Dictionary, DictionaryRecord } from '../../lang/types/dictionary';

function getNestedValue(
  obj: Dictionary | DictionaryRecord,
  path: string
): Dictionary | DictionaryRecord | undefined {
  const keys = path.split('.');
  let result: Dictionary | DictionaryRecord | undefined = obj;

  for (let key of keys) {
    if (result && (result as Dictionary)[key] !== undefined) {
      result = (result as Dictionary)[key] as Dictionary | DictionaryRecord;
    } else {
      return undefined;
    }
  }

  return result;
}

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private currentValue: any;
  private subscription: Subscription | null = null;

  private lang = inject(LANGUAGE);
  private dictionary = inject(LANGUAGE_DICTIONARY);
  private changeDetectorRef = inject(ChangeDetectorRef);

  transform(value: string): any {
    if (!this.subscription) {
      this.subscription = this.lang.subscribe((lng) => {
        const pointedDict = getNestedValue(this.dictionary, value);
        this.currentValue = pointedDict ? pointedDict[lng] : value;
        this.changeDetectorRef.markForCheck();
      });
    }
    return this.currentValue;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
