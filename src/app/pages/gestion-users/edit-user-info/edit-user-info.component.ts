import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-edit-user-info',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './edit-user-info.component.html',
  styleUrl: './edit-user-info.component.scss'
})
export class EditUserInfoComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  user: any;
  passwordForm: FormGroup;
  isPasswordFormVisible = false;
  submitted = false;

  constructor() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(4)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(4)]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.getCurrentUser();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      console.log('user', this.user);
    });
  }

  // Validateur personnalisé pour vérifier que les mots de passe correspondent
  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  // Getters pour accéder facilement aux contrôles du formulaire
  get f() { return this.passwordForm.controls; }

  togglePasswordForm() {
    this.isPasswordFormVisible = !this.isPasswordFormVisible;
    if (!this.isPasswordFormVisible) {
      this.passwordForm.reset();
      this.submitted = false;
    }
  }

  onSubmitPassword() {
    this.submitted = true;

    if (this.passwordForm.invalid) {
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;
    
    // TODO: Implémenter la logique de changement de mot de passe
    console.log('Changement de mot de passe:', { currentPassword, newPassword });
    
    // Exemple de succès
    this.toastr.success('Mot de passe modifié avec succès');
    this.togglePasswordForm();
  }
}
