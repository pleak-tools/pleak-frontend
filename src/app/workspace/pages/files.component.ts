import { Component, OnInit, Input } from '@angular/core';
import { Http, RequestOptions, Headers } from '@angular/http';
import { AuthService } from "app/auth/auth.service";

declare var $: any;
declare function require(name:string);

let config = require('../../../config.json');

@Component({
  selector: 'app-workspace-files',
  templateUrl: './files.component.html'
})
export class FilesComponent implements OnInit {

  constructor(public http: Http, private authService: AuthService) {

    this.authService.authStatus.subscribe(status => {
      this.authenticated = status;
      this.getRootDirectory();
      this.getSharedDirectory();
    });

  }

  @Input() authenticated: boolean;

  private rootDir: any = {};
  private sharedDir: any = {};
  private files = null;
  private pobjects = null;
  private selected = null;
  private sort = 0;
  private userEmail = "";
  private search = '';
  private newPobjectTitle = '';
  private shareWithEmailRights = "view";
  private moveObjectId = null;
  private ownFilesLoading;
  private sharedFilesLoading;
  
  isAuthenticated() {
    return this.authenticated;
  }

  getRoot = function() {
    return this.rootDir;
  };

  getShared = function() {
    return this.sharedDir;
  };

  setSearchInput(value: string) {
    this.search = value;
  }

  setShareUserEmail(email) {
    this.userEmail = email;
  }

  setShareWithEmailRights(value) {
    this.shareWithEmailRights = value;
  }

  setNewPobjectTitle(title) {
    this.newPobjectTitle = title;
  }

  /** BACK-END RELATED FUNCTIONS */

  getRootDirectory() {
    this.ownFilesLoading = true;
    var self = this;
    this.http.get(config.backend.host + '/rest/directories/root', this.authService.loadRequestOptions()).subscribe(
      success => {
        this.rootDir = JSON.parse((<any>success)._body);
        this.createPublicUrls(this.rootDir);
        this.rootDir.open = true;
        this.waitForElement("ownFilesLoader", function() {
          $('#ownFilesLoader').fadeOut('slow', function() {
            self.ownFilesLoading = false;
          });
        });
      },
      fail => {
        self.ownFilesLoading = true;
      }
    );
  };

  getSharedDirectory() {
    this.sharedFilesLoading = true;
    var self = this;
    this.http.get(config.backend.host + '/rest/directories/shared', this.authService.loadRequestOptions()).subscribe(
      success => {
        this.sharedDir = JSON.parse((<any>success)._body);
        this.createPublicUrls(this.sharedDir);
        this.waitForElement("sharedFilesLoader", function() {
          $('#sharedFilesLoader').fadeOut('slow', function() {
            self.sharedFilesLoading = false;
          });
        });
      },
      fail => {
        self.sharedFilesLoading = true;
      }
    );
  };

  createDirectoryREST(directory, parent, callback) {
    this.http.post(config.backend.host + '/rest/directories', directory, this.authService.loadRequestOptions()).subscribe(
      success => {
        var data = JSON.parse((<any>success)._body);
        parent.pobjects.push(data);
        parent.open = true;
        callback.success(data);
      },
      fail => {
        var data = JSON.parse((<any>fail)._body);
        callback.error(data);
      }
    );
  };

  updateDirectoryREST(newDirectory, oldDirectory, callback) {
    var self = this;
    this.http.put(config.backend.host + '/rest/directories/' + newDirectory.id, newDirectory, this.authService.loadRequestOptions()).subscribe(
      success => {
        var data = JSON.parse((<any>success)._body);
        var oldParentId = oldDirectory.directory.id;
        oldDirectory.id = data.id;
        oldDirectory.title = data.title;
        oldDirectory.directory = data.directory;
        oldDirectory.permissions = data.permissions;
        oldDirectory.pobjects = data.pobjects;
        callback.success(data, oldParentId, self);
      },
      fail => {
        var data = JSON.parse((<any>fail)._body);
        callback.error(data);
      }
    );
  };

  deleteDirectoryREST(id) {
    this.http.delete(config.backend.host + '/rest/directories/' + id, this.authService.loadRequestOptions()).subscribe(
      success => {
        this.deletePobjectById(id, this.rootDir);
        this.triggerLocalStorageChangeEvent();
      },
      fail => {
      }
    );
  };

  createFileREST(file, parent, callback) {
    this.http.post(config.backend.host + '/rest/directories/files/', file, this.authService.loadRequestOptions()).subscribe(
      success => {
        var data = JSON.parse((<any>success)._body);
        data.md5Hash = null;
        data.content = null;
        parent.pobjects.unshift(data);
        parent.open = true;
        callback.success(data);
      },
      fail => {
        callback.error(fail);
      }
    );
  };

  updateFileREST(newFile, oldFile, callback) {
    var self = this;
    this.http.put(config.backend.host + '/rest/directories/files/' + newFile.id, newFile, this.authService.loadRequestOptions()).subscribe(
      success => {
        var data = JSON.parse((<any>success)._body);
        var oldParentId = oldFile.directory.id;
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
        var data = JSON.parse((<any>fail)._body);
        callback.error(data);
      }
    );
  };
  
  deleteFilePermissions(pobject) {
    this.http.delete(config.backend.host + '/rest/directories/files/permissions/' + pobject.id, this.authService.loadRequestOptions()).subscribe(
      success => {
        this.unShareFileWithUser(pobject, this.sharedDir)
      },
      fail => {
      }
    );
  };

  deleteFileREST(id) {
    this.http.delete(config.backend.host + '/rest/directories/files/' + id, this.authService.loadRequestOptions()).subscribe(
      success => {
        this.deletePobjectById(id, this.rootDir);
      },
      fail => {
      }
    );
  };

  addRightsREST(file, rights, callback) {
    var self = this;
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
  };

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
  };

  sharePobjectWithoutCallback(pobject, userRights) {
    this.addRightsREST(pobject, userRights, false);
  }
  
  removeFileShare(pobjectId) {
    let pobject = this.getPobjectById(Number.parseInt(pobjectId), this.getShared());
	  this.deleteFilePermissions(pobject);
  };

  movePobject(pobject) {
    var newPobject= Object.assign({}, pobject);
    newPobject.directory.id = this.selected.id;
    newPobject.permissions = this.selected.permissions; // Inherit permissions of the new location folder
    delete newPobject.open;
    if (this.isPobjectFile(pobject)) {
      delete newPobject.publicUrl;
      this.updateFileREST(newPobject, pobject, this.callbacks.moveFile);
    } else if (this.isPobjectDirectory(pobject)) {
      newPobject.pobjects = [];
      this.updateDirectoryREST(newPobject, pobject, this.callbacks.moveDirectory);
    }
  };

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
  };

  renameDirectory(oldDirectoryId, title) {
    let oldDirectory = this.getPobjectById(Number.parseInt(oldDirectoryId), this.getRoot());
    var newDirectory= Object.assign({}, oldDirectory);
    newDirectory.title = title;
    // sending generic classes as JSON to java is not smart enough, TODO: get better JSON<->POJO lib?
    newDirectory.pobjects = [];
    delete newDirectory.open;
    this.updateDirectoryREST(newDirectory, oldDirectory, this.callbacks.renameDirectory);
  };

  deleteDirectory(id) {
    id = Number.parseInt(id);
    this.deleteDirectoryREST(id);
    $('#deleteDirectoryModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  };

  createFile(parentId) {
    var parent = this.getPobjectById(Number.parseInt(parentId), this.getRoot());
    var newFile = {
      title: this.addBpmn(this.newPobjectTitle),
      directory: {
        id: parent.id
      },
    };
    this.createFileREST(newFile, parent, this.callbacks.newFile);
  };

  renameFile(oldFileId, title) {
    let oldFile = this.getPobjectById(Number.parseInt(oldFileId), this.getRoot());
    var newFile = Object.assign({}, oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.title = this.addBpmn(title);
    this.updateFileREST(newFile, oldFile, this.callbacks.renameFile);
  };

  publishFile(oldFile) {
    var newFile = Object.assign({}, oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.published = true;
    this.updateFileREST(newFile, oldFile, this.callbacks.publishFile);
  };

  unpublishFile(oldFile) {
    var newFile = Object.assign({}, oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.published = false;
    this.updateFileREST(newFile, oldFile, this.callbacks.publishFile);
  };

  deleteFile(id) {
    id = Number.parseInt(id);
    this.deleteFileREST(id);
    $('#deleteFileModal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  };

  copyFile(oldFile) {
    var newFile = Object.assign({}, oldFile);
    var parent = this.rootDir;
    if (!this.sharedDir.open) {
      var parent = this.getPobjectById(oldFile.directory.id, this.rootDir);
    }
    delete newFile.publicUrl;
    delete newFile.open;
    if (!this.isOwner(oldFile)) {
      delete newFile.directory.id;
      newFile.directory.title = 'root';
    }
    newFile.title = this.addBpmn(this.removeBpmn(newFile.title) + " (copy)");
    newFile.permissions = [];
    newFile.published = false;
    this.createFileREST(newFile, parent, this.callbacks.copyFile);
  };

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
          $('#publishFileModal' + response.id).find('#publicLink').focus();
          if ($('#publishFileModal' + response.id).find('#publicLink').val().length > 0) {
            $('#publishFileModal' + response.id).find('#publicLink')[0].setSelectionRange(0, $('#publishFileModal' + response.id).find('#publicLink').val().length);
          }
        });
      },
      error: (response) => {
        $('#server-error').show();
        $('.form-group.input-group').addClass('has-error');
      }
    },
    copyFile: {
      success: () => {
        this.rootDir.open = true;
        this.sharedDir.open = false;
      },
      error: () => {}
    }
  };

  /* OTHER TEMPLATE FUNCTIONS */

  getOwner(email) {
    return email === this.authService.user.email ? 'Myself' : email;
  };

  canDelete(pobject) {
    return this.isOwner(pobject);
  };

  canPublish(pobject) {
    return this.isOwner(pobject) && this.isPobjectFile(pobject);
  };

  canShare(pobject) {
    return this.isOwner(pobject);
  };

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
    var d = new Date(date);
    var day = d.getDate() < 10 ? '0' + d.getDate() : d.getDate();
    var month = d.getMonth() < 9 ? '0' + (d.getMonth() + 1) : (d.getMonth() + 1);
    var dmy = day + "." + month + "." + d.getFullYear();
    var hour = d.getHours() < 10 ? '0' + d.getHours() : d.getHours();
    var minutes = d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes();
    var seconds = d.getSeconds() < 10 ? '0' + d.getSeconds() : d.getSeconds();
    var hms = hour + ":" + minutes + ":" + seconds;
    return dmy + ", " + hms;
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
    if (directory.id === id) return directory;
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
    var userHasExistingRights = false;
    for (var pIx = 0; pIx < pobject.permissions.length; pIx++) {
      if (pobject.permissions[pIx].user.email === this.userEmail) {
        userHasExistingRights = true;
        pobject.permissions[pIx].action.title = rights;
        break;
      }
    }
    if (!userHasExistingRights) {
      var pobjectPermission = {
        action: {
          title: rights
        },
        user: {
          email: this.userEmail
        }
      };
      pobject.permissions.push(pobjectPermission);
    }
    this.setShareUserEmail("");
    $('#shareModal' + pobject.id).find('#shareWithEmail').val('');
  };
  
  unShareFileWithUser(pobject, directory) {
	  var userHasExistingRights = false;
	  for (var pIx = 0; pIx < pobject.permissions.length; pIx++) {
		  if (pobject.permissions[pIx].user.email === this.authService.user.email) {
			  userHasExistingRights = true;
		  	break;
		  }
	  }
	  if (userHasExistingRights) {
		  var index = directory.pobjects.indexOf(pobject);
		  return directory.pobjects.splice(index, 1);
	  }
	  return directory;
  };

  isOwner(pobject) {
    return this.authService.user ? pobject.user.id === parseInt(this.authService.user.sub) : false;
  };

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

  openFilePEBPMNEditor(pobject) {
    window.open(this.getFilePEBPMNEditorUrl(pobject), '_blank');
  }

  getFileUrl(pobject) {
    return config ? config.frontend.host + "/#/modeler/" + pobject.id : '';
  };

  getFileSqlEditorUrl(pobject) {
    return config ? config.frontend.host + "/sql-privacy-editor/" + pobject.id : '';
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

  getActiveBaseDirectory() {
    if (this.rootDir.open) {
      return this.rootDir;
    } else if (this.sharedDir.open) {
      return this.sharedDir;
    }
  };

  updateFileAttributes(oldFile, newFile) {
    oldFile.directory = newFile.directory;
    oldFile.id = newFile.id;
    oldFile.lastModified = newFile.lastModified;
    oldFile.modifiedBy = newFile.modifiedBy;
    oldFile.permissions = newFile.permissions;
    oldFile.published = newFile.published;
    oldFile.uri = newFile.uri;
    oldFile.title = newFile.title;
    oldFile.user = newFile.user;
    this.createPublicUrl(oldFile);
  };

  checkIfOwnFilesLoaded() {
    this.sharedDir.open = false;
    this.rootDir.open = true;
    if (this.rootDir != {}) {
      this.ownFilesLoading = false;
    } else {
      this.ownFilesLoading = true;
      this.getRootDirectory();
    }
  }

  checkIfSharedFilesLoaded() {
    this.rootDir.open = false;
    this.sharedDir.open = true;
    if (this.sharedDir != {}) {
      this.sharedFilesLoading = false;
    } else {
      this.sharedFilesLoading = true;
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
    $('#newFileModal').find('#newFileParentId').val(id);
    $('#newFileModal').find('#newPobjectFileTitle').val('');
    $('#newFileModal').modal();
    this.waitForElement("newFileModal", () => {
      $('#newFileModal').find('#newPobjectFileTitle').focus();
    });
  };

  initCreateNewDirectoryModal(id) {
    $('.directory-name-input').removeClass('has-error');
    $('.directory-name-error').hide();
    $('#newDirectoryModal').find('#newDirectoryParentId').val(id);
    $('#newDirectoryModal').find('#newPobjectDirectoryTitle').val('');
    $('#newDirectoryModal').modal();
    this.waitForElement("newDirectoryModal", () => {
      $('#newDirectoryModal').find('#newPobjectDirectoryTitle').focus();
    });
  }

  initRenameFileModal(id) {
    let file = this.getPobjectById(id, this.getRoot());
    $('.file-name-input').removeClass('has-error');
    $('.file-name-error').hide();
    $('#renameFileModal').find('#renameFileParentId').val(id);
    $('#renameFileModal').find('#newFileTitle').val(this.removeBpmn(file.title));
    $('#renameFileModal').modal();
    this.waitForElement("renameFileModal", () => {
      $('#renameFileModal').find('#newFileTitle').focus();
    });
  };

  initRenameDirectoryModal(id) {
    let directory = this.getPobjectById(id, this.getRoot());
    $('.directory-name-input').removeClass('has-error');
    $('.directory-name-error').hide();
    $('#renameDirectoryModal').find('#renameDirectoryParentId').val(id);
    $('#renameDirectoryModal').find('#newDirectoryTitle').val(directory.title);
    $('#renameDirectoryModal').modal();
    this.waitForElement("renameDirectoryModal", () => {
      $('#renameDirectoryModal').find('#newDirectoryTitle').focus();
    });
  };

  initDeleteFileModal(id) {
    let file = this.getPobjectById(id, this.getRoot());
    $('#deleteFileModal').find('#deleteFileParentId').val(id);
    $('#deleteFileModal').find('#deleteFileTitle').text(file.title);
    $('#deleteFileModal').modal();
  }

  initDeleteDirectoryModal(id) {
    let directory = this.getPobjectById(id, this.getRoot());
    $('#deleteDirectoryModal').find('#deleteDirectoryParentId').val(id);
    $('#deleteDirectoryModal').find('#deleteDirectoryTitle').text(directory.title);
    $('#deleteDirectoryModal').modal();
  }

  initPublishFileModal(id) {
    $('#publishFileModal' + id).modal();
    this.waitForElement("publishFileModal" + id, () => {
      $('#publishFileModal' + id).find('#publicLink').focus();
      if ($('#publishFileModal' + id).find('#publicLink').val().length > 0) {
        $('#publishFileModal' + id).find('#publicLink')[0].setSelectionRange(0, $('#publishFileModal' + id).find('#publicLink').val().length);
      }
    });
  }

  initShareModal(id) {
    this.setShareUserEmail("");
    $('.form-group.input-group').removeClass('has-error');
    $('.error-block').hide();
    $('#shareModal' + id).find('#shareWithEmail').val('');
    $('#shareModal' + id).modal();
    this.waitForElement("shareModal" + id, () => {
      $('#shareModal' + id).find('#shareWithEmail').focus();
    });
  }

  initRemoveShareModal(id) {
    let pobject = this.getPobjectById(id, this.getShared());
    $('#removeSharedFileModal').find('#removeSharingPobjectParentId').val(id);
    $('#removeSharedFileModal').find('#removeSharingPobjectTitle').text(pobject.title);
    $('#removeSharedFileModal').modal();
  }

  initMoveModal(id) {
    this.moveObjectId = id;
    $('#moveModal' + id).modal();
    this.selected = null;
  }

  ngOnInit() {
    window.addEventListener('storage', (e) => {
      if (e.storageArea === localStorage) {
        this.authService.verifyToken();
        this.getRootDirectory();
        this.getSharedDirectory();
        $('#loginModal').modal('hide');
      }
    });
    this.getRootDirectory();
    this.getSharedDirectory();
  }

}