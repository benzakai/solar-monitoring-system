import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SystemType } from '../../../systems/system-type';
import {
  FormArray,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-api-id-dialog',
  templateUrl: './api-id-dialog.component.html',
  styleUrls: ['./api-id-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
  ],
})
export class ApiIdDialogComponent {
  SystemType = SystemType;

  inputs = [
    'system_settings.api_id_dialog.system_id',
    'system_settings.api_id_dialog.api_key',
    'system_settings.api_id_dialog.username',
    'system_settings.api_id_dialog.password',
  ];

  systemApi;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { type: SystemType; apiId: string[] }
  ) {
    this.systemApi = new FormArray(
      this.inputs.map(
        (v, i) =>
          new FormControl(
            this.data.apiId?.[i],
            this.isRequired(i) ? Validators.required : []
          )
      )
    );
    console.log(data);
  }

  getNormalizedApiId(): Array<string | number | null> {
    return this.systemApi.controls.map((control: { value: unknown }) =>
      this.normalizeCredentialValue(control.value)
    );
  }

  private normalizeCredentialValue(value: unknown): string | number | null {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return `${value}`.trim();
    }
    return null;
  }

  isRequired(idx: number): boolean {
    switch (this.data.type) {
      case SystemType.SMA:
      case SystemType.ENNEX:
      case SystemType.FUSION:
        return [0, 2, 3].includes(idx);
      case SystemType.HUAWEI:
      case SystemType.NETECO:
        return [0].includes(idx);
      case SystemType.SUN_GROW:
        return [0].includes(idx);
      default:
        return [0, 1].includes(idx);
    }
  }
}
