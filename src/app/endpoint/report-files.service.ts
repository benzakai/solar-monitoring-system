import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
