import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { CommandeClientService } from '../../../services/gestion-des-commandes-clients/commande-client.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { ClientService } from '../../../services/gestion-des-clients/client.service';
import { ThousandSeparatorDirective } from '../../../helpers/thousand-separator.directive';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-commande-client-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ThousandSeparatorDirective, NzSelectModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
})
export default class FormComponent implements OnInit {
  form!: FormGroup;
  produits: any[]  = [];
  clients: any[]   = [];
  currentUser: any;
  isEditMode    = false;
  editId: number | null = null;
  loading       = false;
  isSubmitting  = false;
  selectedClientId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private commandeService: CommandeClientService,
    private authService: AuthService,
    private produitService: ProduitService,
    private clientService: ClientService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.initForm();
      const boutiqueId = user?.boutique?.id;
      if (boutiqueId) {
        this.loadProduits(boutiqueId);
        this.loadClients(boutiqueId);
      }

      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.isEditMode = true;
        this.editId = Number(id);
        this.loadCommande(this.editId);
      }
    });
  }

  private initForm(): void {
    this.form = this.fb.group({
      date_livraison_prevue: [null],
      notes:                 [''],
      remise:                [0],
      montant_total:         [{ value: 0, disabled: true }],
      montant_total_apres_remise: [{ value: 0, disabled: true }],
      clientdata: this.fb.group({
        nom:       [''],
        telephone: ['', [Validators.minLength(10), Validators.maxLength(10)]],
      }),
      detail_commande: this.fb.array([this.newLigne()]),
    });

    this.form.get('remise')!.valueChanges.subscribe(() => this.calculerTotaux());
  }

  newLigne(): FormGroup {
    const g = this.fb.group({
      produit:        [null, Validators.required],
      quantite:       [1,   [Validators.required, Validators.min(1)]],
      prix_unitaire:  [null, [Validators.required, Validators.min(0)]],
    });

    g.get('produit')?.valueChanges.subscribe((id: any) => {
      const produit = this.produits.find(p => p.id === id);
      if (produit) {
        g.patchValue({ prix_unitaire: produit.prix_vente }, { emitEvent: false });
        this.calculerTotaux();
      }
    });

    g.valueChanges.subscribe(() => this.calculerTotaux());
    return g;
  }

  get lignes(): FormArray { return this.form.get('detail_commande') as FormArray; }

  getProduitImage(id: number | null): string | null {
    if (!id) return null;
    return this.produits.find(p => p.id === id)?.imageUrl ?? null;
  }

  getProduitStock(id: number | null): number {
    if (!id) return 0;
    return this.produits.find(p => p.id === id)?.stock_disponible ?? 0;
  }

  addLigne(): void { this.lignes.push(this.newLigne()); }

  removeLigne(i: number): void {
    if (this.lignes.length > 1) { this.lignes.removeAt(i); this.calculerTotaux(); }
  }

  calculerTotaux(): void {
    const sous = this.lignes.controls.reduce((s, c) => {
      return s + (Number(c.value.quantite) || 0) * (Number(c.value.prix_unitaire) || 0);
    }, 0);
    const remise = Number(this.form.get('remise')?.value) || 0;
    this.form.get('montant_total')!.setValue(sous, { emitEvent: false });
    this.form.get('montant_total_apres_remise')!.setValue(Math.max(0, sous - remise), { emitEvent: false });
  }

  onClientSelect(id: number | null): void {
    if (!id) { this.form.get('clientdata')!.reset(); return; }
    const c = this.clients.find(cl => cl.id === id);
    if (c) {
      this.form.get('clientdata')!.patchValue({ nom: `${c.prenoms || ''} ${c.nom || ''}`.trim(), telephone: c.telephone || '' });
    }
  }

  private loadProduits(boutiqueId: number): void {
    this.produitService.getProduits({ boutique: boutiqueId }).subscribe({
      next: (r: any) => { this.produits = r?.data ?? (Array.isArray(r) ? r : []); }
    });
  }

  private loadClients(boutiqueId: number): void {
    this.clientService.getClientsByBoutique(boutiqueId).subscribe({
      next: (r: any) => { this.clients = r?.data ?? (Array.isArray(r) ? r : []); }
    });
  }

  private loadCommande(id: number): void {
    this.loading = true;
    this.commandeService.getById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (r: any) => {
          const c = r?.data || r;
          // Remplir les lignes
          this.lignes.clear();
          (c.detail_commande || c.details || []).forEach((l: any) => {
            const g = this.newLigne();
            g.patchValue({
              produit:        l.produit?.id ?? l.produit,
              quantite:       l.quantite,
              prix_unitaire:  l.prix_unitaire ?? l.prix_unitaire_vente,
            });
            this.lignes.push(g);
          });
          const cl = c.client || c.clientdata || {};
          this.form.patchValue({
            date_livraison_prevue: c.date_livraison_prevue ? c.date_livraison_prevue.split('T')[0] : null,
            notes:  c.notes || '',
            remise: c.remise || 0,
            clientdata: { nom: cl.prenoms ? `${cl.prenoms} ${cl.nom}` : cl.nom || '', telephone: cl.telephone || '' },
          });
          this.calculerTotaux();
        },
        error: () => this.toastr.error('Impossible de charger la commande')
      });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const boutiqueId = this.currentUser.boutique_id;

    // Sanitize: parse numeric fields — the ThousandSeparatorDirective may leave
    // string-formatted values or null if the field was never interacted with.
    const lignes = raw.detail_commande.map((l: any) => ({
      produit:        l.produit,
      quantite:       Number(l.quantite)        || 1,
      prix_unitaire:  Number(l.prix_unitaire)   || 0,
    }));

    const lignesInvalides = lignes.some(
      (l: any) => !l.produit || l.prix_unitaire <= 0
    );
    if (lignesInvalides) {
      this.toastr.error('Vérifiez les lignes : produit et prix unitaire requis');
      this.form.markAllAsTouched();
      return;
    }

    const sousTotal = lignes.reduce(
      (s: number, l: any) => s + l.quantite * l.prix_unitaire, 0
    );
    const remise   = Number(raw.remise) || 0;

    const body: any = {
      boutique:    boutiqueId,
      user:        this.currentUser?.telephone,
      montant_total:                sousTotal,
      montant_total_apres_remise:   Math.max(0, sousTotal - remise),
      remise,
      date_livraison_prevue:        raw.date_livraison_prevue || null,
      notes:                        raw.notes || null,
      clientdata:                   raw.clientdata,
      detail_commande:              lignes,
    };

    this.isSubmitting = true;
    const req$ = this.isEditMode
      ? this.commandeService.update(this.editId!, body)
      : this.commandeService.create(body);

    req$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        const msg = this.isEditMode ? 'Commande modifiée' : 'Commande créée avec succès';
        Swal.fire({ icon: 'success', title: msg, timer: 1800, showConfirmButton: false });
        this.router.navigate(['/commandes-clients/liste']);
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de l\'enregistrement')
    });
  }
}
