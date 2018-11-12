import { Component, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { WorkspaceComponent } from './workspace/workspace.component';
import { FilesComponent } from './workspace/pages/files.component';
import { HomeComponent } from './workspace/pages/home.component';
import { AuthGuard } from './auth/auth.guard';
import { ModelerComponent } from './modeler/modeler.component';
import { RedirectComponent } from './redirect.component';

const routes: Routes = [
  { path: 'home', component: WorkspaceComponent,
    children: [
      { path: '', component: HomeComponent},
    ]
  },
  { path: 'home/login', component: WorkspaceComponent,
    data: {showLogin: true},
    children: [
      { path: '', component: HomeComponent},
    ]
  },
  { path: 'files', component: WorkspaceComponent, canActivate: [ AuthGuard ],
    children: [
      { path: '', component: FilesComponent},
    ]
  },
  { path: 'redirect', component: RedirectComponent},
  { path: 'modeler/:id', component: ModelerComponent, canActivate: [ AuthGuard ]},
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', component: Component},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AuthGuard],
})
export class AppRoutingModule { }
