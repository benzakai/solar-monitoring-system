import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { AppEndpointService } from '../../../../endpoint/app-endpoint.service';
import {
  MalfunctionTypeNode,
  MalfunctionTypesTree,
} from '../../../../domain/malfunction-type-tree';
import { MalfunctionSeverity } from '../../../../domain/malfunction';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';

type MalfunctionTypeFormValue = {
  key: string;
  text: string;
  severity: MalfunctionSeverity | null | undefined;
  subTypes: Array<{
    key: string;
    text: string;
    severity: MalfunctionSeverity | null | undefined;
  }>;
};

const MALFUNCTION_SEVERITY_VALUES = Object.values(MalfunctionSeverity).filter(
  (value): value is MalfunctionSeverity => typeof value === 'number'
);

@Component({
  selector: 'app-settings-malfunction-types-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    TranslatePipe,
  ],
  templateUrl: './settings-malfunction-types-card.component.html',
  styleUrl: './settings-malfunction-types-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsMalfunctionTypesCardComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appEndpoint = inject(AppEndpointService);
  private destroyRef = inject(DestroyRef);

  loading$ = new BehaviorSubject<boolean>(true);
  saving = false;
  malfunctionTypesForm?: FormArray<FormGroup>;
  openedIndex = -1;
  readonly severities: Array<MalfunctionSeverity | undefined> = [
    undefined,
    ...MALFUNCTION_SEVERITY_VALUES,
  ];

  ngOnInit(): void {
    this.appEndpoint
      .getMalfunctionsTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tree) => {
        this.buildForm(tree || {});
        this.loading$.next(false);
      });
  }

  addType(): void {
    this.ensureForm();
    this.malfunctionTypesForm?.push(
      this.createTypeGroup('', undefined, false)
    );
    this.openedIndex = this.malfunctionTypesForm!.length - 1;
  }

  addSubType(group: FormGroup): void {
    const subTypes = group.get('subTypes') as FormArray<FormGroup>;
    subTypes.push(this.createSubTypeGroup());
  }

  removeType(index: number): void {
    this.malfunctionTypesForm?.removeAt(index);
    if (this.openedIndex === index) {
      this.openedIndex = -1;
    }
  }

  removeSubType(group: FormGroup, index: number): void {
    const subTypes = group.get('subTypes') as FormArray<FormGroup>;
    subTypes.removeAt(index);
  }

  getSubTypes(group: FormGroup): FormArray<FormGroup> {
    return group.get('subTypes') as FormArray<FormGroup>;
  }

  toggle(index: number): void {
    this.openedIndex = this.openedIndex === index ? -1 : index;
  }

  save(): void {
    if (!this.malfunctionTypesForm) {
      return;
    }

    this.malfunctionTypesForm.markAllAsTouched();
    if (this.malfunctionTypesForm.invalid) {
      return;
    }

    const tree = this.buildTreeFromForm();
    this.saving = true;
    this.appEndpoint
      .setMalfunctionTypes(tree)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.malfunctionTypesForm?.markAsPristine();
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  private buildForm(tree: MalfunctionTypesTree) {
    const entries = Object.entries(tree);
    this.malfunctionTypesForm = this.fb.array(
      entries.length
        ? entries.map(([key, node]) => this.createTypeGroup(key, node))
        : []
    );
  }

  private createTypeGroup(
    key: string,
    node?: MalfunctionTypeNode,
    disableKey = true
  ): FormGroup {
    return this.fb.group({
      key: [{ value: key, disabled: disableKey }, [Validators.required]],
      text: [node?.text ?? '', Validators.required],
      severity: [node?.data ?? undefined],
      subTypes: this.fb.array(
        node?.children
          ? Object.entries(node.children).map(([subKey, subNode]) =>
              this.createSubTypeGroup(subKey, subNode, true)
            )
          : []
      ),
    });
  }

  private createSubTypeGroup(
    key: string = '',
    node?: MalfunctionTypeNode,
    disableKey = false
  ): FormGroup {
    return this.fb.group({
      key: [{ value: key, disabled: disableKey }, [Validators.required]],
      text: [node?.text ?? '', Validators.required],
      severity: [node?.data ?? undefined],
    });
  }

  private ensureForm(): void {
    if (!this.malfunctionTypesForm) {
      this.malfunctionTypesForm = this.fb.array<FormGroup>([]);
    }
  }

  private buildTreeFromForm(): MalfunctionTypesTree {
    const raw =
      (this.malfunctionTypesForm?.getRawValue() ?? []) as MalfunctionTypeFormValue[];
    const tree: MalfunctionTypesTree = {};

    raw.forEach((type) => {
      if (!type.key) {
        return;
      }
      const node: MalfunctionTypeNode = {
        text: type.text,
      };
      if (type.severity) {
        node.data = type.severity;
      }
      if (type.subTypes?.length) {
        node.children = {};
        type.subTypes.forEach((sub) => {
          if (!sub.key) {
            return;
          }
          node.children![sub.key] = {
            text: sub.text,
            ...(sub.severity ? { data: sub.severity } : {}),
          };
        });
      }
      tree[type.key] = node;
    });

    return tree;
  }
}


