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

  http({
    method: 'GET',
    url: 'http://localhost:8080/pleak/list'
  }).then(function(response) {
    _files = response.data.list;
  });

  controller.files = function() {
    return _files;
  };

  controller.noFiles = function() {
    return _files.length == 0;
  };

  controller.openFile = function(fileName) {
    var modelerAddress = "http://localhost:8000/modeler.html";

    //var bpmnEditor = window.open(modelerAddress, "pleaks modeler", "toolbar=yes, scrollbars=yes");
    var bpmnEditor = window.open(modelerAddress);

    bpmnEditor.onload = function(e) {
      bpmnEditor.postMessage(fileName, "*");
    }
  };

  controller.deleteFile = function(fileName) {
    // Delete stuff
  }

}]);
