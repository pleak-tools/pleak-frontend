'use strict';

angular.module('pleaks.view', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view/:fileUri', {
    templateUrl: 'view/view.html'
  });
}])

.controller('ViewController', ['$scope', '$rootScope', '$http', '$routeParams', function(scope, root, http, routeParams) {
  var controller = this;

  scope.fileUri = routeParams.fileUri;

  var BpmnViewer = window.BpmnJS;
  var viewer;

  var file;

  var getPublishedFile = function(uri) {
    http({
      method: 'GET',
      url: root.config.backend.host + '/rest/directories/files/public/' + uri
    }).then(function success(response) {
      file = response.data;
      viewer = new BpmnViewer({ container: '#viewer-canvas' });
      viewer.importXML(file.content, function(err) {
        if (!err) {
          viewer.get('#viewer-canvas').zoom('fit-viewport');
        } else {
          // error
        }
      });
    }, function failure(response) {

    });
  };

  controller.getFileName = function() {
    return file.title;
  }

  controller.nothingFound = function() {
    return file === undefined;
  }

  getPublishedFile(scope.fileUri);
}]);
