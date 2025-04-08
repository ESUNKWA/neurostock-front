import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AchatsService } from '../../../services/gestion-des-achats/achats.service';
import { FournisseurService } from '../../../services/gestion-des-produits/fournisseur.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-achats',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './achats.component.html',
  styleUrl: './achats.component.scss'
})
export default class AchatsComponent implements OnInit {
  achatForm!: FormGroup;
  modesPaiement: string[] = ['espece', 'cheque', 'virement', 'carte'];
  statuts: string[] = ['payer', 'non_payer', 'partiel'];
  fournisseurs: any[] = [];
  produits: any[] = [];
  isSubmitting = false;
  currentUser: any;
  boutiques: any[] = [];
  selectedBoutique: string = '';

  constructor(
    private fb: FormBuilder,
    private fournisseurService: FournisseurService,
    private achatsService: AchatsService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.initForm();
    this.loadBoutiques();
    this.loadFournisseurs();
    this.loadProduits();
    
    // Ajouter un détail d'achat par défaut
    this.addDetailAchat();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // console.log('currentUser', this.currentUser);
    });
  }

  initForm(): void {
    this.achatForm = this.fb.group({
      libelle: ['', Validators.required],
      description: [''],
      boutique: [null, Validators.required],
      montant_total: [0, [Validators.required, Validators.min(0)]],
      date_achat: [new Date().toISOString().slice(0, 10), Validators.required],
      mode_paiement: ['espece', Validators.required],
      fournisseur: [null, Validators.required],
      statut: ['payer', Validators.required],
      detail_achat: this.fb.array([])
    });
  }

  get f() {
    return this.achatForm.controls;
  }

  get detailAchat(): FormArray {
    return this.achatForm.get('detail_achat') as FormArray;
  }

  createDetailAchat(): FormGroup {
    return this.fb.group({
      produit: [null, Validators.required],
      prix_unitaire: [null, [Validators.required, Validators.min(0)]],
      quantite: [null, [Validators.required, Validators.min(1)]]
    });
  }

  addDetailAchat(): void {
    this.detailAchat.push(this.createDetailAchat());
    this.calculerMontantTotal();
  }

  removeDetailAchat(index: number): void {
    this.detailAchat.removeAt(index);
    this.calculerMontantTotal();
  }

  calculerMontantTotal(): void {
    let total = 0;
    for (const detail of this.detailAchat.controls) {
      const quantite = detail.get('quantite')?.value || 0;
      const prix = detail.get('prix_unitaire')?.value || 0;
      total += quantite * prix;
    }
    this.achatForm.patchValue({ montant_total: total });
  }

  onPrixOuQuantiteChange(): void {
    this.calculerMontantTotal();
  }

  loadBoutiques(): void {
    if (this.currentUser.profil.description.toLowerCase() === 'administrateur' || this.currentUser.profil.description.toLowerCase() === 'responsable structure') {
      this.boutiqueService.find().subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) {
            this.boutiques = response.data;
          }
        },
      });
    } else {
      this.boutiques[0] = this.currentUser.boutique;
      this.achatForm.patchValue({ boutique: this.currentUser.boutique.id });
    }
  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedBoutique = selectElement.value;
    this.loadProduits();
  }

  loadFournisseurs(): void {
    this.fournisseurService.getAllFournisseurs().subscribe({
      next: (response: any) => {
        this.fournisseurs = response.data;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des fournisseurs', error);
      }
    });
  }

  loadProduits(): void {
    if (this.currentUser.profil.description.toLowerCase() === 'administrateur' || this.currentUser.profil.description.toLowerCase() === 'responsable structure') {
      if (!this.selectedBoutique) {
        this.produits = [];
        return;
      }
    } else {
      this.selectedBoutique = this.currentUser.boutique.id;
    }
    
    const body: any = {
      boutique: this.selectedBoutique
    }

    this.produitService.getProduits(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.produits = response.data;
        }
      },
      error: (error: any) => {
        console.log('error', error);
      }
    });
  }

  onSubmit(): void {
    this.isSubmitting = true;
    if (this.achatForm.invalid) {
      // this.markFormGroupTouched(this.achatForm);
      return;
    }

    this.achatsService.createAchat(this.achatForm.value)
    .pipe(finalize(() => {this.isSubmitting = false;}))
    .subscribe({
      next: (response: any) => {
        console.log('Achat créé avec succès', response);
        this.isSubmitting = false;
        this.initForm(); // Réinitialiser le formulaire
        this.addDetailAchat(); // Ajouter une ligne par défaut après réinitialisation
        this.toastr.success('Achat créé avec succès');
      },
      error: (error: any) => {
        console.error('Erreur lors de la création de l\'achat', error);
        this.isSubmitting = false;
      }
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        (control as FormArray).controls.forEach((ctrl: any) => {
          if (ctrl instanceof FormGroup) {
            this.markFormGroupTouched(ctrl);
          } else {
            ctrl.markAsTouched();
          }
        });
      }
    });
  }
}
