import { Component, ElementRef, Inject, inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { first, Subscription } from 'rxjs';
import { ProfilService } from '../../../services/profil/profil.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-profil',
  imports: [CommonModule, ReactiveFormsModule],
  providers: [ToastrService],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss'
})
export class ProfilComponent implements OnInit, OnDestroy {

  souscription: Subscription = new Subscription();
  profilForm: FormGroup;

  //Injection des services
  profilService: any = inject(ProfilService);
  fb: any = inject(FormBuilder);
  toastr = inject(ToastrService)

  profils: any [] = [];
  profilData: any = {};

  isLoading: boolean = false;
  isEditMode: boolean = false;
  titleModal: string = 'AJOUTER UN NOUVEAU PROFIL';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';

  
  isSubmitted: boolean = false;

  @ViewChild('dataTable', { static: false }) table!: ElementRef;
  

  constructor(@Inject(PLATFORM_ID) private platformId: any){
    this.profilForm = this.fb.group({
      code: ['', Validators.required],
      nom: ['', [Validators.required]],
      description: ['', []]
    })
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.profilForm.controls; }

  ngOnInit(): void {
    
    this.profilFind();

    // Configurer les tooltips pour qu'ils se réinitialisent correctement
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            $('[data-bs-toggle="tooltip"]').tooltip({
              trigger: 'hover'
            });
          }, 500);
        }
  }

  openNewModal(): void {
    this.isEditMode = false;
    this.profilData = null;
    const title = 'Ajouter un nouveau profil';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.isSubmitted = false;
    this.profilForm.reset();
  }

  openView(profil: any): void {
    this.profilData = profil;
    const title = `Visualiser le profil [ ${profil?.nom} ]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    this.profilForm.reset();
    this.isSubmitted = false;
    
    this.profilForm.patchValue(profil);
    this.profilForm.disable();

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEdit(profil: any): void {
    this.profilData = profil;
    this.profilForm.patchValue(profil);
    this.profilForm.enable();
    this.isEditMode = !!profil;
    this.buttonText = this.isEditMode ? 'Modifier' : 'Enregistrer';
    this.icon = this.isEditMode ? 'bi bi-pencil-square' : 'ri ri-save-3-line';
    const title = `Modifier le profil [${profil?.nom}]`;
    this.titleModal = title;

    this.isSubmitted = false;

    // Ouvrir le modal
    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  public profilFind() {
    
    this.isLoading = true;

    this.souscription.add(
      this.profilService.find().subscribe({
        next: (response: any) => {
          this.profils = response.data;
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
          console.error('Erreur lors de la récupération des profils :', err);
        },
        complete: () => {
          console.log('Récupération des profils terminée.');
        }
      })
    );
  }
  

  saveOrUpdate(): void {
    this.isSubmitted = true;
   
    // arrêter ici si le formulaire est invalide
    if (this.profilForm.invalid) {
      return;
    }
    
    let request;
    //const profil = this.profilForm.value;
    if (this.isEditMode && this.profilData) {
      // Mode modification
      request = this.profilService.update(this.profilForm.value, this.profilData.id);
    } else {
      // Mode création
      request = this.profilService.create(this.profilForm.value);
    }

    // Afficher l'indicateur de chargement sans masquer le tableau
    this.isLoading = true;

    request.pipe(first()).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          // Fermer le modal
          const modal = document.getElementById('modal-fadein');
          if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            } 
          }

          this.toastr.success(this.isEditMode ? 
            'Profil modifiée avec succès' : 
            'Profil ajoutée avec succès');

          // Recharger les données sans détruire complètement le tableau
          this.profilFind();

          // Réinitialiser le formulaire et les états
          this.profilForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.profilData = null;
        } else {
          this.isLoading = false;
          this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        }
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.toastr.error('Une erreur est survenue lors de la sauvegarde');
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
          data: this.profils, // Fournir les données directement
          columns: [
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data.toUpperCase() || ''}</span>` 
            },
            { 
              data: 'description',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data.toUpperCase() || 'Non définie' 
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
                return `
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-info me-2" data-bs-toggle="tooltip" title="visualiser" data-action="view" data-id="${row.id}">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-success me-2" data-bs-toggle="tooltip" title="Modifier" data-action="edit" data-id="${row.id}">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" data-bs-toggle="tooltip" title="Supprimer" data-action="delete" data-id="${row.id}">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                `;
              }
            }
          ],
          language: {
            emptyTable: 'Aucun profil trouvé',
            search: 'Rechercher :',
            info: 'Affichage de _START_ à _END_ sur _TOTAL_ résultat(s)',
            infoEmpty: 'Aucun résultat',
            zeroRecords: 'Aucun résultat',
            lengthMenu: 'Afficher _MENU_ éléments',
            paginate: { first: '«', last: '»', next: '›', previous: '‹' },
          },
          dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          buttons: [
          {
            extend: 'excel',
            text: '<i class="bi bi-file-earmark-excel"></i> Excel',
            className: 'btn btn-success btn-sm me-1',
            exportOptions: {
              columns: [0, 1, 2] // Exporter uniquement les colonnes Nom, Description et Date
            }
          },
          {
            extend: 'pdf',
            text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
            className: 'btn btn-danger btn-sm',
            exportOptions: {
              columns: [0, 1, 2] // Exporter uniquement les colonnes Nom, Description et Date
            }
          }
        ],
        pageLength: 10,
        searching: true,
        info: true,
        responsive: true,
        ordering: true,
        pagingType: 'full_numbers',
        stateSave: false,
        retrieve: false,
        autoWidth: false, // Désactiver l'ajustement automatique de la largeur pour plus de stabilité
          drawCallback: () => {
            // Réinitialiser les tooltips
            $('[data-bs-toggle="tooltip"]').tooltip();
          },
          createdRow: (row: any, data: any, dataIndex: any) => {
            // Ajouter les gestionnaires d'événements pour les actions
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const profil = this.profils.find((c: any) => c.id === id);
              
              
              if (!profil) return;
              
              switch (action) {
                case 'view':
                  this.openView(profil);
                  break;
                case 'edit':
                  this.openEdit(profil);
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

  ngOnDestroy(): void {
    this.souscription.unsubscribe();
  }
}
