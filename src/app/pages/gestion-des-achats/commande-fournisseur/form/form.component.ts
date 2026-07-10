import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommandeFournisseurService } from '../../../../services/commande-fournisseur/commande-fournisseur.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { BoutiqueService } from '../../../../services/boutique/boutique.service';
import { FournisseurService } from '../../../../services/gestion-des-produits/fournisseur.service';
import { ProduitService } from '../../../../services/gestion-des-produits/produit.service';

@Component({
  selector: 'app-commande-fournisseur-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NzSelectModule],
  templateUrl: './form.component.html',
  providers: [ToastrService],
})
export default class CommandeFournisseurFormComponent implements OnInit {
  form!: FormGroup;
  currentUser: any;
  boutiques: any[] = [];
  fournisseurs: any[] = [];
  produits: any[] = [];
  isSubmitting = false;
  isEditMode = false;
  editId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private commandeService: CommandeFournisseurService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private fournisseurService: FournisseurService,
    private produitService: ProduitService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      this.loadFournisseurs();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        const boutiqueId = user?.boutique_id ?? null;
        this.form.patchValue({ boutique: boutiqueId });
        if (boutiqueId) this.loadProduits(boutiqueId);
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editId = +id;
      this.loadCommande(+id);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      boutique:              [null, Validators.required],
      fournisseur:           [null],
      date_livraison_prevue: [null],
      notes:                 [''],
      detail_commande:       this.fb.array([]),
    });
  }

  get lignes(): FormArray { return this.form.get('detail_commande') as FormArray; }

  get montantTotal(): number {
    return this.lignes.controls.reduce((sum, ctrl) => {
      const q = Number(ctrl.get('quantite')?.value) || 0;
      const p = Number(ctrl.get('prix_unitaire')?.value) || 0;
      return sum + q * p;
    }, 0);
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => { this.boutiques = r?.data ?? []; } });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; }
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  loadFournisseurs(): void {
    this.fournisseurService.getAllFournisseurs().subscribe({
      next: (r: any) => { this.fournisseurs = r?.data ?? []; },
      error: () => {}
    });
  }

  loadProduits(boutiqueId: number): void {
    this.produitService.getProduits({ boutique: boutiqueId, limit: 1000 }).subscribe({
      next: (r: any) => { this.produits = r?.data?.items ?? r?.data ?? []; },
      error: () => {}
    });
  }

  onBoutiqueChange(boutiqueId: number | null): void {
    this.produits = [];
    this.lignes.clear();
    if (boutiqueId) this.loadProduits(boutiqueId);
  }

  ajouterLigne(): void {
    this.lignes.push(this.fb.group({
      produit:       [null, Validators.required],
      quantite:      [1,    [Validators.required, Validators.min(1)]],
      prix_unitaire: [0,    [Validators.required, Validators.min(0)]],
    }));
  }

  supprimerLigne(index: number): void {
    this.lignes.removeAt(index);
  }

  onProduitChange(index: number, produitId: number | null): void {
    if (!produitId) return;
    const produit = this.produits.find(p => p.id === produitId);
    if (produit) {
      this.lignes.at(index).patchValue({ prix_unitaire: produit.prix_achat ?? 0 });
    }
  }

  loadCommande(id: number): void {
    this.commandeService.getById(id).subscribe({
      next: (r: any) => {
        const c = r?.data ?? r;
        this.form.patchValue({
          boutique:              c.boutique?.id ?? null,
          fournisseur:           c.fournisseur?.id ?? null,
          date_livraison_prevue: c.date_livraison_prevue ? new Date(c.date_livraison_prevue).toISOString().split('T')[0] : null,
          notes:                 c.notes ?? '',
        });
        if (c.boutique?.id) this.loadProduits(c.boutique.id);
        this.lignes.clear();
        (c.detail_commande ?? []).forEach((d: any) => {
          this.lignes.push(this.fb.group({
            produit:       [d.produit?.id ?? null, Validators.required],
            quantite:      [d.quantite,             [Validators.required, Validators.min(1)]],
            prix_unitaire: [d.prix_unitaire,         [Validators.required, Validators.min(0)]],
          }));
        });
      },
      error: () => this.toastr.error('Impossible de charger la commande')
    });
  }

  submit(): void {
    if (this.form.invalid || !this.lignes.length) {
      this.form.markAllAsTouched();
      if (!this.lignes.length) this.toastr.warning('Ajoutez au moins une ligne de produit');
      return;
    }

    const val = this.form.value;
    const body = {
      boutique:              val.boutique,
      fournisseur:           val.fournisseur ?? null,
      date_livraison_prevue: val.date_livraison_prevue ?? null,
      notes:                 val.notes ?? '',
      montant_total:         this.montantTotal,
      user:                  this.currentUser?.telephone ?? null,
      detail_commande:       val.detail_commande.map((l: any) => ({
        produit:       l.produit,
        quantite:      +l.quantite,
        prix_unitaire: +l.prix_unitaire,
      })),
    };

    this.isSubmitting = true;
    const req = this.isEditMode && this.editId
      ? this.commandeService.update(this.editId, body)
      : this.commandeService.create(body);

    req.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Commande modifiée' : 'Commande créée');
        this.router.navigate(['/gestion-des-approvisionnements/commandes-fournisseur']);
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de l\'enregistrement')
    });
  }

  nomProduit(id: number | null): string {
    return this.produits.find(p => p.id === id)?.nom ?? '';
  }
}
