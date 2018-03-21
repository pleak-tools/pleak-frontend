import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Http } from '@angular/http';
import { AuthService } from 'app/auth/auth.service';
import * as moment from 'moment';
import { ShareItemFormComponent } from 'app/workspace/forms/share-item-form.component';
import { PublishFolderFormComponent } from 'app/workspace/forms/publish-folder-form.component';

declare var $: any;
declare function require(name: string);

let config = require('../../../config.json');

@Component({
  selector: 'app-workspace-files',
  templateUrl: './files.component.html'
})
export class FilesComponent implements OnInit {

  selectedPobject: object;

  @Input() authenticated: boolean;

  @ViewChild(ShareItemFormComponent) private shareItemForm: ShareItemFormComponent;
  @ViewChild(PublishFolderFormComponent) private publishFolderForm: PublishFolderFormComponent;

  private rootDir: any = {};
  private sharedDir: any = {};
  private files = null;
  private pobjects = null;
  public selected = null;
  private sort = 0;
  private userEmail = '';
  private search = '';
  private newPobjectTitle = '';
  public moveObjectId = null;
  private canExportModel = false;

  constructor(public http: Http, private authService: AuthService) {

    this.authService.authStatus.subscribe(status => {
      if (this.authenticated !== status) {
        this.getRootDirectory();
        this.getSharedDirectory();
      }
      this.authenticated = status;
    });

  }

  openShareItemModal(pobject) {

    let file = null;
    let fileInOwnFiles = this.getPobjectById(pobject.directory.id, this.getRoot());
    let fileInSharedFiles = this.getPobjectById(pobject.directory.id, this.getShared());
    if (fileInOwnFiles) {
      file = fileInOwnFiles;
    } else if (fileInSharedFiles) {
      file = fileInSharedFiles;
    }

    let emails = [];

    let recursiveSearch = (directory) => {
      for (let item of directory.pobjects) {
        for (let permission of item.permissions) {
          emails.push(permission.user.email);
        }
        if (item.type === 'directory') {
          recursiveSearch(item);
        }
      }
    };

    recursiveSearch(this.rootDir);
    recursiveSearch(this.sharedDir);

    emails = emails.filter((value, index, self) => self.indexOf(value) === index ).sort();

    this.shareItemForm.initModal(pobject, file, emails);

  }

  openPublishFolderModal(pobject) {
    this.publishFolderForm.initModal(pobject);
  }

  isAuthenticated() {
    return this.authenticated;
  }

  getRoot() {
    return this.rootDir;
  }

  getShared() {
    return this.sharedDir;
  }

  getCurrentUserEmail() {
    return this.authService.getUserEmail();
  }

  setSearchInput(value: string) {
    this.search = value;
  }

  setShareUserEmail(email) {
    this.userEmail = email;
  }

  setNewPobjectTitle(title) {
    this.newPobjectTitle = title;
  }

  /** BACK-END RELATED FUNCTIONS */

  getRootDirectory() {
    this.http.get(config.backend.host + '/rest/directories/root', this.authService.loadRequestOptions()).subscribe(
      success => {
        this.rootDir = JSON.parse((<any>success)._body);
        this.createPublicUrls(this.rootDir);
        this.rootDir.open = true;
      }
    );
  }

  getSharedDirectory() {
    this.http.get(config.backend.host + '/rest/directories/shared', this.authService.loadRequestOptions()).subscribe(
      success => {
        this.sharedDir = JSON.parse((<any>success)._body);
        this.createPublicUrls(this.sharedDir);
      }
    );
  }

  createDirectoryREST(directory, parent, callback) {
    this.http.post(config.backend.host + '/rest/directories', directory, this.authService.loadRequestOptions()).subscribe(
      success => {
        let data = JSON.parse((<any>success)._body);
        parent.pobjects.push(data);
        parent.open = true;
        callback.success(data);
      },
      fail => {
        let data = JSON.parse((<any>fail)._body);
        callback.error(data);
      }
    );
  }

  updateDirectoryREST(newDirectory, oldDirectory, callback) {
    let self = this;
    this.http.put(config.backend.host + '/rest/directories/' + newDirectory.id, newDirectory, this.authService.loadRequestOptions()).subscribe(
      success => {
        let data = JSON.parse((<any>success)._body);
        let oldParentId = oldDirectory.directory.id;
        oldDirectory.id = data.id;
        oldDirectory.title = data.title;
        oldDirectory.directory = data.directory;
        oldDirectory.permissions = data.permissions;
        oldDirectory.pobjects = data.pobjects;
        callback.success(data, oldParentId, self);
      },
      fail => {
        let data = JSON.parse((<any>fail)._body);
        callback.error(data);
      }
    );
  }

  deleteDirectoryREST(id) {
    this.http.delete(config.backend.host + '/rest/directories/' + id, this.authService.loadRequestOptions()).subscribe(
      success => {
        this.deletePobjectById(id, this.rootDir);
        this.triggerLocalStorageChangeEvent();
      },
      fail => {
      }
    );
  }

  createFileREST(file, parent, callback, location) {
    this.http.post(config.backend.host + '/rest/directories/files/', file, this.authService.loadRequestOptions()).subscribe(
      success => {
        let data = JSON.parse((<any>success)._body);
        data.md5Hash = null;
        data.content = null;
        parent.pobjects.unshift(data);
        parent.open = true;
        if (location === 'shared') {
          this.setShareUserEmail(parent.user.email);
          this.addRightsREST(data, 'edit', true);
        }
        callback.success(data);
      },
      fail => {
        callback.error(fail);
      }
    );
  }

  updateFileREST(newFile, oldFile, callback) {
    let self = this;
    this.http.put(config.backend.host + '/rest/directories/files/' + newFile.id, newFile, this.authService.loadRequestOptions()).subscribe(
      success => {
        let data = JSON.parse((<any>success)._body);
        let oldParentId = oldFile.directory.id;
        oldFile.directory = data.directory;
        oldFile.id = data.id;
        oldFile.lastModified = data.lastModified;
        oldFile.modifiedBy = data.modifiedBy;
        oldFile.permissions = data.permissions;
        oldFile.published = data.published;
        oldFile.uri = data.uri;
        oldFile.title = data.title;
        oldFile.user = data.user;
        this.createPublicUrl(oldFile);
        callback.success(data, oldParentId, self);
      },
      fail => {
        let data = JSON.parse((<any>fail)._body);
        callback.error(data);
      }
    );
  }

  deleteFilePermissions(pobject) {
    this.http.delete(config.backend.host + '/rest/directories/files/permissions/' + pobject.id, this.authService.loadRequestOptions()).subscribe(
      success => {
        this.unShareFileWithUser(pobject, this.sharedDir)
      },
      fail => {
      }
    );
  }

  deleteFileREST(id) {
    let fileInOwnFiles = this.getPobjectById(id, this.getRoot());
    let fileInSharedFiles = this.getPobjectById(id, this.getShared());
    this.http.delete(config.backend.host + '/rest/directories/files/' + id, this.authService.loadRequestOptions()).subscribe(
      success => {
        if (fileInOwnFiles) {
          this.deletePobjectById(id, this.rootDir);
        }
        if (fileInSharedFiles) {
          this.deletePobjectById(id, this.sharedDir);
        }
      },
      fail => {
      }
    );
  }

  addRightsREST(file, rights, callback) {
    let self = this;
    this.http.post(config.backend.host + '/rest/user/exists', {email: this.userEmail}, this.authService.loadRequestOptions()).subscribe(
      success => {
        $('.form-group.input-group').removeClass('has-error');
        $('.error-block').hide();
        self.sharePobjectWithUser(file, rights);
        if (callback) {
          self.sharePobject(file, rights);
        }
      },
      fail => {
        $('.form-group.input-group').addClass('has-error');
        $('.error-block').show();
        $('input[type=email]').focus();
      }
    );
  }

  /* TEMPLATE FUNCTIONS */

  sharePobject(pobject, userRights) {
    var self = this;
    if (self.userEmail && self.userEmail.length > 0) {
      self.addRightsREST(pobject, userRights, true);
    } else {
      var newPobject= Object.assign({}, pobject);
      delete newPobject.open;
      if (this.isPobjectFile(pobject)) {
        delete newPobject.publicUrl;
        this.updateFileREST(newPobject, pobject, this.callbacks.shareFile);
      } else if (this.isPobjectDirectory(pobject)) {
        // sending generic classes as JSON to java is not smart enough, TODO: get better JSON<->POJO lib?
        newPobject.pobjects = [];
        this.updateDirectoryREST(newPobject, pobject, this.callbacks.shareDirectory);

      }
    }
  }

  removeOwnShare(pobjectId) {
    let pobject = this.getPobjectById(Number.parseInt(pobjectId), this.getShared());
    this.deleteFilePermissions(pobject);
  }

  movePobject(pobject) {
    var newPobject= Object.assign({}, pobject);
    newPobject.directory.id = this.selected.id;
    if (this.isOwner(pobject)) {
      newPobject.permissions = this.selected.permissions; // Inherit permissions of the new location folder
    } else if (pobject.directory && this.isOwnerByPobjectId(pobject.directory.id)) {
      newPobject.permissions = this.selected.permissions;
      if (!this.isOwner(pobject)) {
        this.setShareUserEmail(this.getCurrentUserEmail());
        this.addRightsREST(pobject, 'edit', true);
      }
    }
    delete newPobject.open;
    if (this.isPobjectFile(pobject)) {
      delete newPobject.publicUrl;
      this.updateFileREST(newPobject, pobject, this.callbacks.moveFile);
    } else if (this.isPobjectDirectory(pobject)) {
      newPobject.pobjects = [];
      this.updateDirectoryREST(newPobject, pobject, this.callbacks.moveDirectory);
    }
  }

  createDirectory(parentId) {
    var parent = this.getPobjectById(Number.parseInt(parentId), this.getRoot());
    if (this.getInversePobjectDepth(parent) > 3) return false;
    var newDirectory = {
      title: this.newPobjectTitle,
      directory: {
        id: parent.id
      }
    };
    this.createDirectoryREST(newDirectory, parent, this.callbacks.createDirectory);
  }

  renameDirectory(oldDirectoryId, title) {
    let oldDirectory = this.getPobjectById(Number.parseInt(oldDirectoryId), this.getRoot());
    var newDirectory= Object.assign({}, oldDirectory);
    newDirectory.title = title;
    // sending generic classes as JSON to java is not smart enough, TODO: get better JSON<->POJO lib?
    newDirectory.pobjects = [];
    delete newDirectory.open;
    this.updateDirectoryREST(newDirectory, oldDirectory, this.callbacks.renameDirectory);
  }

  deleteDirectory(id) {
    id = Number.parseInt(id);
    this.deleteDirectoryREST(id);
    $('#deleteDirectoryModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  }

  createFile(parentId) {
    let rootParent = this.getPobjectById(Number.parseInt(parentId), this.getRoot());
    let sharedParent = this.getPobjectById(Number.parseInt(parentId), this.getShared());
    if (rootParent) {
      let newFile = {
        title: this.addBpmn(this.newPobjectTitle),
        directory: {
          id: rootParent.id
        },
      };
      this.createFileREST(newFile, rootParent, this.callbacks.newFile, 'own');
    } else if (sharedParent) {
      let newFile = {
        title: this.addBpmn(this.newPobjectTitle),
        directory: {
          id: sharedParent.id
        },
      };
      this.createFileREST(newFile, sharedParent, this.callbacks.newFile, 'shared');
    }
  }

  renameFile(oldFileId, title) {
    let oldFileRoot = this.getPobjectById(Number.parseInt(oldFileId), this.getRoot());
    let oldFileShared = this.getPobjectById(Number.parseInt(oldFileId), this.getShared());
    if (oldFileRoot) {
      var newFile = Object.assign({}, oldFileRoot);
      delete newFile.publicUrl;
      delete newFile.open;
      newFile.title = this.addBpmn(title);
      this.updateFileREST(newFile, oldFileRoot, this.callbacks.renameFile);
    }
    if (oldFileShared) {
      var newFile = Object.assign({}, oldFileShared);
      delete newFile.publicUrl;
      delete newFile.open;
      newFile.title = this.addBpmn(title);
      this.updateFileREST(newFile, oldFileShared, this.callbacks.renameFile);
    }
  }

  publishFile(oldFile) {
    var newFile = Object.assign({}, oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.published = true;
    this.updateFileREST(newFile, oldFile, this.callbacks.publishFile);
  }

  unpublishFile(oldFile) {
    var newFile = Object.assign({}, oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.published = false;
    this.updateFileREST(newFile, oldFile, this.callbacks.publishFile);
  }

  deleteFile(id) {
    id = Number.parseInt(id);
    this.deleteFileREST(id);
    $('#deleteFileModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  }

  copyFile(oldFile) {
    var newFile = Object.assign({}, oldFile);
    let rootParent = this.getPobjectById(oldFile.directory.id, this.rootDir);
    let sharedParent = this.getPobjectById(oldFile.directory.id, this.sharedDir);
    if (!sharedParent && this.sharedDir.open) {
      sharedParent = this.sharedDir;
    }
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.title = this.addBpmn(this.removeBpmn(newFile.title) + " (copy)");
    newFile.permissions = [];
    newFile.published = false;
    if (this.sharedDir.open && sharedParent) {
      if (!this.isOwner(oldFile)) {
        if (this.canEditByPobjectId(oldFile.directory.id)) { //can edit parent directory
          this.createFileREST(newFile, sharedParent, this.callbacks.copySharedFile, 'shared');
        } else {
          delete newFile.directory.id;
          newFile.directory.title = 'root';
          this.createFileREST(newFile, this.rootDir, this.callbacks.copyOwnFile, 'own');
        }
      } else {
        if (this.canEditByPobjectId(oldFile.directory.id)) { //can edit parent directory
          this.createFileREST(newFile, sharedParent, this.callbacks.copySharedFile, 'shared');
        } else {
          delete newFile.directory.id;
          newFile.directory.title = 'root';
          this.createFileREST(newFile, this.rootDir, this.callbacks.copyOwnFile, 'own');
        }
      }
    } else if (!this.sharedDir.open && rootParent) {
      if (!this.isOwner(oldFile)) {
        this.createFileREST(newFile, rootParent, this.callbacks.copyOwnFile, 'shared');
      } else {
        this.createFileREST(newFile, rootParent, this.callbacks.copyOwnFile, 'own');
      }
    } else {
      delete newFile.directory.id;
      newFile.directory.title = 'root';
      this.createFileREST(newFile, this.rootDir, this.callbacks.copyOwnFile, 'own');
    }
  }

  callbacks = {
    createDirectory: {
      success: function(response) {
        $('#newDirectoryModal').modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      error: function(response) {
        $('.directory-name-input').addClass('has-error');
        $('.directory-name-error').show();
      }
    },
    renameDirectory: {
      success: function(response) {
        $('#renameDirectoryModal').modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      error: function(response) {
        $('.directory-name-input').addClass('has-error');
        $('.directory-name-error').show();
      }
    },
    shareDirectory: {
      success: (response) => {
        this.setShareUserEmail("");
        $('#shareModal' + response.id).modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      error: (response) => {
      }
    },
    moveDirectory: {
      success: function(response, oldParentId, self) {
        self.deletePobjectById(response.id, self.getPobjectById(oldParentId, self.rootDir));
        response.open = true;
        self.getPobjectById(response.directory.id, self.rootDir).pobjects.push(response);
        self.getPobjectById(response.directory.id, self.rootDir).open = true;
        self.selected = null;
        $('#moveModal' + response.id).modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
        self.getRootDirectory();
      },
      error: function(response) {}
    },
    newFile: {
      success: function(response) {
        $('#newFileModal').modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      error: function(response) {
        $('.file-name-input').addClass('has-error');
        $('.file-name-error').show();
      }
    },
    renameFile: {
      success: (response) => {
        $('#renameFileModal').modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
        this.triggerLocalStorageChangeEvent();
      },
      error: (response) => {
        $('.file-name-input').addClass('has-error');
        $('.file-name-error').show();
      }
    },
    moveFile: {
      success: function(response, oldParentId, self) {
        let ownParent = self.getPobjectById(oldParentId, self.rootDir);
        let sharedParent = self.getPobjectById(oldParentId, self.sharedDir);
        let ownNew = self.getPobjectById(response.directory.id, self.rootDir);
        let sharedNew = self.getPobjectById(response.directory.id, self.sharedDir);
        if (ownParent) {
          self.deletePobjectById(response.id, self.getPobjectById(oldParentId, self.rootDir));
          response.open = true;
          self.getPobjectById(response.directory.id, self.rootDir).pobjects.push(response);
          self.getPobjectById(response.directory.id, self.rootDir).open = true;
          self.selected = null;
          $('#moveModal' + response.id).modal('hide');
          $('body').removeClass('modal-open');
          $('.modal-backdrop').remove();
          self.checkIfOwnFilesLoaded();
        } else if (sharedParent) {
          self.deletePobjectById(response.id, self.getPobjectById(oldParentId, self.sharedDir));
          response.open = true;
          self.getPobjectById(response.directory.id, self.sharedDir).pobjects.push(response);
          self.getPobjectById(response.directory.id, self.sharedDir).open = true;
          self.selected = null;
          $('#moveModal' + response.id).modal('hide');
          $('body').removeClass('modal-open');
          $('.modal-backdrop').remove();
        }
        if (ownNew) {
          self.getSharedDirectory();
          self.getRootDirectory();
        } else if (sharedNew) {
          self.getSharedDirectory();
          self.getSharedDirectory();
        }
      },
      error: function(response) {}
    },
    shareFile: {
      success: (response) => {
        this.setShareUserEmail("");
        $('#shareModal' + response.id).modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
      },
      error: (response) => {
      }
    },
    publishFile: {
      success: (response) => {
        $('#server-error').hide();
        $('.form-group.input-group').removeClass('has-error');
        this.waitForElement("publishFileModal" + response.id, () => {
          $('#publishFileModal' + response.id).find('.publicLink').focus();
          if ($('#publishFileModal' + response.id).find('.publicLink').val().length > 0) {
            $('#publishFileModal' + response.id).find('.publicLink')[0].setSelectionRange(0, $('#publishFileModal' + response.id).find('.publicLink').val().length);
          }
        });
      },
      error: (response) => {
        $('#server-error').show();
        $('.form-group.input-group').addClass('has-error');
      }
    },
    copyOwnFile: {
      success: () => {
        this.rootDir.open = true;
        this.sharedDir.open = false;
      },
      error: () => {}
    },
    copySharedFile: {
      success: () => {
        this.rootDir.open = false;
        this.sharedDir.open = true;
      },
      error: () => {}
    }
  };

  /* OTHER TEMPLATE FUNCTIONS */

  getOwner(email) {
    return email === this.getCurrentUserEmail() ? 'Myself' : email;
  };

  canCreateFile(parent) {
    return this.isPobjectDirectory(parent) && this.canEdit(parent);
  }

  canCreateDirectory(parent) {
    return this.isPobjectDirectory(parent) && this.canEdit(parent) && this.getInversePobjectDepth(parent) < 4;
  }

  canDeleteFile(pobject) {
    return this.isPobjectFile(pobject) && (this.isOwner(pobject) || (pobject.directory && this.isOwnerByPobjectId(pobject.directory.id)));
  };

  canDeleteDirectory(pobject) {
    return this.isPobjectDirectory(pobject) && (this.isOwner(pobject) || (pobject.directory && this.isOwnerByPobjectId(pobject.directory.id)));
  };

  canPublish(pobject) {
    return this.isPobjectFile(pobject) && (this.canEdit(pobject) || (pobject.directory && this.isOwnerByPobjectId(pobject.directory.id)));
  };

  canShare(pobject) {
    return this.canEdit(pobject);
  };

  canRenameFile(pobject) {
    return this.isPobjectFile(pobject) && this.canEdit(pobject);
  }

  canRenameFileInRoot(pobject) {
    return this.canRenameFile(pobject) || this.isPobjectFile(pobject) && pobject.directory && this.isOwnerByPobjectId(pobject.directory.id);
  }

  canRenameDirectory(pobject) {
    return this.isPobjectDirectory(pobject) && this.isOwner(pobject);
  }

  canRemoveShare(pobject) {
    return !this.isOwner(pobject) && (pobject.directory ? !this.canEditByPobjectId(pobject.directory.id) && !this.canViewByPobjectId(pobject.directory.id) : (this.canEdit(pobject) || this.canView(pobject)));
  }

  canEdit(file) {
    if (this.isOwner(file)) return true;
    for (var pIx = 0; pIx < file.permissions.length; pIx++) {
      if (file.permissions[pIx].action.title === 'edit' &&
          this.authService.user ? file.permissions[pIx].user.id === parseInt(this.authService.user.sub) : false) {
        return true;
      }
    }
    return false;
  };

  canEditFileInRoot(file) {
    return this.isPobjectFile(file) && (this.canEdit(file) || file.directory && this.isOwnerByPobjectId(file.directory.id));
  }

  canEditFileInShared(file) {
    return this.isPobjectFile(file) && this.canEdit(file);
  }

  canEditByPobjectId(id) {
    let file = null;
    let fileInOwnFiles = this.getPobjectById(id, this.getRoot());
    let fileInSharedFiles = this.getPobjectById(id, this.getShared());
    if (fileInOwnFiles) {
      file = fileInOwnFiles;
    } else if (fileInSharedFiles) {
      file = fileInSharedFiles;
    }
    if (file) {
      return this.canEdit(file);
    }
    return false;
  }

  canView(file) {
    if (this.isOwner(file)) return true;
    for (var pIx = 0; pIx < file.permissions.length; pIx++) {
      if (file.permissions[pIx].action.title === 'view' &&
          this.authService.user ? file.permissions[pIx].user.id === parseInt(this.authService.user.sub) : false) {
        return true;
      }
    }
    return false;
  };

  canViewFile(file) {
    return !this.canEdit(file) && this.canView(file) && this.isPobjectFile(file);
  }

  canViewByPobjectId(id) {
    let file = null;
    let fileInOwnFiles = this.getPobjectById(id, this.getRoot());
    let fileInSharedFiles = this.getPobjectById(id, this.getShared());
    if (fileInOwnFiles) {
      file = fileInOwnFiles;
    } else if (fileInSharedFiles) {
      file = fileInSharedFiles;
    }
    if (file) {
      return this.canView(file);
    }
    return false;
  };

  canExport(file) {
    return this.isPobjectFile(file);
  }

  canMoveFileInRoot(pobject) {
    return this.canEdit(pobject) || this.isPobjectFile(pobject) && pobject.directory && this.isOwnerByPobjectId(pobject.directory.id);
  }

  exportFile(file) {
    this.canExportModel = true;
    this.http.get(config.backend.host + '/rest/directories/files/' + file.id, this.authService.loadRequestOptions()).subscribe(
      success => {
        let data = JSON.parse((<any>success)._body);
        if (data.content.length > 0) {
          let encodedData = encodeURIComponent(data.content);
          $('#export-'+file.id).attr({
            'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
            'download': data.title
          });
          if (this.canExportModel) {
            var mousedownEvent = document.createEvent("MouseEvent");
            mousedownEvent.initMouseEvent("click", true, true, window, 0, null, null, null, null, false , false, false, false, 0, null);
            document.getElementById('export-'+file.id).dispatchEvent(mousedownEvent);
            this.canExportModel = false;
          }
        } else {
          alert("File is empty!");
        }
        this.canExportModel = false;
        document.getElementById('export-'+file.id).removeAttribute("href");
        document.getElementById('export-'+file.id).removeAttribute("download");
      },
      fail => {
        alert("File cannot be found/opened!");
        this.canExportModel = false;
      }
    );
  }

  isExistingFileName(fileName) {
    // Console error fix.
    if (this.files === null) return false;

    var bpmnFileName = this.addBpmn(fileName);
    for (var fIx = 0; fIx < this.files.length; fIx++) {
      if (this.files[fIx].title === bpmnFileName) return true;
    }
    return false;
  };

  canMove(pobject, destination) {
    // Can not move pobject into file
    if (this.isPobjectFile(destination)) {
      return false;
    // Can not move pobject into itself
    } else if (pobject.id === destination.id) {
      return false;
    // Can not move pobject into directory when the resulting depth from root is > 5
    } else if (this.getPobjectDepth(pobject) + this.getInversePobjectDepth(destination) > 5) {
      return false;
    // Can move pobjects to root directory
    } else if (destination.title === 'root') {
      return true;
    // Can move files to all directories
    } else if (this.isPobjectFile(pobject)) {
      return true;
    }
    // Can not move directories into their child directories to prevent infinity
    for (var pIx = 0; pIx < pobject.pobjects.length; pIx++) {
      if (pobject.pobjects[pIx].id === destination.id) {
        return false;
      } else if (!this.canMove(pobject.pobjects[pIx], destination)) {
        return false;
      }
    }
    return true;
  };

  isMatchingSearch(pobject) {
    // If search string is empty stop here
    if (this.search.length === 0) {
      return true;
    }
    var match = this.isMatchingPartialTitle(pobject, this.search);
    var childrenMatch = this.containsByPartialTitle(pobject, this.search);
    var parentsMatch = this.inverseContainsByPartialTitle(pobject, this.search);

    return match || childrenMatch || parentsMatch;
  };

  isPobjectHighlighted(pobject) {
    return this.search.length > 0 && this.isMatchingPartialTitle(pobject, this.search);
  };

  sortPobjectsByTitleAsc() {
    this.sort = 1;
    this.sortPobjects(this.rootDir, this.sortByTitleDesc);
  };
  sortPobjectsByTitleDesc() {
    this.sort = 2;
    this.sortPobjects(this.rootDir, this.sortByTitle);
  };
  sortPobjectsByLastModifiedAsc() {
    this.sort = 3;
    this.sortPobjects(this.rootDir, this.sortByLastModifiedDesc);
  };
  sortPobjectsByLastModifiedDesc() {
    this.sort = 4;
    this.sortPobjects(this.rootDir, this.sortByLastModified);
  };

  formatDate(date) {

    moment.locale('en-gb');
    return moment(date).format('lll');
  };

  // Searches all children recursively for id
  containsById(id, dir) {
    if (!this.isPobjectDirectory(dir) ||
        id === undefined ||
        id === null) return false;

    for (var pIx = 0; pIx < dir.pobjects.length; pIx++) {
      if (dir.pobjects[pIx].id === id) {
        return true;
      } else if (this.containsById(id, dir.pobjects[pIx])) {
        return true;
      }
    }

    return false;
  };

  // Searches all parents recursively for id
  inverseContainsById(id, pobject) {
    if (id === undefined || pobject === undefined) return false;

    if (pobject.directory.id === id ||
        this.inverseContainsById(id, this.getPobjectById(pobject.directory.id, this.rootDir))) {
      return true;
    }

    return false;
  };

  // Searches all children recursively for partial title
  containsByPartialTitle(dir, title) {
    if (!this.isPobjectDirectory(dir) ||
        title === undefined ||
        title === null) return false;

    for (var pIx = 0; pIx < dir.pobjects.length; pIx++) {
      if (this.isMatchingPartialTitle(dir.pobjects[pIx], title)) {
        if (!dir.open) dir.open = true;
        return true;
      } else if (this.containsByPartialTitle(dir.pobjects[pIx], title)) {
        if (!dir.open) dir.open = true;
        return true;
      }
    }

    return false;
  };

  // Searches all parents recursively for partial title
  inverseContainsByPartialTitle(pobject, title) {
    if (title === undefined || pobject === undefined) return false;

    if (this.isMatchingPartialTitle(this.getPobjectById(pobject.directory.id, this.rootDir), title)) {
      return true;
    } else if (this.inverseContainsByPartialTitle(this.getPobjectById(pobject.directory.id, this.rootDir), title)) {
      return true;
    }

    return false;
  };

  // Searches directory and all children recursively for pobject with id
  getPobjectById(id, directory) {
    if (directory.id === id) { return directory; };
    if (!directory.pobjects) { return null; }
    for (var pIx = 0; pIx < directory.pobjects.length; pIx++) {
      if (directory.pobjects[pIx].id === id) {
        return directory.pobjects[pIx];
      } else if (this.containsById(id, directory.pobjects[pIx])) {
        return this.getPobjectById(id, directory.pobjects[pIx]);
      }
    }
  };

  // Searches directory and all children recursively for pobject with id and deletes it
  deletePobjectById(id, directory) {
    if (id === undefined || directory === undefined) return;

    for (var pIx = 0; pIx < directory.pobjects.length; pIx++) {
      if (directory.pobjects[pIx].id === id) {
        return directory.pobjects.splice(pIx, 1);
      } else if (this.isPobjectDirectory(directory.pobjects[pIx])) {
        this.deletePobjectById(id, directory.pobjects[pIx]);
      }
    }
  };

  getPobjectDepth(pobject) {
    var depth = 1;
    if (this.isPobjectDirectory(pobject)) {
      var maxChildDepth = 1;
      for (var pIx = 0; pIx < pobject.pobjects.length; pIx++) {
        var childDepth = this.getPobjectDepth(pobject.pobjects[pIx]);
        if (childDepth > maxChildDepth) {
          maxChildDepth = childDepth;
        }
      }
      return depth + maxChildDepth;
    }
    return depth;
  };

  getInversePobjectDepth(pobject) {
    var depth = 1;
    if (pobject.directory.id === undefined || pobject.directory.id === null) {
      return depth;
    } else {
      return depth + this.getInversePobjectDepth(this.getPobjectById(pobject.directory.id, this.rootDir));
    }
  };

  sharePobjectWithUser(pobject, rights) {
    let userHasExistingRights = false;
    for (let pIx = 0; pIx < pobject.permissions.length; pIx++) {
      if (pobject.permissions[pIx].user.email === this.userEmail) {
        userHasExistingRights = true;
        pobject.permissions[pIx].action.title = rights;
        break;
      }
    }
    if (!userHasExistingRights) {
      let pobjectPermission = {
        action: {
          title: rights
        },
        user: {
          email: this.userEmail
        }
      };
      pobject.permissions.push(pobjectPermission);
    }
    this.setShareUserEmail('');
    $('#shareModal' + pobject.id).find('.shareWithEmail').val('');
  };

  unShareFileWithUser(pobject, directory) {
    let userHasExistingRights = false;
    for (let pIx = 0; pIx < pobject.permissions.length; pIx++) {
      if (pobject.permissions[pIx].user.email === this.getCurrentUserEmail()) {
        userHasExistingRights = true;
        break;
      }
    }
    if (userHasExistingRights) {
      let index = directory.pobjects.indexOf(pobject);
      return directory.pobjects.splice(index, 1);
    }
    return directory;
  };

  isShared(pobject) {
    if (pobject.permissions.length > 0) {
      if (pobject.permissions.length == 1 && !this.isOwner(pobject) && this.canEdit(pobject)) {
        return false;
      }
      return true;
    }
    return false;
  }

  isOwner(pobject) {
    return this.authService.user ? pobject.user.id === parseInt(this.authService.user.sub) : false;
  };

  isOwnerByPobjectId(id) {
    let pobject = null;
    let pobjectInOwnFiles = this.getPobjectById(id, this.getRoot());
    let pobjectInSharedFiles = this.getPobjectById(id, this.getShared());
    if (pobjectInOwnFiles) {
      pobject = pobjectInOwnFiles;
    } else if (pobjectInSharedFiles) {
      pobject = pobjectInSharedFiles;
    }
    if (pobject) {
      return this.isOwner(pobject);
    }
    return false;
  }

  removeBpmn(title) {
    return title.replace(/.bpmn$/, "");
  };

  addBpmn(title) {
    return title + '.bpmn';
  }

  createPublicUrls(pobject) {
    for (var pIx = 0; pIx < pobject.pobjects.length; pIx++) {
      if (this.isPobjectDirectory(pobject.pobjects[pIx])) {
        this.createPublicUrls(pobject.pobjects[pIx])
      } else if (this.isPobjectFile(pobject.pobjects[pIx])) {
        this.createPublicUrl(pobject.pobjects[pIx]);
      }
    }
  };

  createPublicUrl(pobject) {
    if (pobject.published) {
      pobject.publicUrl = config.frontend.host + "/app/#/view/" + pobject.uri;
    } else {
      pobject.publicUrl = '';
    }
  };

  isPobjectDirectory(pobject) {
    return pobject.type === 'directory';
  };

  isPobjectFile(pobject) {
    return pobject.type === 'file';
  };

  isMatchingPartialTitle(pobject, title) {
    if (pobject === undefined || title === undefined) return false;
    return pobject.title.toLowerCase().indexOf(title.toLowerCase()) > -1;
  };

  openFile(pobject) {
    window.open(this.getFileUrl(pobject), '_blank');
  };

  openFileSQLEditor(pobject) {
    window.open(this.getFileSqlEditorUrl(pobject), '_blank');
  };

  openFileSQLDerivativeSensitivityEditor(pobject) {
    window.open(this.getFileSqlDerivativeSensitivityEditorUrl(pobject), '_blank');
  };

  openFilePEBPMNEditor(pobject) {
    window.open(this.getFilePEBPMNEditorUrl(pobject), '_blank');
  }

  getFileUrl(pobject) {
    return config ? config.frontend.host + "/#/modeler/" + pobject.id : '';
  };

  getFileSqlEditorUrl(pobject) {
    return config ? config.frontend.host + "/sql-privacy-editor/" + pobject.id : '';
  }

  getFileSqlDerivativeSensitivityEditorUrl(pobject) {
    return config ? config.frontend.host + "/sql-derivative-sensitivity-editor/" + pobject.id : '';
  }

  getFilePEBPMNEditorUrl(pobject) {
    return config ? config.frontend.host + "/pe-bpmn-editor/" + pobject.id : '';
  }

  sortPobjects(dir, sortFunction) {
    if (!this.isPobjectDirectory(dir)) return;
    dir.pobjects.sort(sortFunction);
    for (var pIx = 0; pIx < dir.pobjects.length; pIx++) {
      if (this.isPobjectDirectory(dir.pobjects[pIx])) {
        this.sortPobjects(dir.pobjects[pIx], sortFunction);
      }
    }
  };

  sortByTitle(a, b) {
    if (a.title < b.title)
      return -1;
    if (a.title > b.title)
      return 1;
    return 0;
  };

  sortByTitleDesc(a, b) {
    if (a.title < b.title)
      return 1;
    if (a.title > b.title)
      return -1;
    return 0;
  };

  sortByLastModified(a, b) {
    if (a.lastModified === undefined && b.lastModified === undefined) {
      return 0;
    } else if (a.lastModified === undefined) {
      return 1;
    } else if (b.lastModified === undefined) {
      return -1;
    }
    if (a.lastModified < b.lastModified)
      return -1;
    if (a.lastModified > b.lastModified)
      return 1;
    return 0;
  };

  sortByLastModifiedDesc(a, b) {
    if (a.lastModified === undefined && b.lastModified === undefined) {
      return 0;
    } else if (a.lastModified === undefined) {
      return -1;
    } else if (b.lastModified === undefined) {
      return 1;
    }
    if (a.lastModified < b.lastModified)
      return 1;
    if (a.lastModified > b.lastModified)
      return -1;
    return 0;
  };

  checkIfOwnFilesLoaded() {
    this.sharedDir.open = false;
    this.rootDir.open = true;
    if (this.rootDir != {}) {
    } else {
      this.getRootDirectory();
    }
  }

  checkIfSharedFilesLoaded() {
    this.rootDir.open = false;
    this.sharedDir.open = true;
    if (this.sharedDir != {}) {
    } else {
      this.getSharedDirectory();
    }
  }

  waitForElement(id, callback) {
    let interval = setInterval(() => {
      if (document.getElementById(id)) {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }

  triggerLocalStorageChangeEvent() {
    let date = new Date();
    localStorage.setItem('lastChange', '"' + date.getTime() + '"');
  }

  initCreateNewFileModal(id) {
    this.newPobjectTitle = '';
    $('.file-name-input').removeClass('has-error');
    $('.file-name-error').hide();
    $('#newFileModal').find('.newFileParentId').val(id);
    $('#newFileModal').find('.newPobjectFileTitle').val('');
    $('#newFileModal').modal();
    this.waitForElement("newFileModal", () => {
      $('#newFileModal').find('.newPobjectFileTitle').focus();
    });
  };

  initCreateNewDirectoryModal(id) {
    $('.directory-name-input').removeClass('has-error');
    $('.directory-name-error').hide();
    $('#newDirectoryModal').find('.newDirectoryParentId').val(id);
    $('#newDirectoryModal').find('.newPobjectDirectoryTitle').val('');
    $('#newDirectoryModal').modal();
    this.waitForElement("newDirectoryModal", () => {
      $('#newDirectoryModal').find('.newPobjectDirectoryTitle').focus();
    });
  }

  initRenameFileModal(id) {
    let file;
    let ownFile = this.getPobjectById(id, this.getRoot());
    let sharedFile = this.getPobjectById(id, this.getShared());
    if (ownFile) {
      file = ownFile;
    } else if (sharedFile) {
      file = sharedFile;
    }
    $('.file-name-input').removeClass('has-error');
    $('.file-name-error').hide();
    $('#renameFileModal').find('.renameFileParentId').val(id);
    $('#renameFileModal').find('.newFileTitle').val(this.removeBpmn(file.title));
    $('#renameFileModal').modal();
    this.waitForElement("renameFileModal", () => {
      $('#renameFileModal').find('.newFileTitle').focus();
    });
  };

  initRenameDirectoryModal(id) {
    let directory = this.getPobjectById(id, this.getRoot());
    $('.directory-name-input').removeClass('has-error');
    $('.directory-name-error').hide();
    $('#renameDirectoryModal').find('.renameDirectoryParentId').val(id);
    $('#renameDirectoryModal').find('.newDirectoryTitle').val(directory.title);
    $('#renameDirectoryModal').modal();
    this.waitForElement("renameDirectoryModal", () => {
      $('#renameDirectoryModal').find('.newDirectoryTitle').focus();
    });
  };

  initDeleteFileModal(id) {
    let file;
    let fileInOwnFiles = this.getPobjectById(id, this.getRoot());
    let fileInSharedFiles = this.getPobjectById(id, this.getShared());
    if (fileInOwnFiles) {
      file = fileInOwnFiles;
    } else if (fileInSharedFiles) {
      file = fileInSharedFiles;
    }
    $('#deleteFileModal').find('.deleteFileParentId').val(id);
    $('#deleteFileModal').find('.deleteFileTitle').text(file.title);
    $('#deleteFileModal').modal();
  }

  initDeleteDirectoryModal(id) {
    let directory = this.getPobjectById(id, this.getRoot());
    $('#deleteDirectoryModal').find('.deleteDirectoryParentId').val(id);
    $('#deleteDirectoryModal').find('.deleteDirectoryTitle').text(directory.title);
    $('#deleteDirectoryModal').modal();
  }

  initPublishFileModal(id) {
    let file;
    let fileInOwnFiles = this.getPobjectById(id, this.getRoot());
    let fileInSharedFiles = this.getPobjectById(id, this.getShared());
    if (fileInOwnFiles) {
      file = fileInOwnFiles;
    } else if (fileInSharedFiles) {
      file = fileInSharedFiles;
    }
    this.createPublicUrl(file);
    $('#publishFileModal' + id).modal();
    this.waitForElement("publishFileModal" + id, () => {
      $('#publishFileModal' + id).find('.publicLink').focus();
      if ($('#publishFileModal' + id).find('.publicLink').val().length > 0) {
        $('#publishFileModal' + id).find('.publicLink')[0].setSelectionRange(0, $('#publishFileModal' + id).find('.publicLink').val().length);
      }
    });
  }

  initShareModal(id) {
    this.setShareUserEmail("");
    $('.form-group.input-group').removeClass('has-error');
    $('.error-block').hide();
    $('#shareModal' + id).find('.shareWithEmail').val('');
    $('#shareModal' + id).modal();
    this.waitForElement("shareModal" + id, () => {
      $('#shareModal' + id).find('.shareWithEmail').focus();
    });
  }

  initRemoveShareModal(id) {
    let pobject = this.getPobjectById(id, this.getShared());
    $('#removeSharedFileModal').find('.removeSharingPobjectParentId').val(id);
    $('#removeSharedFileModal').find('.removeSharingPobjectTitle').text(pobject.title);
    $('#removeSharedFileModal').modal();
  }

  initMoveModal(id) {
    this.moveObjectId = id;
    $('#moveModal' + id).modal();
    this.selected = null;
  }

  // Update only one row in own/shared files list when file is updated

  updateRootDirectory() {

    if (localStorage.lastModifiedFileId) {

      var pid = parseInt(localStorage.lastModifiedFileId.replace('"',''));

      this.http.get(config.backend.host + '/rest/directories/files/' + pid, this.authService.loadRequestOptions()).subscribe(
        success => {

          let pobject = JSON.parse((<any>success)._body);

          for (let i = 0; i < this.rootDir.pobjects.length; i++) {

            // Update row in root
            let pobj1 = this.rootDir.pobjects[i];
            if (pobj1.id == pid) {
              this.rootDir.pobjects[i] = pobject;
              this.createPublicUrl(this.rootDir.pobjects[i]);
              break;
            }

            // Update row in sub folder (level 1)
            if (pobj1.pobjects) {

              for (let j = 0; j < pobj1.pobjects.length; j++) {

                let pobj2 = pobj1.pobjects[j];
                if (pobj2.id == pid) {
                  this.rootDir.pobjects[i].pobjects[j] = pobject;
                  this.createPublicUrl(this.rootDir.pobjects[i].pobjects[j]);
                  break;
                }

                // Update row in sub folder (level 2)
                if (pobj2.pobjects) {

                  for (let k = 0; k < pobj2.pobjects.length; k++) {

                    let pobj3 = pobj2.pobjects[k];
                    if (pobj3.id == pid) {
                      this.rootDir.pobjects[i].pobjects[j].pobjects[k] = pobject;
                      this.createPublicUrl(this.rootDir.pobjects[i].pobjects[j].pobjects[k]);
                      break;
                    }

                    // Update row in sub folder (level 3)
                    if (pobj3.pobjects) {

                      for (let l = 0; l < pobj3.pobjects.length; l++) {

                        let pobj4 = pobj3.pobjects[l];
                        if (pobj4.id == pid) {
                          this.rootDir.pobjects[i].pobjects[j].pobjects[k].pobjects[l] = pobject;
                          this.createPublicUrl(this.rootDir.pobjects[i].pobjects[j].pobjects[k].pobjects[l]);
                          break;
                        }

                      }

                    }

                  }

                }

              }

            }
          }

        }
      );

    }

  }

  updateSharedDirectory() {

    if (localStorage.lastModifiedFileId) {

      var pid = parseInt(localStorage.lastModifiedFileId.replace('"',''));

      this.http.get(config.backend.host + '/rest/directories/files/' + pid, this.authService.loadRequestOptions()).subscribe(
        success => {

          let pobject = JSON.parse((<any>success)._body);

          for (let i = 0; i < this.sharedDir.pobjects.length; i++) {

            // Update row in root
            let pobj1 = this.sharedDir.pobjects[i];
            if (pobj1.id == pid) {
              this.sharedDir.pobjects[i] = pobject;
              this.createPublicUrl(this.sharedDir.pobjects[i]);
              break;
            }

            // Update row in sub folder (level 1)
            if (pobj1.pobjects) {

              for (let j = 0; j < pobj1.pobjects.length; j++) {

                let pobj2 = pobj1.pobjects[j];
                if (pobj2.id == pid) {
                  this.sharedDir.pobjects[i].pobjects[j] = pobject;
                  this.createPublicUrl(this.sharedDir.pobjects[i].pobjects[j]);
                  break;
                }

                // Update row in sub folder (level 2)
                if (pobj2.pobjects) {

                  for (let k = 0; k < pobj2.pobjects.length; k++) {

                    let pobj3 = pobj2.pobjects[k];
                    if (pobj3.id == pid) {
                      this.sharedDir.pobjects[i].pobjects[j].pobjects[k] = pobject;
                      this.createPublicUrl(this.sharedDir.pobjects[i].pobjects[j].pobjects[k]);
                      break;
                    }

                    // Update row in sub folder (level 3)
                    if (pobj3.pobjects) {

                      for (let l = 0; l < pobj3.pobjects.length; l++) {

                        let pobj4 = pobj3.pobjects[l];
                        if (pobj4.id == pid) {
                          this.sharedDir.pobjects[i].pobjects[j].pobjects[k].pobjects[l] = pobject;
                          this.createPublicUrl(this.sharedDir.pobjects[i].pobjects[j].pobjects[k].pobjects[l]);
                          break;
                        }

                      }

                    }

                  }

                }

              }

            }
          }

        }
      );

    }

  };

  ngOnInit() {
    window.addEventListener('storage', (e) => {
      if (e.storageArea === localStorage) {
        this.updateRootDirectory();
        this.updateSharedDirectory();
        $('#loginModal').modal('hide');
      }
    });
    this.getRootDirectory();
    this.getSharedDirectory();
  }

}