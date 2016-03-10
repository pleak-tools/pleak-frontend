'use strict';

var CustomModeler = require('./pleaks-modeler');
var modeler = new CustomModeler({ container: '#canvas', keyboard: { bindTo: document } });

var request = require('superagent');

// if model name arrived - requesting the model from the server
window.addEventListener("message", function(event) {
  var origin = event.origin || event.originalEvent.origin;
  if (origin !== "http://example.org:8000")
    return;

  var fileName = event.data;

  request
    .get('http://localhost:8080/pleak/open?fileName=' + fileName)
    .withCredentials()
    .end(function(err, res){
      console.log(res);

      var diagram = JSON.parse(res.text).text;
      openDiagram(diagram);
    });
}, false);

var newDiagramXML = require('../resources/newDiagram.bpmn');
openDiagram(newDiagramXML);

function openDiagram(diagram) {
  modeler.importXML(diagram, function(err) {
    if (err) {
      console.error('something went wrong:', err);
    }

    modeler.get('canvas').zoom('fit-viewport');
  });
}

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
