import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vente',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './vente.component.html',
  styleUrl: './vente.component.scss'
})
export default class VenteComponent implements OnInit {

  venteForm!: FormGroup;
  modesPaiement: string[] = ['espece', 'cheque', 'virement', 'carte'];
  statuts: string[] = ['payer', 'non_payer', 'partiel'];
  produits: any[] = [];
  isSubmitting = false;
  currentUser: any;
  boutiques: any[] = [];
  selectedBoutique: string = '';
  loading = false;
  
  // Variables pour le mode édition
  isEditMode = false;
  editVenteId: number | null = null;
  editVenteData: any = null;

  constructor(
    private fb: FormBuilder,
    private ventesService: VentesService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.initForm();
    this.loadBoutiques();
    this.loadProduits();
    
    // Vérifier s'il y a des données d'édition dans le localStorage
    this.checkForEditData();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  initForm(): void {
    // Vérifier si currentUser existe avant d'accéder à ses propriétés
    const userId = this.currentUser ? this.currentUser.id : null;
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique.id : null;
    
    this.venteForm = this.fb.group({
      user: [userId, Validators.required],
      libelle: [''],
      description: [''],
      boutique: [boutiqueId, Validators.required],
      montant_total: [0, [Validators.required, Validators.min(0)]],
      date_vente: [new Date().toISOString().slice(0, 10), Validators.required],
      mode_paiement: ['espece', Validators.required],
      statut: ['payer', Validators.required],
      detail_vente: this.fb.array([]),
      clientdata: this.fb.group({
        nom: [],
        telephone: [],
        email: [],
      })
    });
  }

  get detail_vente(): FormArray {
    return this.venteForm.get('detail_vente') as FormArray;
  }

  checkForEditData(): void {
    const editDataStr = localStorage.getItem('editVenteData');
    if (editDataStr) {
      try {
        this.editVenteData = JSON.parse(editDataStr);
        this.isEditMode = true;
        this.editVenteId = this.editVenteData.id;
        
        // Supprimer les données du localStorage après les avoir récupérées
        localStorage.removeItem('editVenteData');

        // Charger les produits de la boutique associée à la vente
        if (this.editVenteData.vente && this.editVenteData.vente.boutique) {
          this.selectedBoutique = this.editVenteData.vente.boutique.id.toString();
          this.loadProduits();
        } else if (this.currentUser && this.currentUser.boutique) {
          // Utiliser la boutique de l'utilisateur courant comme fallback
          this.selectedBoutique = this.currentUser.boutique.id.toString();
          this.loadProduits();
        }
        
        // Attendre que les produits soient chargés avant de remplir le formulaire
        setTimeout(() => {
          this.populateFormWithEditData();
        }, 1000);
      } catch (error) {
        console.error('Erreur lors de la récupération des données d\'édition:', error);
        localStorage.removeItem('editVenteData');
      }
    } else {
      // Si pas en mode édition, ajouter un détail de vente par défaut
      this.addDetailVente();
    }
  }

  selectProduit(event: Event, index: number) {
    const idProduit = Number((event.target as HTMLSelectElement).value);
    const produit = this.produits.find(p => p.id === idProduit);

    if (produit) {
      const ligne = this.detail_vente.at(index) as FormGroup;
      ligne.patchValue({ 
        prix_unitaire_vente: produit.prix_vente,
        image: produit.imageUrl,
        stock: produit.stock_disponible
      });
      console.log(produit);
    }
    
  }

  populateFormWithEditData(): void {
    if (!this.editVenteData || !this.editVenteData.vente) return;
    
    const vente = this.editVenteData.vente;
    
    // Formater la date correctement (yyyy-MM-dd)
    let dateVente = new Date().toISOString().slice(0, 10);
    if (vente.created_at) {
      const date = new Date(vente.created_at);
      dateVente = date.toISOString().slice(0, 10);
    }
    
    // Vérifier que currentUser et boutique existent avant d'accéder à leurs propriétés
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique.id : null;
    const userId = this.currentUser ? this.currentUser.id : null;
    
    // Mettre à jour les champs principaux du formulaire
    this.venteForm.patchValue({
      libelle: vente.libelle || '',
      description: vente.description || '',
      boutique: boutiqueId,
      user: userId,
      montant_total: vente.montant_total || 0,
      date_vente: dateVente,
      mode_paiement: vente.mode_paiement || 'espece',
      statut: vente.statut || 'payer'
    });
    
    // Vider le FormArray des détails de vente existants
    while (this.detailVente.length > 0) {
      this.detailVente.removeAt(0);
    }
    
    // Ajouter les détails de vente
    if (vente.detail_vente && vente.detail_vente.length > 0) {
      vente.detail_vente.forEach((detail: any) => {
        const detailGroup = this.fb.group({
          produit: [detail.produit.id, Validators.required],
          prix_unitaire_vente: [detail.prix_unitaire_vente, [Validators.required, Validators.min(0)]],
          quantite: [detail.quantite, [Validators.required, Validators.min(1)]]
        });
        this.detailVente.push(detailGroup);
      });
    } else {
      // Si aucun détail n'est présent, ajouter une ligne vide
      this.addDetailVente();
    }
    
    // Calculer le montant total
    this.calculerMontantTotal();
    
    // Mettre à jour le titre du composant pour indiquer le mode édition
    setTimeout(() => {
      const cardTitle = document.querySelector('.card-title');
      if (cardTitle) {
        cardTitle.textContent = `Modification de la vente #${vente.reference || ''}`;
      }
    }, 0);
  }

  get f() {
    return this.venteForm.controls;
  }

  get detailVente(): FormArray {
    return this.venteForm.get('detail_vente') as FormArray;
  }

  createDetailVente(): FormGroup {
    return this.fb.group({
      image: [''],
      stock:[],
      image_produit: [],
      produit: [null, Validators.required],
      prix_unitaire_vente: [null, [Validators.required, Validators.min(0)]],
      quantite: [null, [Validators.required, Validators.min(1)]]
    });
  }

  addDetailVente(): void {
    this.detailVente.push(this.createDetailVente());
    this.calculerMontantTotal();
  }

  removeDetailVente(index: number): void {
    this.detailVente.removeAt(index);
    this.calculerMontantTotal();
  }

  calculerMontantTotal(): void {
    let total = 0;
    for (const detail of this.detailVente.controls) {
      const quantite = detail.get('quantite')?.value || 0;
      const prix = detail.get('prix_unitaire_vente')?.value || 0;
      total += quantite * prix;
    }
    this.venteForm.patchValue({ montant_total: total });
  }

  onPrixOuQuantiteChange(): void {
    this.calculerMontantTotal();
  }

  loadBoutiques(): void {
    if (!this.currentUser) {
      return;
    }
    
    if (this.currentUser.profil && 
       (this.currentUser.profil.description.toLowerCase() === 'administrateur' || 
        this.currentUser.profil.description.toLowerCase() === 'responsable structure')) {
      this.boutiqueService.find().subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) {
            this.boutiques = response.data;
          }
        },
      });
    } else if (this.currentUser.boutique) {
      this.boutiques[0] = this.currentUser.boutique;
      this.venteForm.patchValue({ boutique: this.currentUser.boutique.id });
    }
  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedBoutique = selectElement.value;
    this.loadProduits();
  }

  loadProduits(): void {
    if (!this.currentUser) {
      return;
    }
    
    if (this.currentUser.profil && 
       (this.currentUser.profil.description.toLowerCase() === 'administrateur' || 
        this.currentUser.profil.description.toLowerCase() === 'responsable structure')) {
      if (!this.selectedBoutique) {
        this.produits = [];
        return;
      }
    } else if (this.currentUser.boutique) {
      this.selectedBoutique = this.currentUser.boutique.id.toString();
    } else {
      // Si aucune boutique n'est disponible
      this.produits = [];
      return;
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
    
    if (this.venteForm.invalid) {
      return;
    }

    this.loading = true;
    
    // Si on est en mode édition, appeler la méthode de mise à jour
    if (this.isEditMode && this.editVenteId) {
      this.updateVente();
    } else {
      // Sinon, création d'une nouvelle vente
      this.createVente();
    }

  }
  
  createVente(): void {
    this.ventesService.saveVente(this.venteForm.value)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.initForm(); // Réinitialiser le formulaire
          this.addDetailVente(); // Ajouter une ligne par défaut après réinitialisation
          this.toastr.success('Enregistrement effectué avec succès');
          this.isSubmitting = false;
          // attendre 3 secondes avant de recharger la page
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        },
        error: (error: any) => {
          console.error('Erreur lors de la création de la vente', error);
          this.toastr.error('Erreur lors de la création de la vente');
          this.isSubmitting = false;
        }
      });
  }
  
  updateVente(): void {
    this.ventesService.updateVente(this.editVenteId, this.venteForm.value)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.toastr.success('Modification effectuée avec succès');
          this.isSubmitting = false;
          
          // Réinitialiser le mode édition
          this.isEditMode = false;
          this.editVenteId = null;
          this.editVenteData = null;
          
          // Réinitialiser le formulaire
          this.initForm();
          this.addDetailVente();
          
          // Mettre à jour le titre
          setTimeout(() => {
            const cardTitle = document.querySelector('.card-title');
            if (cardTitle) {
              cardTitle.textContent = 'Enregistrement d\'une nouvelle vente';
            }
          }, 0);
        },
        error: (error: any) => {
          console.error('Erreur lors de la modification de la vente', error);
          this.toastr.error('Erreur lors de la modification de la vente');
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
