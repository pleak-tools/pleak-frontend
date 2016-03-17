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

  var fileNames = null;
  var fileModifiedDates = null;

  var domain = 'http://localhost:8000';

  http({
    method: 'GET',
    url: 'http://localhost:8080/pleak/list'
  }).then(function(response) {
    fileNames = response.data.fileNames;
    fileModifiedDates = response.data.fileModifiedDates;
  });

  // Refresh the page when user saves to display updated files.
  window.addEventListener('message', function(event) {
    var origin = event.origin || event.originalEvent.origin;

    if (origin !== domain)
      return;

    window.location.reload();
  }, false);

  controller.getFileNames = function() {
    return fileNames;
  };

  controller.getFileModifiedDates = function() {
    return fileModifiedDates;
  };

  controller.noFiles = function() {
    // Console error fix.
    if (fileNames === null) return true;

    return fileNames.length == 0;
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
    if (fileNames === null) return false;

    var bpmnFileName = fileName + '.bpmn';
    for (var fIx = 0; fIx < fileNames.length; fIx++) {
      if (fileNames[fIx] === bpmnFileName) return true;
    }
    return false;
  }

}]);
