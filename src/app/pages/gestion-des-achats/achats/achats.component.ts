import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FournisseurService } from '../../../services/gestion-des-produits/fournisseur.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AchatsService } from '../../../services/gestion-des-achats/achats.service';
import { ModuleService } from '../../../services/modules/module.service';
import { NzOptionComponent, NzSelectModule } from "ng-zorro-antd/select";
import { filterEntrepots, filterPointsDeVente, hasEntrepot, isEntrepot } from '../../../helpers/boutique-type.util';

interface LigneApprovisionnement {
  produit: any;
  mode: 'unite' | 'colis';
  quantite: number | null;        // saisie en mode 'unite' (unité de détail)
  prix_unitaire: number;          // prix par unité de détail (mode 'unite')
  quantite_colis: number | null;  // saisie en mode 'colis' (nb de cartons/casiers)
  prix_colis: number;             // prix par carton/casier (mode 'colis')
}

@Component({
  selector: 'app-achats',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, NzSelectModule],
  templateUrl: './achats.component.html',
  styleUrl: './achats.component.scss'
})
export default class AchatsComponent implements OnInit {
  achatForm!: FormGroup;
  private readonly ALL_MODES_PAIEMENT: string[] = ['espece', 'cheque', 'virement', 'carte', 'orange_money', 'wave', 'mtn_money', 'moov_money', 'dajmo'];
  modesPaiementActifs: string[] | null = null;

  get modesPaiement(): string[] {
    if (!this.modesPaiementActifs) return this.ALL_MODES_PAIEMENT;
    return this.ALL_MODES_PAIEMENT.filter(m => this.modesPaiementActifs!.includes(m));
  }
  statuts: string[] = ['payer', 'non_payer', 'partiel'];
  fournisseurs: any[] = [];
  produits: any[] = [];
  lignes: LigneApprovisionnement[] = [];
  searchQuery = '';
  isSubmitting = false;
  currentUser: any;
  boutiques: any[] = [];
  selectedBoutique: string = '';
  loading = false;
  
  // Variables pour le mode édition
  isEditMode = false;
  editAchatId: number | null = null;
  editAchatData: any = null;

  constructor(
    private fb: FormBuilder,
    private fournisseurService: FournisseurService,
    private achatsService: AchatsService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private moduleService: ModuleService,
    private toastr: ToastrService
  ) {}

  /** Certains clients (SaaS) désactivent l'obligation de saisir le prix d'achat. */
  get prixAchatOptionnel(): boolean {
    return this.moduleService.hasModule('prix_achat_optionnel');
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.initForm();
    this.loadBoutiques();
    this.loadFournisseurs();
    this.loadProduits();
    
    // Vérifier s'il y a des données d'édition dans le localStorage
    this.checkForEditData();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // console.log('currentUser', this.currentUser);
    });
  }

  initForm(): void {
    // Vérifier si currentUser existe avant d'accéder à ses propriétés
    const userTelephone = this.currentUser ? this.currentUser.telephone : null;
    const boutiqueId = this.currentUser && this.currentUser.boutique ? this.currentUser.boutique_id : null;

    this.achatForm = this.fb.group({
      user: [userTelephone, Validators.required],
      libelle: [''],
      description: [''],
      boutique: [null, Validators.required],
      montant_total: [0, [Validators.required, Validators.min(0)]],
      date_achat: [new Date().toISOString().slice(0, 10), Validators.required],
      mode_paiement: ['espece', Validators.required],
      fournisseur: [null, Validators.required],
      statut: ['payer', Validators.required],
    });
  }

  checkForEditData(): void {
    const editDataStr = localStorage.getItem('editAchatData');
    if (editDataStr) {
      try {
        this.editAchatData = JSON.parse(editDataStr);
        this.isEditMode = true;
        this.editAchatId = this.editAchatData.id;
        
        // Supprimer les données du localStorage après les avoir récupérées
        localStorage.removeItem('editAchatData');
        
        // Charger les produits de la boutique associée à l'achat
        this.selectedBoutique = this.editAchatData.achat.boutique ? this.editAchatData.achat.boutique.id.toString() : '';
        if (this.selectedBoutique) {
          this.loadProduits();
        }
        
        // Attendre que les produits soient chargés avant de remplir le formulaire
        setTimeout(() => {
          this.populateFormWithEditData();
        }, 1000);
      } catch (error) {
        console.error('Erreur lors de la récupération des données d\'édition:', error);
        localStorage.removeItem('editAchatData');
      }
    }
  }

  populateFormWithEditData(): void {
    if (!this.editAchatData || !this.editAchatData.achat) return;
    
    const achat = this.editAchatData.achat;
    
    // Formater la date correctement (yyyy-MM-dd)
    let dateAchat = new Date().toISOString().slice(0, 10);
    if (achat.date_achat) {
      const date = new Date(achat.date_achat);
      dateAchat = date.toISOString().slice(0, 10);
    }

    
    // Mettre à jour les champs principaux du formulaire
    this.achatForm.patchValue({
      libelle: achat.libelle || '',
      description: achat.description || '',
      boutique: this.currentUser.boutique_id,
      montant_total: achat.montant_total || 0,
      date_achat: dateAchat,
      mode_paiement: achat.mode_paiement || 'espece',
      fournisseur: achat.fournisseur ? achat.fournisseur.id : null,
      statut: achat.statut || 'payer'
    });
    
    // Reporter les quantités/prix historiques sur les lignes déjà générées depuis
    // `produits` (filtrées par fournisseur/boutique) ; les produits qui ne s'y
    // trouvent plus (ex: lien fournisseur modifié depuis) sont ajoutés en plus
    // pour ne pas perdre la donnée historique lors de l'édition.
    const historique: any[] = achat.detail_achat ?? [];
    for (const detail of historique) {
      const produitHist = detail.produit;
      if (!produitHist) continue;
      // `quantite`/`prix_unitaire` restent la vérité en unité de détail ; `mode_saisie`
      // (+ quantite_colis/prix_colis) ne sert qu'à rouvrir le formulaire dans le mode
      // utilisé à l'origine (rétro-compatible : les anciens achats n'ont pas ce champ).
      const enColis = detail.mode_saisie === 'colis';
      const idx = this.lignes.findIndex(l => l.produit.id === produitHist.id);
      if (idx >= 0) {
        this.lignes[idx].mode = enColis ? 'colis' : 'unite';
        this.lignes[idx].quantite = detail.quantite;
        this.lignes[idx].prix_unitaire = detail.prix_unitaire;
        this.lignes[idx].quantite_colis = detail.quantite_colis ?? null;
        this.lignes[idx].prix_colis = detail.prix_colis ?? 0;
      } else {
        this.lignes.push({
          produit: produitHist, mode: enColis ? 'colis' : 'unite',
          quantite: detail.quantite, prix_unitaire: detail.prix_unitaire,
          quantite_colis: detail.quantite_colis ?? null, prix_colis: detail.prix_colis ?? 0,
        });
      }
    }

    // Calculer le montant total
    this.calculerMontantTotal();
    
    // Mettre à jour le titre du composant pour indiquer le mode édition
    setTimeout(() => {
      const cardTitle = document.querySelector('.card-title');
      if (cardTitle) {
        cardTitle.textContent = `Modification de l'approvisionnement #${achat.reference || ''}`;
      }
    }, 0);
  }

  get f() {
    return this.achatForm.controls;
  }

  // ── Lignes produits (tableau produits du fournisseur × quantité saisie) ────

  get filtered(): LigneApprovisionnement[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.lignes;
    return this.lignes.filter(l => l.produit.nom?.toLowerCase().includes(q));
  }

  get lignesSaisies(): LigneApprovisionnement[] {
    return this.lignes.filter(l => this.quantiteUnites(l) > 0);
  }

  // Reconstruit `lignes` à partir de la liste de produits courante (déjà filtrée
  // par boutique + fournisseur via `loadProduits()`), en conservant les
  // quantités/prix déjà saisis pour les produits qui restent dans la liste.
  private syncLignesFromProduits(): void {
    this.lignes = this.produits.map((p: any) => {
      const existante = this.lignes.find(l => l.produit.id === p.id);
      return {
        produit: p,
        mode: existante?.mode ?? 'unite',
        quantite: existante?.quantite ?? null,
        prix_unitaire: existante?.prix_unitaire ?? p.prix_achat ?? 0,
        quantite_colis: existante?.quantite_colis ?? null,
        prix_colis: existante?.prix_colis ?? ((p.prix_achat && p.quantite_par_conditionnement) ? p.prix_achat * p.quantite_par_conditionnement : 0),
      };
    });
  }

  // ── Conditionnement (carton/casier) ────────────────────────────────────────

  hasConditionnement(l: LigneApprovisionnement): boolean {
    return !!l.produit.unite_conditionnement && !!l.produit.quantite_par_conditionnement;
  }

  toggleMode(l: LigneApprovisionnement, mode: 'unite' | 'colis'): void {
    l.mode = mode;
    this.calculerMontantTotal();
  }

  // Quantité en unité de détail, quel que soit le mode de saisie — c'est ce qui
  // impacte réellement le stock et qui est envoyé au backend.
  quantiteUnites(l: LigneApprovisionnement): number {
    if (l.mode === 'colis' && this.hasConditionnement(l)) {
      return (Number(l.quantite_colis) || 0) * (l.produit.quantite_par_conditionnement || 1);
    }
    return Number(l.quantite) || 0;
  }

  // Prix par unité de détail, quel que soit le mode de saisie.
  prixUnitaireEffectif(l: LigneApprovisionnement): number {
    if (l.mode === 'colis' && this.hasConditionnement(l)) {
      const facteur = l.produit.quantite_par_conditionnement || 1;
      return (Number(l.prix_colis) || 0) / facteur;
    }
    return Number(l.prix_unitaire) || 0;
  }

  montantLigne(l: LigneApprovisionnement): number {
    return this.quantiteUnites(l) * this.prixUnitaireEffectif(l);
  }

  // Ligne à quantité saisie mais sans prix, alors que le prix est obligatoire pour ce client.
  prixManquant(l: LigneApprovisionnement): boolean {
    return !this.prixAchatOptionnel && this.quantiteUnites(l) > 0 && this.prixUnitaireEffectif(l) <= 0;
  }

  calculerMontantTotal(): void {
    const total = this.lignesSaisies.reduce((s, l) => s + this.montantLigne(l), 0);
    this.achatForm.patchValue({ montant_total: total });
  }

  onPrixOuQuantiteChange(): void {
    this.calculerMontantTotal();
  }

  /**
   * Détermine, pour une structure donnée, les boutiques éligibles à recevoir un
   * approvisionnement : les entrepôts si la structure en possède au moins un
   * (flux Fournisseur → Entrepôt → Boutique), sinon les points de vente
   * directement (flux Fournisseur → Boutique, pour les petits commerces sans
   * entrepôt). Voir helpers/boutique-type.util.ts.
   */
  private boutiquesEligiblesAppro(structure: any[]): any[] {
    return hasEntrepot(structure) ? filterEntrepots(structure) : filterPointsDeVente(structure);
  }

  /** Libellé du sélecteur de destination, selon que la structure a un entrepôt ou non. */
  get libelleDestinationAppro(): string {
    return this.boutiques.length > 0 && isEntrepot(this.boutiques[0]) ? 'entrepôt' : 'point de vente';
  }

  loadBoutiques(): void {
    const code = this.currentUser.profil.code.toLowerCase();

    const afterLoad = (list: any[]) => {
      this.boutiques = this.boutiquesEligiblesAppro(list);
      if (this.boutiques.length === 1) {
        const b = this.boutiques[0];
        this.achatForm.patchValue({ boutique: b.id });
        this.selectedBoutique = String(b.id);
        if (Array.isArray(b.modes_paiement)) this.modesPaiementActifs = b.modes_paiement;
        this.loadProduits();
      }
    };

    if (code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) afterLoad(response.data);
        },
        error: (error: any) => console.error('Erreur lors du chargement des boutiques:', error)
      });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) afterLoad(response.data);
        },
        error: (error: any) => console.error('Erreur lors du chargement des boutiques:', error)
      });
    } else {
      // Rôles liés à une boutique précise (gérant, magasinier…) : il faut connaître
      // toute la structure pour savoir si l'appro doit passer par un entrepôt (auquel
      // cas seul le responsable de l'entrepôt approvisionne, puis transfère) ou si,
      // faute d'entrepôt, cette boutique s'approvisionne directement.
      const b = this.currentUser.boutique;
      const structureId = this.currentUser.structure_id ?? this.currentUser.structure?.id ?? b?.structure_id;
      if (!b || !structureId) { this.boutiques = []; return; }

      this.boutiqueService.findByStructure(structureId).subscribe({
        next: (response: any) => {
          const structure = (response.status === 'success' && response.data) ? response.data : [b];
          const eligible = isEntrepot(b) || !hasEntrepot(structure);
          if (eligible) {
            this.boutiques = [b];
            this.achatForm.patchValue({ boutique: b.id });
            this.selectedBoutique = String(b.id);
            if (Array.isArray(b.modes_paiement)) this.modesPaiementActifs = b.modes_paiement;
            this.loadProduits();
          } else {
            this.boutiques = [];
          }
        },
        error: (error: any) => console.error('Erreur lors du chargement des boutiques:', error)
      });
    }
  }

  onBoutiqueChange(value: any): void {
    this.selectedBoutique = value;
    const b = this.boutiques.find((x: any) => String(x.id) === String(value));
    this.modesPaiementActifs = Array.isArray(b?.modes_paiement) ? b.modes_paiement : null;
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
    // `selectedBoutique` est déjà restreinte par loadBoutiques() à la boutique
    // éligible pour l'appro (l'entrepôt si la structure en a un, sinon le point
    // de vente lui-même — cf. boutiquesEligiblesAppro()). On ne doit donc jamais
    // retomber sur currentUser.boutique_id ici sans passer par ce filtre.
    if (!this.selectedBoutique) {
      this.produits = [];
      return;
    }

    const body: any = {
      boutique: this.selectedBoutique
    }
    const fournisseurId = this.achatForm?.get('fournisseur')?.value;
    if (fournisseurId) body.fournisseur = fournisseurId;

    this.produitService.getProduits(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.produits = response.data;
          this.syncLignesFromProduits();
          this.calculerMontantTotal();
        }
      },
      error: (error: any) => {
        console.log('error', error);
      }
    });
  }

  onFournisseurChange(value: any): void {
    this.loadProduits();
  }

  onSubmit(): void {
    this.isSubmitting = true;

    if (this.achatForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.achatForm);
      return;
    }

    if (this.lignesSaisies.length === 0) {
      this.toastr.error('Veuillez saisir au moins une quantité approvisionnée.');
      return;
    }

    if (!this.prixAchatOptionnel && this.lignesSaisies.some(l => this.prixUnitaireEffectif(l) <= 0)) {
      this.toastr.error('Veuillez saisir un prix d\'achat pour chaque produit approvisionné.');
      return;
    }

    this.calculerMontantTotal();
    this.loading = true;

    // Si on est en mode édition, appeler la méthode de mise à jour
    if (this.isEditMode && this.editAchatId) {
      this.updateAchat();
    } else {
      // Sinon, création d'un nouvel approvisionnement
      this.createAchat();
    }
  }

  private buildDetailAchat(): any[] {
    return this.lignesSaisies.map(l => {
      const enColis = l.mode === 'colis' && this.hasConditionnement(l);
      return {
        produit: l.produit.id,
        prix_unitaire: this.prixUnitaireEffectif(l),
        quantite: this.quantiteUnites(l),
        mode_saisie: enColis ? 'colis' : 'unite',
        quantite_colis: enColis ? l.quantite_colis : null,
        prix_colis: enColis ? l.prix_colis : null,
      };
    });
  }

  createAchat(): void {
    const body = { ...this.achatForm.value, detail_achat: this.buildDetailAchat() };
    this.achatsService.createAchat(body)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.initForm(); // Réinitialiser le formulaire
          this.lignes = [];
          this.loadProduits(); // Recharger les lignes produits vierges
          this.toastr.success('Approvisionnement effectué avec succès');
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Erreur lors de la création de l\'achat', error);
          this.toastr.error('Erreur lors de la création de l\'approvisionnement');
          this.isSubmitting = false;
        }
      });
  }

  updateAchat(): void {
    const body = { ...this.achatForm.value, detail_achat: this.buildDetailAchat() };
    this.achatsService.updateAchat(this.editAchatId, body)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (response: any) => {
          this.toastr.success('Approvisionnement modifié avec succès');
          this.isSubmitting = false;

          // Réinitialiser le mode édition
          this.isEditMode = false;
          this.editAchatId = null;
          this.editAchatData = null;

          // Réinitialiser le formulaire
          this.initForm();
          this.lignes = [];
          this.loadProduits();

          // Mettre à jour le titre
          setTimeout(() => {
            const cardTitle = document.querySelector('.card-title');
            if (cardTitle) {
              cardTitle.textContent = 'Enregistrement d\'un nouvel approvisionnement';
            }
          }, 0);
        },
        error: (error: any) => {
          console.error('Erreur lors de la modification de l\'achat', error);
          this.toastr.error('Erreur lors de la modification de l\'approvisionnement');
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
