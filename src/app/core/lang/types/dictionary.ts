export type DictionaryRecord = {
  [key in 'en' | 'he']: string;
};
export type Dictionary = { [k: string]: DictionaryRecord | Dictionary };
