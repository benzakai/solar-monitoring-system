import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Person } from '../../../../domain/person';
import { PeopleService } from '../../../../endpoint/people.service';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { from } from 'rxjs';

export interface PersonInfoDialogData {
  personId: string;
}

@Component({
  selector: 'app-person-info-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './person-info-dialog.component.html',
  styleUrls: ['./person-info-dialog.component.scss'],
  providers: [PeopleService],
})
export class PersonInfoDialogComponent implements OnInit {
  private firestore = inject(Firestore);
  form!: FormGroup;
  person: Person | null = null;
  viewMode = true;
  loading = true;

  constructor(
    private fb: FormBuilder,
    private peopleService: PeopleService,
    public dialogRef: MatDialogRef<PersonInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PersonInfoDialogData
  ) {}

  ngOnInit(): void {
    this.peopleService.getPeopleByIds([this.data.personId]).subscribe((people: Person[]) => {
      this.person = people[0];
      this.buildForm();
      this.loading = false;
    });
  }

  buildForm(): void {
    this.form = this.fb.group({
      name: [this.person?.name, Validators.required],
      phone: [this.person?.phone],
      email: [this.person?.email, Validators.email],
      position: [this.person?.position],
    });
  }

  editContact(): void {
    this.viewMode = false;
  }

  cancel(): void {
    if (this.form.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.dialogRef.close();
      }
    } else {
      this.dialogRef.close();
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const personDocRef = doc(this.firestore, `people/${this.data.personId}`);
    from(updateDoc(personDocRef, this.form.value)).subscribe(() => {
      this.dialogRef.close(true); // close and signal update
    });
  }
} 