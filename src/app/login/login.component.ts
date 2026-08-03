import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export default class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  showPassword = false;
  loading = false;
  error = '';
  readonly currentYear = new Date().getFullYear();

  /** Aperçu 360° des modules de l'app, affiché sur le panneau de connexion. */
  readonly modules = [
    { icon: 'bi-box-seam',           label: 'Produits & catégories' },
    { icon: 'bi-shop',               label: 'Multi-boutiques' },
    { icon: 'bi-cart4',              label: 'Achats & appro' },
    { icon: 'bi-truck',              label: 'Cmd. fournisseurs' },
    { icon: 'bi-currency-dollar',    label: 'Ventes & caisse' },
    { icon: 'bi-file-earmark-text',  label: 'Devis' },
    { icon: 'bi-bag-check',          label: 'Cmd. clients' },
    { icon: 'bi-arrow-return-left',  label: 'Retours produits' },
    { icon: 'bi-arrow-left-right',   label: 'Transferts stock' },
    { icon: 'bi-cash-stack',         label: 'Rapports & recette' },
    { icon: 'bi-stars',              label: 'Analyse IA' },
    { icon: 'bi-person-workspace',   label: 'Utilisateurs' },
  ];

  /** Salutation selon l'heure du moment, pour un accueil qui change dans la journée. */
  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Rediriger si déjà connecté selon le rôle
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.homeUrl());
    }

    this.initForm();
  }

  initForm(): void {
    this.loginForm = this.formBuilder.group({
      telephone: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      mot_de_passe: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.loginForm.controls; }

  private static readonly ECRAN_ROUTES: Record<string, string> = {
    'dashboard':            '/dashboard',
    'pos':                  '/pos/vente',
    'ekwatech':             '/ekwatech',
    'restaurant-admin':     '/restaurant/commandes',
    'restaurant-serveur':   '/restaurant/commandes',
    'restaurant-caissier':  '/restaurant/commandes',
    'restaurant-cuisine':   '/restaurant/commandes',
  };

  private homeUrl(): string {
    const user = this.authService.getUser();
    if (user?.must_change_password) return '/change-password';
    const ecran = this.authService.getEcranCible();
    if (!ecran) return '/no-access';
    return LoginComponent.ECRAN_ROUTES[ecran] ?? '/dashboard';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    // arrêter ici si le formulaire est invalide
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.router.navigateByUrl(this.homeUrl());
          setTimeout(() => {
            this.toastr.success('Vous êtes connecté! Bienvenue sur NeuroStock');
          }, 2000);
        },
        error: (error: HttpErrorResponse) => {
          this.error = error.error?.message || 'Une erreur est survenue lors de la connexion';
          // this.toastr.error(this.error);
        }
      });
  }
}
