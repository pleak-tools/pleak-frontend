import { Component, Input, NgZone } from '@angular/core';
import { ApiService } from 'app/api.service';
import { FilesComponent } from 'app/workspace/pages/files.component';
import { AuthService } from 'app/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

declare var $: any;

@Component({
  selector: 'app-move-item-form',
  templateUrl: './move-item-form.component.html',
})
export class MoveItemFormComponent {

  Math: Math = Math;
  @Input() filesComponent: FilesComponent;
  pobject: any;
  rootDir: any;
  sharedDir: any;
  target: any;
  saving = false;
  tab = 'own';

  constructor(private apiService: ApiService, private authService: AuthService, private zone: NgZone, private toastr: ToastrService) {
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
    }).pipe(
      finalize(() => {
        this.saving = false;
        $('#moveItemForm').modal('hide');
      }))
      .subscribe(
        () => {
          let oldOpenStateShared = MoveItemFormComponent.getOpenDirsSet(this.filesComponent.getShared())
          let oldOpenStateRoot = MoveItemFormComponent.getOpenDirsSet(this.filesComponent.getRoot())

          this.filesComponent.getSharedDirectory(oldOpenStateShared);
          this.filesComponent.getRootDirectory(oldOpenStateRoot);

          if (this.pobject.type === 'file')
            this.toastr.success('File moved');
          else
            this.toastr.success('Directory moved');
        }
      );
  }

  canMove(pobject, destination) {
    // Can not move pobject into file
    if (destination.type === 'file') {
      return false;
      // Can not move pobject into itself
    } else if (pobject.id === destination.id) {
      return false;
      // Can move pobjects to root directory
    } else if (destination.title === 'root') {
      return true;
      // Can move files to all directories
    } else if (pobject.type === 'file') {
      return true;
    }
    // Can not move directories into their child directories to prevent infinity
    for (let pIx = 0; pIx < pobject.pobjects.length; pIx++) {
      if (pobject.pobjects[pIx].id === destination.id) {
        return false;
      } else if (!this.canMove(pobject.pobjects[pIx], destination)) {
        return false;
      }
    }
    return true;
  }

  static getOpenDirsSet(fromRoot): Set<number> {
    let open: Set<number> = new Set();

    // BFS throught the dirs tree

    let visited: Set<number> = new Set()
    let qFrom = new Array<any>();

    visited.add(fromRoot.id);
    qFrom.push(fromRoot);

    while (qFrom.length > 0) {
      const vFrom = qFrom.shift();
      if (vFrom.hasOwnProperty("open") && vFrom.open) {
        open.add(vFrom.id)
      }
      if (vFrom.hasOwnProperty("pobjects")) {        
        for (let child of vFrom.pobjects) {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            qFrom.push(child);
          }
        }
      }
    }
    return open;
  }

  static copyStateToTree(root, openDirs:Set<number>) {
    // BFS throught the dirs tree

    let visited: Set<number> = new Set()
    let qTo = new Array<any>();

    visited.add(root.id);;
    qTo.push(root);

    while (qTo.length > 0) {
      let vTo = qTo.shift();
      if(openDirs.has(vTo.id)) {
        vTo.open = true;
      }
      if (vTo.hasOwnProperty("pobjects")) {        
        for (let child of vTo.pobjects) {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            qTo.push(child);
          }
        }
      }
    }
  }
}
