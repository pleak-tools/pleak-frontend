'use strict';

angular.module('pleaks.files', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/files', {
    templateUrl: 'files/files.html',
    controller: 'FilesController'
  });
}])

.controller('FilesController', ['$scope','$http', function(scope, http) {
  var controller = this;
  var domain = 'http://localhost:8000';
  var files = null;

  // TODO: This request is fired multiple times due to Angular mechanisms, pls fix.
  http({
    method: 'GET',
    url: 'http://localhost:8080/pleak-backend/rest/files/'
  }).then(function(response) {
    files = response.data.files;
    $('#filesLoading').fadeOut('slow', function() {
      $('#filesTable').fadeIn('slow');
      $('#filesNew').fadeIn('slow');
    });

  });

  // Refresh the page when user saves to display updated files.
  window.addEventListener('message', function(event) {
    var origin = event.origin || event.originalEvent.origin;

    if (origin !== domain)
      return;

    window.location.reload();
  }, false);

  controller.getFiles = function() {
    return files;
  };

  controller.noFiles = function() {
    // Console error fix.
    if (files === null) return true;

    return files.length == 0;
  };

  controller.openFile = function(message) {
    var modelerAddress = "http://localhost:8000/modeler.html";

    //var bpmnEditor = window.open(modelerAddress, "pleaks modeler", "toolbar=yes, scrollbars=yes");
    var bpmnEditor = window.open(modelerAddress);

    bpmnEditor.onload = function(e) {
      bpmnEditor.postMessage(message, "*");
    }
  };

  controller.newFile = function(title) {
    var message = {
      title: title,
      type: 'new'
    };

    controller.openFile(message);
  };

  controller.editFile = function(id) {
    var message = {
      id: id,
      type: 'edit'
    };

    controller.openFile(message);
  }

  controller.deleteFile = function(id) {
    // Delete stuff
    http({
      method: 'DELETE',
      url: 'http://localhost:8080/pleak-backend/rest/files/' + id
    }).then(function(response) {
      if (response.status === 200) {
        files.splice(getFileIndexById(id), 1);
      }
    });
  }

  controller.isExistingFileName = function(fileName) {
    // Console error fix.
    if (files === null) return false;

    var bpmnFileName = fileName + '.bpmn';
    for (var fIx = 0; fIx < files.length; fIx++) {
      if (files[fIx].title === bpmnFileName) return true;
    }
    return false;
  }

  var getFileIndexById = function(id) {
    for (var fIx = 0; fIx < files.length; fIx++) {
      if (files[fIx].id === id) {
        return fIx;
      }
    }
    return -1;
  };

}]);
