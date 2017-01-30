'use strict';

angular.module('pleaks.files', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/files', {
    templateUrl: 'files/files.html'
  });
}])

.controller('FilesController',
            ['$rootScope', '$scope', '$http', '$window', '$localStorage', 'AuthService',
            function(root, scope, http, $window, localStorage, auth) {

  var controller = this;
  var files = null;
  var pobjects = null;
  var rootDir = null;
  var sharedDir = null;

  controller.tab = 'root';
  controller.userEmail = '';
  controller.search = '';
  controller.newPobjectTitle = '';
  controller.loading = true;
  controller.selected = null;
  controller.sort = 0;

  var createDirectory = function(directory, parent, callback) {
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/directories',
      data: directory
    }).then(function success(response) {
      parent.pobjects.push(response.data);
      parent.open = true;
      callback.success(response);
    }, function failure(response) {
      callback.error(response);
    });
  };

  var getRootDirectory = function() {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/directories/root'
    }).then(function success(response) {
      rootDir = response.data;
      createPublicUrls(rootDir);
      rootDir.open = true;
      $('#loading').fadeOut('slow', function() {
        controller.loading = false;
        scope.$apply();
      });

    }, function failure(response) {
      $('#loginModal').modal();
    });
  };

  var getSharedDirectory = function() {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/directories/shared'
    }).then(function success(response) {
      sharedDir = response.data;
      createPublicUrls(sharedDir);
    }, function failure(response) {

    });
  };

  var updateDirectory = function(newDirectory, oldDirectory, callback) {
    http({
      method: 'PUT',
      url: root.config.backend.host + '/rest/directories/' + newDirectory.id,
      data: newDirectory
    }).then(function success(response) {
      var oldParentId = oldDirectory.directory.id;
      oldDirectory.id = response.data.id;
      oldDirectory.title = response.data.title;
      oldDirectory.directory = response.data.directory;
      oldDirectory.permissions = response.data.permissions;
      oldDirectory.pobjects = response.data.pobjects;
      callback.success(response, oldParentId);
    }, function failure(response) {
      callback.error(response);
    });
  };

  var deleteDirectory = function(id) {
    http({
      method: 'DELETE',
      url: root.config.backend.host + '/rest/directories/' + id
    }).then(function success(response) {
      deletePobjectById(id, rootDir);
    }, function failure(response) {

    });
  };

  var createFile = function(file, parent, callback) {
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/directories/files/',
      data: file
    }).then(function success(response) {
      response.data.md5Hash = null;
      response.data.content = null;
      parent.pobjects.unshift(response.data);
      parent.open = true;
      callback.success(response);
    }, function failure(response) {
      callback.error(response);
    });
  };

  var updateFile = function(newFile, oldFile, callback) {
    http({
      method: 'PUT',
      url: root.config.backend.host + '/rest/directories/files/' + newFile.id,
      data: newFile
    }).then(function success(response) {
      var oldParentId = oldFile.directory.id;
      oldFile.directory = response.data.directory;
      oldFile.id = response.data.id;
      oldFile.lastModified = response.data.lastModified;
      oldFile.permissions = response.data.permissions;
      oldFile.published = response.data.published;
      oldFile.uri = response.data.uri;
      oldFile.title = response.data.title;
      oldFile.user = response.data.user;
      createPublicUrl(oldFile);
      callback.success(response, oldParentId);
    }, function failure(response) {
      callback.error(response);
    });
  };
  
  var deleteFilePermissions = function(pobject) {
	  
	http({
	    	
		method: 'DELETE',
		url: root.config.backend.host + '/rest/directories/files/permissions/' + pobject.id
	      
	}).then(function success(response) {
	    	
		unShareFileWithUser(pobject, sharedDir)

	}, function failure(response) {

	});
	    
  };

  var deleteFile = function(id) {
    http({
      method: 'DELETE',
      url: root.config.backend.host + '/rest/directories/files/' + id
    }).then(function success(response) {
      deletePobjectById(id, rootDir);
    }, function failure(response) {

    });
  };

  /* TEMPLATE BACK-END RELATED FUNCTIONS */

  controller.sharePobject = function(pobject, userRights) {
    if (controller.userEmail.length > 0) {
      controller.addRights(pobject, userRights, controller.sharePobject);
    } else {
      var newPobject = angular.copy(pobject);
      delete newPobject.open;
      if (isPobjectFile(pobject)) {
        delete newPobject.publicUrl;
        updateFile(newPobject, pobject, callbacks.shareFile);
      } else if (isPobjectDirectory(pobject)) {
        // sending generic classes as JSON to java is not smart enough, TODO: get better JSON<->POJO lib?
        newPobject.pobjects = [];
        updateDirectory(newPobject, pobject, callbacks.shareDirectory);
        
      }
    }
  };
  
  controller.removeFileShare = function(pobject) {
	  
	  deleteFilePermissions(pobject);
	  
  };

  controller.movePobject = function(pobject) {
    var newPobject = angular.copy(pobject);
    newPobject.directory.id = controller.selected.id
    delete newPobject.open;
    if (isPobjectFile(pobject)) {
      delete newPobject.publicUrl;
      updateFile(newPobject, pobject, callbacks.moveFile);
    } else if (isPobjectDirectory(pobject)) {
      newPobject.pobjects = [];
      updateDirectory(newPobject, pobject, callbacks.moveDirectory);
    }
  };

  controller.createDirectory = function(parent) {
    if (getInversePobjectDepth(parent) > 3) return false;
    var newDirectory = {
      title: controller.newPobjectTitle,
      directory: {
        id: parent.id
      }
    };
    createDirectory(newDirectory, parent, callbacks.createDirectory);
  };

  controller.renameDirectory = function(oldDirectory, title) {
    var newDirectory = angular.copy(oldDirectory);
    newDirectory.title = title;
    // sending generic classes as JSON to java is not smart enough, TODO: get better JSON<->POJO lib?
    newDirectory.pobjects = [];
    delete newDirectory.open;
    updateDirectory(newDirectory, oldDirectory, callbacks.renameDirectory);
  };

  controller.deleteDirectory = function(id) {
    deleteDirectory(id);
  };

  controller.createFile = function(parent) {
    var newFile = {
      title: addBpmn(controller.newPobjectTitle),
      directory: {
        id: parent.id
      },
    };
    createFile(newFile, parent, callbacks.newFile);
  };

  controller.renameFile = function(oldFile, title) {
    var newFile = angular.copy(oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.title = addBpmn(title);
    updateFile(newFile, oldFile, callbacks.renameFile);
  };

  controller.publishFile = function(oldFile) {
    var newFile = angular.copy(oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.published = true;
    updateFile(newFile, oldFile, callbacks.publishFile);
  };

  controller.unpublishFile = function(oldFile) {
    var newFile = angular.copy(oldFile);
    delete newFile.publicUrl;
    delete newFile.open;
    newFile.published = false;
    updateFile(newFile, oldFile, callbacks.publishFile);
  };

  controller.deleteFile = function(id) {
    deleteFile(id);
  };

  controller.copyFile = function(oldFile) {
    var newFile = angular.copy(oldFile);
    var parent = rootDir;
    if (!sharedDir.open) {
      var parent = getPobjectById(oldFile.directory.id, rootDir);
    }
    delete newFile.publicUrl;
    delete newFile.open;
    if (!isOwner(oldFile)) {
      delete newFile.directory.id;
      newFile.directory.title = 'root';
    }
    newFile.title = addBpmn(removeBpmn(newFile.title) + " (copy)");
    newFile.permissions = [];
    newFile.published = false;
    createFile(newFile, parent, callbacks.copyFile);
  };

  var callbacks = {
    createDirectory: {
      success: function(response) {
        controller.newPobjectTitle = '';
        $('.directory-name-input').removeClass('has-error');
        $('.directory-name-error').hide();
        $('#newDirectoryModal' + response.data.directory.id).modal('hide');
      },
      error: function(response) {
        $('.directory-name-input').addClass('has-error');
        $('.directory-name-error').show();
      }
    },
    renameDirectory: {
      success: function(response) {
        $('.directory-name-input').removeClass('has-error');
        $('.directory-name-error').hide();
        $('#renameDirectoryModal' + response.data.id).modal('hide');
      },
      error: function(response) {
        $('.directory-name-input').addClass('has-error');
        $('.directory-name-error').show();
      }
    },
    shareDirectory: {
      success: function(response) {
        $('#shareModal' + response.data.id).modal('hide');
      },
      error: function(response) {
      }
    },
    moveDirectory: {
      success: function(response, oldParentId) {
        deletePobjectById(response.data.id, getPobjectById(oldParentId, rootDir));
        response.data.open = true;
        getPobjectById(response.data.directory.id, rootDir).pobjects.push(response.data);
        getPobjectById(response.data.directory.id, rootDir).open = true;
        controller.selected = null;
      },
      error: function(response) {}
    },
    newFile: {
      success: function(response) {
        controller.newPobjectTitle = '';
        $('.file-name-input').removeClass('has-error');
        $('.file-name-error').hide();
        $('#newFileModal' + response.data.directory.id).modal('hide');
      },
      error: function(response) {
        $('.file-name-input').addClass('has-error');
        $('.file-name-error').show();
      }
    },
    renameFile: {
      success: function(response) {
        $('.file-name-input').removeClass('has-error');
        $('.file-name-error').hide();
        $('#renameFileModal' + response.data.id).modal('hide');
      },
      error: function(response) {
        $('.file-name-input').addClass('has-error');
        $('.file-name-error').show();
      }
    },
    moveFile: {
      success: function(response, oldParentId) {
        deletePobjectById(response.data.id, getPobjectById(oldParentId, rootDir));
        response.data.open = true;
        getPobjectById(response.data.directory.id, rootDir).pobjects.push(response.data);
        getPobjectById(response.data.directory.id, rootDir).open = true;
        controller.selected = null;
      },
      error: function(response) {}
    },
    shareFile: {
      success: function(response) {
        $('#shareModal' + response.data.id).modal('hide');
      },
      error: function(response) {
      }
    },
    publishFile: {
      success: function(response) {
        $('#server-error').hide();
        $('.form-group.input-group').removeClass('has-error');
        $('#publishFileModal' + response.data.id + ' input:text')[0].setSelectionRange(
          0,
          $('#publishFileModal' + response.data.id + ' input').val().length
        );
      },
      error: function(response) {
        $('#server-error').show();
        $('.form-group.input-group').addClass('has-error');
      }
    },
    copyFile: {
      success: function() {
        rootDir.open = true;
        sharedDir.open = false;
      },
      error: function() {}
    }
  };

  /* OTHER TEMPLATE FUNCTIONS */

  controller.getRoot = function() {
    return rootDir;
  };

  controller.getShared = function() {
    return sharedDir;
  };

  controller.addRights = function(file, rights, callback) {
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/user/exists',
      data: {email: controller.userEmail}
    }).then(
      function success(response) {
        $('.form-group.input-group').removeClass('has-error');
        $('.error-block').hide();
        sharePobjectWithUser(file, rights);
        if (callback) callback(file, rights);
      },
      function error(response) {
        $('.form-group.input-group').addClass('has-error');
        $('.error-block').show();
        $('input[type=email]').focus();
    });
  };

  controller.isPobjectFile = function(pobject) {
    return isPobjectFile(pobject);
  };

  controller.isPobjectDirectory = function(pobject) {
    return isPobjectDirectory(pobject);
  };

  controller.getOwner = function(email) {
    return email === root.user.email ? 'Myself' : email;
  };

  controller.canDelete = function(pobject) {
    return isOwner(pobject);
  };

  controller.canPublish = function(pobject) {
    return isOwner(pobject) && isPobjectFile(pobject);
  };

  controller.canShare = function(pobject) {
    return isOwner(pobject);
  };

  controller.canEdit = function(file) {
    if (isOwner(file)) return true;
    for (var pIx = 0; pIx < file.permissions.length; pIx++) {
      if (file.permissions[pIx].action.title === 'edit' &&
          root.user ? file.permissions[pIx].user.id === parseInt(root.user.sub) : false) {
        return true;
      }
    }
    return false;
  };

  controller.canView = function(file) {
    if (isOwner(file)) return true;
    for (var pIx = 0; pIx < file.permissions.length; pIx++) {
      if (file.permissions[pIx].action.title === 'view' &&
          root.user ? file.permissions[pIx].user.id === parseInt(root.user.sub) : false) {
        return true;
      }
    }
    return false;
  };

  controller.openFile = function(pobject) {
    openFile(pobject);
  };

  controller.getFileUrl = function(pobject) {
    return getFileUrl(pobject);
  };

  controller.isExistingFileName = function(fileName) {
    // Console error fix.
    if (files === null) return false;

    var bpmnFileName = addBpmn(fileName);
    for (var fIx = 0; fIx < files.length; fIx++) {
      if (files[fIx].title === bpmnFileName) return true;
    }
    return false;
  };

  controller.removeBpmn = function(title) {
    return removeBpmn(title);
  };

  controller.canMove = function(pobject, destination) {
    // Can not move pobject into file
    if (isPobjectFile(destination)) {
      return false;
    // Can not move pobject into itself
    } else if (pobject.id === destination.id) {
      return false;
    // Can not move pobject into directory when the resulting depth from root is > 5
    } else if (getPobjectDepth(pobject) + getInversePobjectDepth(destination) > 5) {
      return false;
    // Can move pobjects to root directory
    } else if (destination.title === 'root') {
      return true;
    // Can move files to all directories
    } else if (isPobjectFile(pobject)) {
      return true;
    }
    // Can not move directories into their child directories to prevent infinity
    for (var pIx = 0; pIx < pobject.pobjects.length; pIx++) {
      if (pobject.pobjects[pIx].id === destination.id) {
        return false;
      } else if (!controller.canMove(pobject.pobjects[pIx], destination)) {
        return false;
      }
    }
    return true;
  };

  // Reset selected directory when new move modal is opened
  controller.initModal = function(pobject) {
    $('.move').on('show.bs.modal', function (e) {
      controller.selected = null;
      scope.$apply();
    });
  };

  controller.focusInput = function(id) {
    $(id).on('shown.bs.modal', function (e) {
      $(id + ' input').focus();
      if ($(id + ' input:text').length > 0) {
        $(id + ' input:text')[0].setSelectionRange(0, $(id + ' input').val().length);
      }
    });
  };

  controller.isMatchingSearch = function(pobject) {
    // If search string is empty stop here
    if (controller.search.length === 0) {
      return true;
    }
    var match = isMatchingPartialTitle(pobject, controller.search);
    var childrenMatch = containsByPartialTitle(pobject, controller.search);
    var parentsMatch = inverseContainsByPartialTitle(pobject, controller.search);

    return match || childrenMatch || parentsMatch;
  };

  controller.isPobjectHighlighted = function(pobject) {
    return controller.search.length > 0 && isMatchingPartialTitle(pobject, controller.search);
  };

  controller.getPobjectDepth = function(pobject) {
    return getPobjectDepth(pobject);
  };

  controller.getInversePobjectDepth = function(pobject) {
    return getInversePobjectDepth(pobject);
  };

  controller.sortPobjectsByTitleAsc = function() {
    controller.sort = 1;
    sortPobjects(rootDir, sortByTitleDesc);
  };
  controller.sortPobjectsByTitleDesc = function() {
    controller.sort = 2;
    sortPobjects(rootDir, sortByTitle);
  };
  controller.sortPobjectsByLastModifiedAsc = function() {
    controller.sort = 3;
    sortPobjects(rootDir, sortByLastModifiedDesc);
  };
  controller.sortPobjectsByLastModifiedDesc = function() {
    controller.sort = 4;
    sortPobjects(rootDir, sortByLastModified);
  };

  controller.formatDate = function(date) {
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

  /* LOCAL FUNCTIONS */

  // Searches all children recursively for id
  var containsById = function(id, dir) {
    if (!isPobjectDirectory(dir) ||
        id === undefined ||
        id === null) return false;

    for (var pIx = 0; pIx < dir.pobjects.length; pIx++) {
      if (dir.pobjects[pIx].id === id) {
        return true;
      } else if (containsById(id, dir.pobjects[pIx])) {
        return true;
      }
    }

    return false;
  };

  // Searches all parents recursively for id
  var inverseContainsById = function(id, pobject) {
    if (id === undefined || pobject === undefined) return false;

    if (pobject.directory.id === id ||
        inverseContainsById(id, getPobjectById(pobject.directory.id, rootDir))) {
      return true;
    }

    return false;
  };

  // Searches all children recursively for partial title
  var containsByPartialTitle = function(dir, title) {
    if (!isPobjectDirectory(dir) ||
        title === undefined ||
        title === null) return false;

    for (var pIx = 0; pIx < dir.pobjects.length; pIx++) {
      if (isMatchingPartialTitle(dir.pobjects[pIx], title)) {
        if (!dir.open) dir.open = true;
        return true;
      } else if (containsByPartialTitle(dir.pobjects[pIx], title)) {
        if (!dir.open) dir.open = true;
        return true;
      }
    }

    return false;
  };

  // Searches all parents recursively for partial title
  var inverseContainsByPartialTitle = function(pobject, title) {
    if (title === undefined || pobject === undefined) return false;

    if (isMatchingPartialTitle(getPobjectById(pobject.directory.id, rootDir), title)) {
      return true;
    } else if (inverseContainsByPartialTitle(getPobjectById(pobject.directory.id, rootDir), title)) {
      return true;
    }

    return false;
  };

  // Searches directory and all children recursively for pobject with id
  var getPobjectById = function(id, directory) {
    if (directory.id === id) return directory;
    for (var pIx = 0; pIx < directory.pobjects.length; pIx++) {
      if (directory.pobjects[pIx].id === id) {
        return directory.pobjects[pIx];
      } else if (containsById(id, directory.pobjects[pIx])) {
        return getPobjectById(id, directory.pobjects[pIx]);
      }
    }
  };

  // Searches directory and all children recursively for pobject with id and deletes it
  var deletePobjectById = function(id, directory) {
    if (id === undefined || directory === undefined) return;

    for (var pIx = 0; pIx < directory.pobjects.length; pIx++) {
      if (directory.pobjects[pIx].id === id) {
        return directory.pobjects.splice(pIx, 1);
      } else if (isPobjectDirectory(directory.pobjects[pIx])) {
        deletePobjectById(id, directory.pobjects[pIx]);
      }
    }
  };

  var getPobjectDepth = function(pobject) {
    var depth = 1;
    if (isPobjectDirectory(pobject)) {
      var maxChildDepth = 1;
      for (var pIx = 0; pIx < pobject.pobjects.length; pIx++) {
        var childDepth = getPobjectDepth(pobject.pobjects[pIx]);
        if (childDepth > maxChildDepth) {
          maxChildDepth = childDepth;
        }
      }
      return depth + maxChildDepth;
    }
    return depth;
  };

  var getInversePobjectDepth = function(pobject) {
    var depth = 1;
    if (pobject.directory.id === undefined || pobject.directory.id === null) {
      return depth;
    } else {
      return depth + getInversePobjectDepth(getPobjectById(pobject.directory.id, rootDir));
    }
  };

  var sharePobjectWithUser = function(pobject, rights) {
    var userHasExistingRights = false;
    for (var pIx = 0; pIx < pobject.permissions.length; pIx++) {
      if (pobject.permissions[pIx].user.email === controller.userEmail) {
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
          email: controller.userEmail
        }
      };
      pobject.permissions.push(pobjectPermission);
    }
    controller.userEmail = '';
  };
  
  var unShareFileWithUser = function(pobject, directory) {
	  
	var userHasExistingRights = false;
	  
	for (var pIx = 0; pIx < pobject.permissions.length; pIx++) {

		if (pobject.permissions[pIx].user.email === root.user.email) {
			  
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

  var isOwner = function(pobject) {
    return root.user ? pobject.user.id === parseInt(root.user.sub) : false;
  };

  var removeBpmn = function(title) {
    return title.replace(/.bpmn$/, "");
  };

  var addBpmn = function(title) {
    return title + '.bpmn';
  }

  var createPublicUrls = function(pobject) {
    for (var pIx = 0; pIx < pobject.pobjects.length; pIx++) {
      if (isPobjectDirectory(pobject.pobjects[pIx])) {
        createPublicUrls(pobject.pobjects[pIx])
      } else if (isPobjectFile(pobject.pobjects[pIx])) {
        createPublicUrl(pobject.pobjects[pIx]);
      }
    }
  };

  var createPublicUrl = function(pobject) {
    if (pobject.published) {
      pobject.publicUrl = root.config.frontend.host + "/app/#/view/" + pobject.uri;
    } else {
      pobject.publicUrl = '';
    }
  };

  var isPobjectDirectory = function(pobject) {
    return pobject.type === 'directory';
  };

  var isPobjectFile = function(pobject) {
    return pobject.type === 'file';
  };

  var isMatchingPartialTitle = function(pobject, title) {
    if (pobject === undefined || title === undefined) return false;
    return pobject.title.toLowerCase().indexOf(title.toLowerCase()) > -1;
  };

  var openFile = function(pobject) {
    $window.open(getFileUrl(pobject), '_blank');
  };

  var getFileUrl = function(pobject) {
    return root.config ? root.config.frontend.host + "/modeler/" + pobject.id : '';
  };

  var sortPobjects = function(dir, sortFunction) {
    if (!isPobjectDirectory(dir)) return;
    dir.pobjects.sort(sortFunction);
    for (var pIx = 0; pIx < dir.pobjects.length; pIx++) {
      if (isPobjectDirectory(dir.pobjects[pIx])) {
        sortPobjects(dir.pobjects[pIx], sortFunction);
      }
    }
  };

  var sortByTitle = function(a, b) {
    if (a.title < b.title)
      return -1;
    if (a.title > b.title)
      return 1;
    return 0;
  };

  var sortByTitleDesc = function(a, b) {
    if (a.title < b.title)
      return 1;
    if (a.title > b.title)
      return -1;
    return 0;
  };

  var sortByLastModified = function(a, b) {
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

  var sortByLastModifiedDesc = function(a, b) {
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

  var getActiveBaseDirectory = function() {
    if (rootDir.open) {
      return rootDir;
    } else if (sharedDir.open) {
      return sharedDir;
    }
  };

  var updateFileAttributes = function(oldFile, newFile) {
    oldFile.directory = newFile.directory;
    oldFile.id = newFile.id;
    oldFile.lastModified = newFile.lastModified;
    oldFile.permissions = newFile.permissions;
    oldFile.published = newFile.published;
    oldFile.uri = newFile.uri;
    oldFile.title = newFile.title;
    oldFile.user = newFile.user;
    createPublicUrl(oldFile);
  };

  if (auth.isAuthenticated()) {
    getRootDirectory();
    getSharedDirectory();
  } else {
    $('#loginModal').modal();
  }

  root.$on("userAuthenticated", function (args) {
    getRootDirectory();
    getSharedDirectory();
  });

  // Watch local storage info for changes with files
  root.$watch(function () {
    return localStorage.lastModified;
  }, function(newVal, oldVal) {
    var id = parseInt(localStorage.lastModifiedFileId);
    if (oldVal !== newVal) {
      http({
        method: 'GET',
        url: root.config.backend.host + '/rest/directories/files/' + id
      }).then(function success(response) {
        var oldFile = getPobjectById(id, rootDir);
        if (oldFile) {
          updateFileAttributes(getPobjectById(id, rootDir), response.data);
        } else {
          var parent = getPobjectById(response.data.directory.id, rootDir);
          response.data.md5Hash = null;
          response.data.content = null;
          parent.pobjects.unshift(response.data);
        }
      }, function failure(response) {
      });
    }
  });

}]);
