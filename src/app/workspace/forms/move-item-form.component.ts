import { Component, Input, NgZone } from '@angular/core';
import { ApiService } from 'app/api.service';
import { FilesComponent } from 'app/workspace/pages/files.component';
import { AuthService } from 'app/auth/auth.service';

declare var $: any;

@Component({
  selector: 'app-move-item-form',
  templateUrl: './move-item-form.component.html',
})
export class MoveItemFormComponent {

  @Input() filesComponent: FilesComponent;
  pobject: any;
  rootDir: any;
  sharedDir: any;
  target: any;
  saving = false;
  tab = 'own';

  constructor(private apiService: ApiService, private authService: AuthService, private zone: NgZone) {
  }

  initModal(pobject, rootDir, sharedDir) {
    this.pobject = pobject;
    this.rootDir = rootDir;
    this.sharedDir = sharedDir;
    this.tab = 'own';

    let $selector = $('#moveItemForm');

    $selector.modal();

    let clearModal = () => {
      this.zone.run(() => {
        this.clearModal();
      });
      $selector.off('hidden.bs.modal', clearModal);
    };

    $selector.on('hidden.bs.modal', clearModal);
  }

  clearModal() {
    this.pobject = undefined;
    this.rootDir = undefined;
    this.sharedDir = undefined;
    this.target = undefined;
  }

  moveItem() {
    this.saving = true;

    let permissions = this.target.permissions.map(x => Object.assign({}, x));

    // If we move a file that we don't own, we want to keep edit rights to it.
    if (this.pobject.user.id !== Number(this.authService.user.sub)) {
      let exists = false;

      for (let item of permissions) {
        if (item.user.id === this.pobject.user.id) {
          item.action.title = 'edit';
          exists = true;
        }
      }

      if (!exists) {
        permissions.push({
          action: {title: 'edit'},
          user: {email: this.authService.user.email}
        });
      }
    }

    // if moving to someone elses folder we give them edit permissions
    if (this.target.user.id !== this.pobject.user.id) {
      let exists = false;

      for (let item of permissions) {
        if (item.user.id === this.target.user.id) {
          item.action.title = 'edit';
          exists = true;
        }
      }

      if (!exists) {
        permissions.push({
          action: {title: 'edit'},
          user: {email: this.target.user.email}
        });
      }
    }

    this.apiService[this.pobject.type === 'file' ? 'updateFile' : 'updateDirectory'](this.pobject, {
      directory: {id: this.target.id},
      permissions: permissions
    })
      .finally(() => {
        this.saving = false;
        $('#moveItemForm').modal('hide');
      })
      .subscribe(
        () => {
          this.filesComponent.getSharedDirectory();
          this.filesComponent.getRootDirectory();
        }
      );
  }

}