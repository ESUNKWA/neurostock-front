import { ChangeDetectorRef, Component, ElementRef, Inject, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { first, Subscription } from 'rxjs';
import { UserService } from '../../../services/user/user.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProfilService } from '../../../services/profil/profil.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { StructureService } from '../../../services/structure/structure.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzSelectModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  souscription: Subscription = new Subscription();
  userForm: FormGroup;
   idBoutique: number = 0;
  //Injection des services
  userService: any = inject(UserService);
  profilService: any = inject(ProfilService);
  boutiqueService: any = inject(BoutiqueService);
  structureService: any = inject(StructureService);
  fb: any = inject(FormBuilder);
  toastr = inject(ToastrService)

  users: any [] = [];
  usersData: any = {};
  mobileDetailItem: any = null;
  profils: any[] = [];
  boutiques: any[] = [];
  structures: any[] = [];
  // selectedProfil: any = '';

  isLoading: boolean = false;
  isEditMode: boolean = false;
  titleModal: string = 'AJOUTER UN NOUVEAU UTILISATEUR';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';

  
  isSubmitted: boolean = false;

  @ViewChild('dataTable', { static: false }) table!: ElementRef;
  currentUser: any

  
  constructor(@Inject(PLATFORM_ID) private platformId: any){
    this.userForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenoms: ['', [Validators.required]],
      email: ['', [Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^(01|05|07)\d{8}$/)]],
      mot_de_passe: this.fb.control('12345', { nonNullable: true }),
      profil: ['', [Validators.required]],
      boutique: ['', [Validators.required]],
      structure_id: ['', [Validators.required]],
      description: ['', []],
      peut_faire_retour: [false],
    })
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.userForm.controls; }

  get parsedUser(): any {
    try { return JSON.parse(this.currentUser || '{}'); } catch { return {}; }
  }

  /** Seul le super-admin global peut choisir la structure librement */
  get isGlobalAdmin(): boolean {
    return this.parsedUser?.profil?.code === 'admin';
  }

  /** Profil sélectionné dans le form (lookup dans this.profils) */
  get selectedProfilCode(): string {
    const id = this.userForm.get('profil')?.value;
    return this.profils.find(p => p.id == id)?.code?.toLowerCase() ?? '';
  }

  /** Affiche le toggle "Retours produits" pour les rôles non-admin */
  get showRetourPermission(): boolean {
    const code = this.selectedProfilCode;
    return code === 'gerant' || code === 'caissier' || code === 'vendeur';
  }

  get currentStructureId(): number | null {
    const u = this.parsedUser;
    return u?.structure?.[0]?.id ?? u?.structure_id ?? null;
  }
  
  ngOnInit(): void {
    
    this.currentUser = localStorage.getItem('user');
    
    this.userFind(JSON.parse(this.currentUser).profil.code, JSON.parse(this.currentUser)?.boutique_id);
    this.profilFind();
    this.structureFind();
    this.boutiqueFind(JSON.parse(this.currentUser)?.structure[0]?.id);
    
    
    // Configurer les tooltips pour qu'ils se réinitialisent correctement
    if (isPlatformBrowser(this.platformId)){
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
      
      // Écouter l'événement d'ouverture du modal pour initialiser/réinitialiser Select2
      $(document).on('shown.bs.modal', '#modal-fadein', () => {
        this.initializeSelect2();
      });
    }
  }

  /**
   * Initialise ou réinitialise les composants Select2 dans le modal
   */
  private initializeSelect2(): void {
    // Détruire les instances Select2 existantes si elles existent
    if ($('.js-example-basic-single').data('select2')) {
      $('.js-example-basic-single').select2('destroy');
    }
    if ($('.js-example-tags').data('select2')) {
      $('.js-example-tags').select2('destroy');
    }
    
    // Réinitialiser les Select2
    $('.js-example-basic-single').select2({
      dropdownParent: $('#modal-fadein'),
      placeholder: 'Sélectionnez un profil',
      allowClear: true
    });
    
    $('.js-example-tags').select2({
      dropdownParent: $('#modal-fadein'),
      placeholder: 'Sélectionnez une boutique',
      allowClear: true
    });

    // Gestionnaires d'événements pour les sélections
    $('.js-example-basic-single').on('select2:select', (e: any) => {
      const selectedValue = e.params.data.id;
      this.userForm.get('profil')?.setValue(selectedValue);
    });

    $('.js-example-basic-single').on('select2:unselect select2:clear', (e: any) => {
      this.userForm.get('profil')?.setValue('');
    });

    $('.js-example-tags').on('select2:select', (e: any) => {
      const selectedValue = e.params.data.id;
      this.userForm.get('boutique')?.setValue(selectedValue);
    });

    $('.js-example-tags').on('select2:unselect select2:clear', (e: any) => {
      this.userForm.get('boutique')?.setValue('');
    });

    // Mettre à jour les valeurs sélectionnées en fonction du formulaire
    if (this.usersData) {
      const profilId = this.userForm.get('profil')?.value;
      const boutiqueId = this.userForm.get('boutique')?.value;

      if (profilId) {
        $('.js-example-basic-single').val(String(profilId)).trigger('change');
      }
      if (boutiqueId) {
        $('.js-example-tags').val(String(boutiqueId)).trigger('change');
      }
    } else {
      $('.js-example-basic-single').val('').trigger('change');
      $('.js-example-tags').val('').trigger('change');
    }
  }

  openNewModal(): void {
    this.profilFind();
    this.userForm.reset();
    this.userForm.enable();
    this.isEditMode = false;
    this.usersData = null;
    this.titleModal = 'AJOUTER UN NOUVEAU UTILISATEUR';
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.isSubmitted = false;

    // Pré-remplir et verrouiller la structure pour les non-super-admins
    if (!this.isGlobalAdmin && this.currentStructureId) {
      this.userForm.get('structure_id')?.setValue(this.currentStructureId);
      this.userForm.get('structure_id')?.disable();
    }
  }

  openView(user: any): void {
    this.usersData = user;
    this.isEditMode = false;
    const title = `Visualiser le user [ ${user?.nom} ]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    this.isSubmitted = false;

    this.userForm.patchValue({
      nom: user.nom,
      prenoms: user.prenoms,
      email: user.email,
      telephone: user.telephone,
      description: user.description,
      profil: user.profil?.id || '',
      boutique: user.boutique_id || '',
      structure_id: user.structure_id || '',
      peut_faire_retour: !!user.peut_faire_retour,
    });
    this.userForm.disable();

    if (user.structure_id) this.boutiqueFind(user.structure_id);

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal) ?? new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEdit(user: any): void {
    this.usersData = user;
    this.userForm.enable();
    this.isEditMode = true;
    this.buttonText = 'Modifier';
    this.icon = 'bi bi-pencil-square';
    this.titleModal = `Modifier le user [${user?.nom}]`;
    this.isSubmitted = false;

    this.userForm.patchValue({
      nom: user.nom,
      prenoms: user.prenoms,
      email: user.email,
      telephone: user.telephone,
      description: user.description,
      profil: user.profil?.id || '',
      boutique: user.boutique_id || '',
      structure_id: user.structure_id || '',
      peut_faire_retour: !!user.peut_faire_retour,
    });

    // Toujours verrouiller la structure pour les non-super-admins
    if (!this.isGlobalAdmin) {
      this.userForm.get('structure_id')?.disable();
    }

    if (user.structure_id) this.boutiqueFind(user.structure_id);

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal) ?? new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  public userFind(profilCode: string, boutiqueId: string) {
    
    this.isLoading = true;

    this.souscription.add(
      this.userService.find(profilCode, boutiqueId).subscribe({
        next: (response: any) => {
          this.users = response.data;
          // D'abord, détruisons l'instance DataTable sans vider la table
          this.destroyDataTable();
          
          // Donner le temps au DOM de se mettre à jour
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              try {
                // Réinitialiser le tableau avec les nouvelles données
                this.initDataTable();
              } catch (error) {
                console.error('Erreur lors de la réinitialisation de DataTable:', error);
              }
              this.isLoading = false;
            }
          }, 50); // Temps d'attente réduit pour une mise à jour plus rapide
        },
        error: (err: any) => {
          console.error('Erreur lors de la récupération des users :', err);
        },
        complete: () => {
          console.log('Récupération des users terminée.');
        }
      })
    );
  }

  saveOrUpdate(): void {

    // console.log('this.selectedProfil', this.selectedProfil);
    
    this.isSubmitted = true;
   
    // arrêter ici si le formulaire est invalide
    if (this.userForm.invalid) {
      return;
    }
    
    let request;
    //const user = this.userForm.value;
    if (this.isEditMode && this.usersData) {
      request = this.userService.update(this.userForm.getRawValue(), this.usersData.id);
    } else {
      request = this.userService.create(this.userForm.getRawValue());
    }
  
    // Afficher l'indicateur de chargement sans masquer le tableau
    this.isLoading = true;

    request.pipe(first()).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          // Fermer le modal
          this.isLoading = false;
          const modal = document.getElementById('modal-fadein');
          if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            } 
          }

          this.toastr.success(this.isEditMode ? 
            'user modifiée avec succès' : 
            'user ajoutée avec succès');
            
          // Recharger les données sans détruire complètement le tableau
          this.userFind(JSON.parse(this.currentUser).profil.code, JSON.parse(this.currentUser)?.boutique_id);

          // Réinitialiser le formulaire et les états
          this.userForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.usersData = null;
        } else {
          this.isLoading = false;
          this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        }
      },
      error: (error: any) => {
        const msg = error?.error?.message || error?.message || 'Une erreur est survenue lors de la sauvegarde';
        this.toastr.error(msg);
        this.isLoading = false;
      }
    });
  }

  private destroyDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const table = $('.js-dataTable-buttons');
        if ($.fn.DataTable.isDataTable(table)) {
          table.DataTable().destroy();
          // Ne pas vider la table pour conserver les en-têtes
        }
      } catch (error) {
        console.error('Erreur lors de la destruction de DataTable:', error);
      }
    }
  }

  /**
   * Initialise une instance DataTable
   */
  private initDataTable(): void {
    
    if (isPlatformBrowser(this.platformId)) {
      try {
        $('.js-dataTable-buttons').DataTable({
          data: this.users, // Fournir les données directement
          columns: [
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data.toUpperCase() || ''}</span>` 
            },
            { 
              data: 'prenoms',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            { 
              data: 'profil',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => {
                if (!data) return '<span class="badge bg-secondary">Non défini</span>';

                let badgeClass = 'bg-secondary';
                switch (data.code) {
                  case 'admin':
                    badgeClass = 'bg-danger'; // rouge
                    break;
                  case 'responsable_structure':
                    badgeClass = 'bg-primary'; // bleu
                    break;
                  case 'gerant':
                    badgeClass = 'bg-success'; // vert
                    break;
                  case 'user':
                    badgeClass = 'bg-warning text-dark'; // jaune
                    break;
                }

                return `<span class="badge ${badgeClass}">${data.nom}</span>`;
              }
            },
            { 
              data: 'boutique',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data?.nom || '-' 
            },
            { 
              data: 'created_at',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              }
            },
            { 
              data: null,
              className: 'text-center',
              width: '15%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                return `<div class="usr-actions">
                  <button class="usr-act-btn usr-act-blue" title="Visualiser" data-action="view" data-id="${row.id}"><i class="bi bi-eye"></i></button>
                  <button class="usr-act-btn usr-act-slate" title="Modifier" data-action="edit" data-id="${row.id}"><i class="bi bi-pencil"></i></button>
                  <button class="usr-act-btn usr-act-red" title="Supprimer" data-action="delete" data-id="${row.id}"><i class="bi bi-trash"></i></button>
                </div>`;
              }
            }
          ],
          language: {
            emptyTable: 'Aucun utilisateur trouvé',
            search: '',
            searchPlaceholder: 'Rechercher un utilisateur…',
            info: '_START_–_END_ sur _TOTAL_',
            infoEmpty: 'Aucun résultat',
            zeroRecords: 'Aucun résultat',
            lengthMenu: 'Afficher _MENU_ éléments',
            paginate: { first: '«', last: '»', next: '›', previous: '‹' },
          },
          dom: '<"usr-dt-top"<"usr-dt-exports"B>f>t<"usr-dt-bottom"ip>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'usr-export-btn usr-export-excel',
              exportOptions: { columns: [0, 1, 2, 3, 4] }
            },
            {
              extend: 'pdf',
              text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
              className: 'usr-export-btn usr-export-pdf',
              exportOptions: { columns: [0, 1, 2, 3, 4] }
            }
          ],
          pageLength: 10,
          searching: true,
          info: true,
          responsive: true,
          ordering: true,
          pagingType: 'simple_numbers',
          stateSave: false,
          retrieve: false,
          autoWidth: false,
          drawCallback: () => {},
          createdRow: (row: any, data: any, dataIndex: any) => {
            // Ajouter les gestionnaires d'événements pour les actions
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const user = this.users.find((c: any) => c.id === id);
              
              
              if (!user) return;
              
              switch (action) {
                case 'view':
                  this.openView(user);
                  break;
                case 'edit':
                  this.openEdit(user);
                  break;
                case 'delete':
                  //this.deleteCategorie(categorie);
                  break;
              }
            });
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de DataTable:', error);
      }
    }
  }

  profilFind(){
    this.souscription.add(
      this.profilService.find().subscribe({
        next: (response: any = {})=> {
          const isSuperAdmin = this.parsedUser?.profil?.code === 'super_admin';
          this.profils = isSuperAdmin
            ? response.data
            : (response.data ?? []).filter((p: any) => p.code !== 'super_admin');
        },error: (error: any) => {
          console.error('Erreur lors du chargement des profils:', error);
        }
      })
    );
  }

  boutiqueFind(structure: number){
    this.souscription.add(
      this.boutiqueService.find(structure).subscribe({
        next: (response: any = {})=> { this.boutiques = response.data;}
      })
    );
  }

  structureFind(): void {
    this.souscription.add(
      this.structureService.find().subscribe({
        next: (response: any) => { this.structures = response?.data ?? []; },
      })
    );
  }

  onStructureChange(structureId: any): void {
    this.userForm.get('boutique')?.setValue('');
    if (structureId) this.boutiqueFind(+structureId);
  }

  onBoutiqueChange(boutiqueId: any): void {
    this.userFind(this.parsedUser.profil.code, boutiqueId || this.parsedUser?.boutique_id);
  }

  ngOnDestroy(): void {
    this.souscription.unsubscribe();
  }
  
}
