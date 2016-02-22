'use strict';

var CustomModeler = require('./pleaks-modeler');
var modeler = new CustomModeler({ container: '#canvas', keyboard: { bindTo: document } });

var newDiagramXML = require('../resources/newDiagram.bpmn');

modeler.importXML(newDiagramXML, function(err) {
  if (err) {
    console.error('something went wrong:', err);
  }

  modeler.get('canvas').zoom('fit-viewport');
});

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
