import { Routes } from "@angular/router"
import { ProfilComponent } from "./profil/profil.component";
import { UsersComponent } from "./users/users.component";
import { EditUserInfoComponent } from "./edit-user-info/edit-user-info.component";


export const UsersRoutes: Routes = [
    {path: "",redirectTo: "list",pathMatch: "full"},
    {path: 'list', component: UsersComponent, title: 'neurostock | Utilisateurs'},
    {path: 'profils', component: ProfilComponent, title: 'neurostock | Profil'},
    {path: 'edit-user-info', component: EditUserInfoComponent, title: 'neurostock | Informations utilisateur'}
];