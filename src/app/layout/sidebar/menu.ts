export const Menu: any = [
    {   
        full: false,
        menu: [
            {
                libelle: 'Tableau de bord',
                lien: '/dashboard',
                icon: 'bi bi-grid'
            }
        ]
        
    },
    {
        titre: 'Parametrages',
        full: true,
        menu: [
            {
                
                libelle: 'Gestion des produits',
                icon: 'bi bi-menu-button-wide',
                target: 'products-nav',
                sousMenu: [
                    {
                        libelle: 'Catégories',
                        lien: '/gestion-des-produits/categorie',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Fournisseurs',
                        lien: '/gestion-des-produits/fournisseur',
                        icon: 'bi bi-circle'
                    },{
                        libelle: 'Produits',
                        lien: '/gestion-des-produits/produit',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                
                libelle: 'Gestion des boutiques',
                icon: 'bi bi-houses',
                target: 'boutique-nav',
                sousMenu: [
                    {
                        libelle: 'Structure',
                        lien: '/structure/list',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Boutiques',
                        lien: '/structure/boutiques',
                        icon: 'bi bi-circle'
                    }
                ]
            }
        ]
    },
   
    {
        titre: 'Gestion des stocks',
        full: true,
        menu: [
            {
                
                libelle: 'Approvisionnements',
                icon: 'bi bi-cart4',
                target: 'achats-nav',
                sousMenu: [
                    {
                        libelle: 'Nouveau',
                        lien: '/gestion-des-approvisionnements/approvisionnement',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Consulter',
                        lien: '/gestion-des-approvisionnements/historique-approvisionnements',
                        icon: 'bi bi-circle'
                    }
                ]
            },{
                
                libelle: 'Gestion des ventes',
                icon: 'bi bi-currency-dollar',
                target: 'ventes-nav',
                sousMenu: [
                    {
                        libelle: 'Nouvelle ventes',
                        lien: '/gestion-des-ventes/vente',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Clients',
                        lien: '',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Historique des ventes',
                        lien: '/gestion-des-ventes/historique-ventes',
                        icon: 'bi bi-circle'
                    }
                ]
            }
        ]
    },
    {
        titre: 'Gestion des utilisateurs',
        full: true,
        menu: [
            {
                
                libelle: 'Utilisateurs',
                icon: 'bi bi-person-workspace',
                target: 'users-nav',
                sousMenu: [
                    {
                        libelle: 'Profil',
                        lien: '/utilisateurs/profils',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Utilisateurs',
                        lien: '/utilisateurs/list',
                        icon: 'bi bi-circle'
                    }
                ]
            }
        ]
    }
];