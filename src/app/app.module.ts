import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { ModelerComponent } from './modeler/modeler.component';
import { ViewerComponent } from './viewer/viewer.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { FilesComponent } from './workspace/pages/files.component';
import { OwnFilesComponent } from './workspace/templates/ownFiles.component';
import { SharedFilesComponent } from './workspace/templates/sharedFiles.component';
import { MovePobjectsComponent } from './workspace/templates/move.component';

import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';

import { RouterModule, Routes } from '@angular/router';
import { RouteService } from "app/route/route.service";

const appRoutes: Routes = [
  {
    path: "",
    component: WorkspaceComponent
  },
  {
    path: "**",
    component: WorkspaceComponent
  }
];

@NgModule({
  declarations: [
    AppComponent,
    ModelerComponent,
    ViewerComponent,
    WorkspaceComponent,
    FilesComponent,
    OwnFilesComponent,
    SharedFilesComponent,
    MovePobjectsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(appRoutes)
    ],
  providers: [AuthService, UserService, RouteService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
