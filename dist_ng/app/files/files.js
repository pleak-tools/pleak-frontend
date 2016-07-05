'use strict';

angular.module('pleaks.files', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/files', {
    templateUrl: 'files/files.html'
  });
}])

.controller('FilesController', ['$rootScope', '$scope', '$http', '$window', function(root, scope, http, window) {
  var controller = this;
  var files = null;

  controller.userEmail = '';

  var requestFiles = function() {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/files/'
    }).then(
      function success(response) {
        files = response.data.files;
        createPublicUrls();
        $('#filesLoading').fadeOut('slow', function() {
          $('#filesTable').fadeIn('slow');
          $('#filesNew').fadeIn('slow');
        });
      },
      function error(response) {
        $('#loginModal').modal();
    });
  };

  controller.addRights = function(file, rights) {
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/user/exists',
      data: {email: controller.userEmail}
    }).then(
      function success(response) {
        $('.form-group.input-group').removeClass('has-error');
        $('.error-block').hide();
        shareFileWithUser(file, rights);
      },
      function error(response) {
        $('.form-group.input-group').addClass('has-error');
        $('.error-block').show();
        $('input[type=email]').focus();
    });
  };

  var shareFileWithUser = function(file, rights) {
    var userHasExistingRights = false;
    for (var pIx = 0; pIx < file.filePermissions.length; pIx++) {
      if (file.filePermissions[pIx].user.email === controller.userEmail) {
        userHasExistingRights = true;
        file.filePermissions[pIx].action.title = rights;
        break;
      }
    }
    if (!userHasExistingRights) {
      var filePermission = {
        action: {
          title: rights
        },
        user: {
          email: controller.userEmail
        }
      };
      file.filePermissions.push(filePermission);
    }
    controller.userEmail = '';
  };

  controller.submitNewFileRights = function(file) {
    var data = {
      id: file.id,
      title: file.title,
      filePermissions: file.filePermissions
    };
    http({
      method: 'POST',
      url: root.config.backend.host + '/rest/files/' + file.id + '/permissions',
      data: data
    }).then(
      function success(response) {
        //
      },
      function error(response) {
        //
    });
  };

  requestFiles();
  root.$on("userAuthenticated", function (args) {
    requestFiles();
  });

  // Refresh the page when user saves to display updated files.
  window.addEventListener('message', function(event) {
    var origin = event.origin || event.originalEvent.origin;

    if (origin !== root.config.frontend.host)
      return;

    window.location.reload();
  }, false);

  controller.getOwner = function(email) {
    return email === root.user.email ? 'Myself' : email;
  };

  // Only owner can delete at the moment
  controller.canDelete = function(file) {
    return file.user.id === parseInt(root.user.sub);
  };

  // Only owner can share at the moment
  controller.canShare = function(file) {
    return file.user.id === parseInt(root.user.sub);
  };

  controller.canEdit = function(file) {
    if (file.user.id === parseInt(root.user.sub)) return true;
    for (var pIx = 0; pIx < file.filePermissions.length; pIx++) {
      if (file.filePermissions[pIx].action.title === 'edit' &&
          file.filePermissions[pIx].user.id === parseInt(root.user.sub)) {
        return true;
      }
    }
    return false;
  };

  controller.canView = function(file) {
    if (file.user.id === parseInt(root.user.sub)) return true;
    for (var pIx = 0; pIx < file.filePermissions.length; pIx++) {
      if (file.filePermissions[pIx].action.title === 'view' &&
          file.filePermissions[pIx].user.id === parseInt(root.user.sub)) {
        return true;
      }
    }
    return false;
  };

  controller.getFiles = function() {
    return files;
  };

  controller.noFiles = function() {
    // Console error fix.
    if (files === null) return true;

    return files.length == 0;
  };

  controller.openFile = function(id) {
    window.open(controller.getFileUrl(id), '_blank');
  };

  controller.getFileUrl = function(id) {
    return root.config.frontend.host + "/modeler/" + id;
  };

  controller.newFile = function(title) {
    var file = {
      title: title,
      content: ''
    };

    http({
      method: 'POST',
      data: file,
      url: root.config.backend.host + '/rest/files/'
    }).then(
      function success(response) {
        requestFiles();
        controller.openFile(response.data.id);
      },
      function error(response) {
        //
    });

    //controller.openFile(message);
  };

  controller.deleteFile = function(id) {
    // Delete stuff
    http({
      method: 'DELETE',
      url: root.config.backend.host + '/rest/files/' + id
    }).then(function(response) {
      if (response.status === 200) {
        files.splice(getFileIndexById(id), 1);
      }
    });
  };

  controller.renameFile = function(title, file) {
    var data = {
      id: file.id,
      title: addBpmn(title)
    };

    http({
      method: 'POST',
      data: data,
      url: root.config.backend.host + '/rest/files/' + file.id + '/rename'
    }).then(
      function success(response) {
        file.title = addBpmn(title);
        $('.form-group.input-group').removeClass('has-error');
        $('#incorrect-file-name').hide();
        $('#renameFileModal' + file.id).modal('hide');
      },
      function error(response) {
        $('.form-group.input-group').addClass('has-error');
        $('#incorrect-file-name').show();
      }
    );
  };

  controller.removeBpmn = function(title) {
    return title.replace(/.bpmn$/, "");
  };

  var addBpmn = function(title) {
    return title + '.bpmn';
  }

  controller.isExistingFileName = function(fileName) {
    // Console error fix.
    if (files === null) return false;

    var bpmnFileName = addBpmn(fileName);
    for (var fIx = 0; fIx < files.length; fIx++) {
      if (files[fIx].title === bpmnFileName) return true;
    }
    return false;
  };

  controller.publishFile = function(file) {
    var data = {
     id: file.id
    };

    http({
      method: 'POST',
      data: data,
      url: root.config.backend.host + '/rest/view/'
    }).then(
      function success(response) {
        file.uri = response.data.uri;
        file.published = response.data.published;
        file.publicUrl = root.config.frontend.host + "/app/#/view/" + file.uri;
        $('#server-error').hide();
        $('.form-group.input-group').removeClass('has-error');
      },
      function error(response) {
        $('#server-error').show();
        $('.form-group.input-group').addClass('has-error');
    });
  };

  var createPublicUrls = function() {
    for (var fIx = 0; fIx < files.length; fIx++) {
      if (files[fIx].published) {
        files[fIx].publicUrl = root.config.frontend.host + "/app/#/view/" + files[fIx].uri;
      }
    }
  };

  controller.removePublicUri = function(fileUri, fileId) {
    http({
      method: 'DELETE',
      url: root.config.backend.host + '/rest/view/' + fileUri
    }).then(function(response) {
      if (response.status === 200) {
        requestFiles();
      }
    });
  };

  var getFileIndexById = function(id) {
    for (var fIx = 0; fIx < files.length; fIx++) {
      if (files[fIx].id === id) {
        return fIx;
      }
    }
    return -1;
  };

}]);
