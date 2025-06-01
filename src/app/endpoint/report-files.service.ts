import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportFilesService {
  http = inject(HttpClient);

  generatePdf(page: string, docId: string) {
    return this.http.get(
      'https://us-central1-solar-golan.cloudfunctions.net/pdf-createPdf/' +
        page +
        '/' +
        docId,
      { responseType: 'blob' }
    );
  }

  generatePdfForEmail(page: string, docId: string): Observable<string> {
    const headers = new HttpHeaders().set('X-Url-Only', 'true');
    const url =
      'https://us-central1-solar-golan.cloudfunctions.net/pdf-createPdf/' +
      page +
      '-M' +
      '/' +
      docId;

    return this.http.get(url).pipe(
      map((response: unknown) => {
        if (response && typeof response === 'object' && 'url' in response) {
          return response.url as string;
        }
        return '';
      })
    );
  }

  downloadPdf(url: string, fileName: string) {
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.setAttribute('download', fileName);
      a.click();
      a.remove();
    }
  }
}
