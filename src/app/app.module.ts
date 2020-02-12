import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ModelerComponent } from './modeler/modeler.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { FilesComponent } from './workspace/pages/files.component';
import { FileListItemComponent } from './workspace/templates/file-list-item.component';
import { OwnFilesComponent } from './workspace/templates/ownFiles.component';
import { SharedFilesComponent } from './workspace/templates/sharedFiles.component';

import { PublishFolderFormComponent } from './workspace/forms/publish-folder-form.component';
import { ShareItemFormComponent} from './workspace/forms/share-item-form.component';
import { MoveItemFormComponent} from './workspace/forms/move-item-form.component';

import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { ApiService } from './api.service';

import { AppRoutingModule } from './app-routing.module';

import { NguiAutoCompleteModule} from '@ngui/auto-complete';
import { HomeComponent } from './workspace/pages/home.component';
import { RedirectComponent } from './redirect.component';
import { ToastrModule } from 'ngx-toastr';
import { CompositionModelerModule } from './composition-modeler/composition-modeler.module';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    RedirectComponent,
    ModelerComponent,
    WorkspaceComponent,
    FilesComponent,
    FileListItemComponent,
    OwnFilesComponent,
    SharedFilesComponent,
    PublishFolderFormComponent,
    ShareItemFormComponent,
    MoveItemFormComponent
  ],
  imports: [
    CompositionModelerModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NguiAutoCompleteModule,
    AppRoutingModule,
    ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
    })
    ],
  providers: [AuthService, UserService, ApiService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
