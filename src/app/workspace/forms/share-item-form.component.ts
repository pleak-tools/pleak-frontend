import { Component, NgZone } from '@angular/core';
import { ApiService } from 'app/api.service';
import { AuthService } from 'app/auth/auth.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import 'rxjs/add/operator/finally';

declare var $: any;

@Component({
  selector: 'app-share-item-form',
  templateUrl: './share-item-form.component.html',
})
export class ShareItemFormComponent {

  saving: boolean;
  error: string;
  pobject: any;
  directory: any;
  newPermissionForm: FormGroup;
  existingEmails: Array<string> = [];

  constructor(private fb: FormBuilder, private authService: AuthService, private apiService: ApiService, private zone: NgZone) {
    this.createForm();
  }

  initModal(pobject, directory, emails: Array<string>) {

    this.pobject = pobject;
    this.directory = directory;
    this.existingEmails = emails;

    this.createForm();

    const permissionFGs = this.pobject.permissions.map(permission => this.fb.group(permission));
    this.newPermissionForm.setControl('permissions', this.fb.array(permissionFGs));

    let $selector = $('#shareItemForm');

    $selector.modal({
      keyboard: false,
      backdrop: 'static'
    });

    let clearModal = () => {
      this.zone.run(() => {
        this.clearModal();
      });
      $selector.off('hidden.bs.modal', clearModal);
    };

    $selector.on('hidden.bs.modal', clearModal);
  }

  closeModal() {
    if (this.permissions.pristine || confirm('Permission changes will be lost. Close anyway?')) {
      $('#shareItemForm').modal('hide');
    }

  }

  clearModal() {
    this.pobject = undefined;
    this.directory = undefined;
    this.existingEmails = [];
    this.newPermissionForm.reset();
  }

  canEditShare(fp) {
    return (this.getCurrentUserEmail() !== fp.user.email) &&
      (this.pobject.user.email !== fp.user.email) &&
      (this.pobject.directory && !this.userCanEditByPobjectIdAndUser(fp.user));
  }

  addPermission() {
    this.clearError();

    this.apiService.userExists(this.newPermissionForm.value.email).subscribe(
      () => {

        let exists = false;

        for (let item of this.permissions.controls) {
          if (item.value.user.email === this.newPermissionForm.value.email) {
            item.patchValue({
              action: {title: this.newPermissionForm.value.action},
            });
            item.markAsDirty();
            exists = true;
          }
        }

        if (!exists) {
          this.permissions.push(this.fb.group({
            action: {title: this.newPermissionForm.value.action},
            user: {email: this.newPermissionForm.value.email}
          }));
          this.permissions.markAsDirty();
        }

        this.newPermissionForm.get('email').reset();
        this.newPermissionForm.get('action').reset('view');
      },
      (fail) => {
        this.error = fail.error.localizedMessage;
      }
    );
  }

  clearError() {
    this.error = undefined;
  }

  savePermissions() {
    this.saving = true;

    this.apiService[this.pobject.type === 'file' ? 'updateFile' : 'updateDirectory'](this.pobject, {permissions: this.permissions.getRawValue()})
      .finally(() => {
        this.saving = false;
        $('#shareItemForm').modal('hide');
      })
      .subscribe();
  }

  get permissions(): FormArray {
    return this.newPermissionForm.get('permissions') as FormArray;
  }

  private createForm() {
    this.newPermissionForm = this.fb.group({
      email: ['', Validators.email],
      action: 'view',
      permissions: this.fb.array([])
    });

    this.clearError();
  }

  private getCurrentUserEmail() {
    return this.authService.getUserEmail();
  }

  private userCanEditByPobjectIdAndUser(user) {
    let file = this.directory;

    if (file) {
      if (user && file.user.id === parseInt(user.id)) {
        return true;
      }

      for (let item of file.permissions) {
        if ((item.action.title === 'edit' || item.action.title === 'view') && user ? item.user.id === parseInt(user.id) : false) {
          return true;
        }
      }

      return false;
    }
    return false;
  }


}
