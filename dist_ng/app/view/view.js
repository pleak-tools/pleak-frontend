'use strict';

angular.module('pleaks.view', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view/:fileName', {
    templateUrl: 'view/view.html',
    controller: 'ViewController'
  });
}])

.controller('ViewController', ['$scope', '$rootScope', '$http', '$routeParams', function(scope, root, http, routeParams) {
  var controller = this;
  var modelerAddress = root.config.frontend.host + "/modeler.html";
  scope.fileName = routeParams.fileName;

  controller.openFile = function() {
    var message = {
      fileName: scope.fileName,
      type: 'view'
    };

    //var bpmnEditor = window.open(modelerAddress, "pleaks modeler", "toolbar=no, scrollbars=yes");
    var bpmnEditor = window.open(modelerAddress);

    bpmnEditor.onload = function(e) {
      bpmnEditor.postMessage(message, "*");
    }
  };



}]);
