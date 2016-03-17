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

  var _files = null;

  var domain = 'http://localhost:8000';

  http({
    method: 'GET',
    url: 'http://localhost:8080/pleak/list'
  }).then(function(response) {
    _files = response.data.list;
  });

  // Refresh the page when user saves to display updated files.
  window.addEventListener('message', function(event) {
    var origin = event.origin || event.originalEvent.origin;

    if (origin !== domain)
      return;

    window.location.reload();
  }, false);

  controller.files = function() {
    return _files;
  };

  controller.noFiles = function() {
    // Console error fix.
    if (_files === null) return true;

    return _files.length == 0;
  };

  controller.openFile = function(message) {
    var modelerAddress = "http://localhost:8000/modeler.html";

    //var bpmnEditor = window.open(modelerAddress, "pleaks modeler", "toolbar=yes, scrollbars=yes");
    var bpmnEditor = window.open(modelerAddress);

    bpmnEditor.onload = function(e) {
      bpmnEditor.postMessage(message, "*");
    }
  };

  controller.newFile = function(fileName) {
    var message = {
      fileName: fileName,
      type: 'new'
    };

    controller.openFile(message);
  };

  controller.editFile = function(fileName) {
    var message = {
      fileName: fileName,
      type: 'edit'
    };

    controller.openFile(message);
  }

  controller.deleteFile = function(fileName) {
    // Delete stuff
  }

  controller.isExistingFileName = function(fileName) {
    // Console error fix.
    if (_files === null) return false;

    var bpmnFileName = fileName + '.bpmn';
    for (var fIx = 0; fIx < _files.length; fIx++) {
      if (_files[fIx] === bpmnFileName) return true;
    }
    return false;
  }

}]);
