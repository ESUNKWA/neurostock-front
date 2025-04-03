import { Component, ElementRef, Inject, inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProfilService } from '../../../services/profil/profil.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
declare var $: any;

@Component({
  selector: 'app-profil',
  imports: [CommonModule],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss'
})
export class ProfilComponent implements OnInit {

  souscription: Subscription = new Subscription();
  //Injection des services
  profils: any = inject(ProfilService);
  listeProfil: any [] = [];
  

  isLoading: boolean = false;
  isEditMode: boolean = false;
  selectedCategorie: any = null;
  titleModal: string = 'AJOUTER UNE CATEGORIE';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';

  isSubmitted: boolean = false;

  @ViewChild('dataTable', { static: false }) table!: ElementRef;

  constructor(@Inject(PLATFORM_ID) private platformId: any){}

  ngOnInit(): void {
    
    this.getProfil();

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
    this.selectedCategorie = null;
    const title = 'Ajouter une catégorie';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.isSubmitted = false;
  }

  public getProfil() {
    this.souscription.add(
      this.profils.find().subscribe({
        next: (response: any) => {
          this.listeProfil = response.data;
          console.log('Profils récupérés :', this.listeProfil);
          
          
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
          data: this.listeProfil, // Fournir les données directement
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
            emptyTable: "Aucune donnée",
            info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
            infoEmpty: "Affichage de 0 à 0 sur 0 entrée",
            infoFiltered: "(filtré de _MAX_ entrées au total)",
            infoThousands: ",",
            lengthMenu: "Afficher _MENU_ entrées",
            loadingRecords: "Chargement...",
            processing: "Traitement...",
            search: "Rechercher :",
            zeroRecords: "Aucun enregistrement trouvé",
            paginate: {
              first: '<i class="bi bi-chevron-double-left"></i>',
              last: '<i class="bi bi-chevron-double-right"></i>',
              next: '<i class="bi bi-chevron-right"></i>',
              previous: '<i class="bi bi-chevron-left"></i>'
            }
          },
          dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
               '<"row"<"col-sm-12"tr>>' +
               '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          pageLength: 5,
          searching: true,
          info: true,
          lengthChange: true,
          responsive: true,
          ordering: true,
          pagingType: 'full_numbers',
          stateSave: false, // Ne pas sauvegarder l'état
          retrieve: false, // Forcer la création d'une nouvelle instance
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
              const categorie = this.profils.find((c: any) => c.id === id);
              
              if (!categorie) return;
              
              switch (action) {
                case 'view':
                  //this.openNewModal(categorie);
                  break;
                case 'edit':
                  //this.openEditCategorie(categorie);
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
}
