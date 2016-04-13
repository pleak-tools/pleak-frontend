'use strict';

var is = require('bpmn-js/lib/util/ModelUtil').is;
var $ = require('jquery');

var buildMatrix = function(task, preds, succs, label, labelId) {
        
    var htmlStr = "<h3>"+ label +"</h3> <table class='matrix'>";
    htmlStr += "<tr class='matrix'><td class='matrix'/>";
    for (var j in succs) {
        var succ = succs[j];
        htmlStr += "<td class='matrix'>"+(succ.name || j)+"</td>";
    }
    htmlStr += "</tr>";
    for (var i in preds) {
        var pred = preds[i];
        htmlStr += "<tr class='matrix'><td class='matrix'>" + (pred.name || i) +"</td>";
        for (var j in succs) {
            var succ = succs[j];
            htmlStr += "<td class='matrix'><input class='matrix' id='"+pred.id+","+succ.id+","+task.id+","+labelId+"' value='"+task.businessObject.matrices[labelId][pred.id][succ.id]+"' onchange='changeTracker(this)' onfocus='focusTracker(this)' onblur='blurTracker(this)'/></td>";
        }
        htmlStr += "</tr>";
    }
    htmlStr += "</table>";
    
    return htmlStr;
};

module.exports = function(group, element) {
  if (is(element, 'bpmn:Task')) {
    var predecessors = [];
    var successors = [];
    if (element.incoming) {
        for (var i in element.incoming)
            if (element.incoming[i].type == "bpmn:DataInputAssociation")
                predecessors.push(element.incoming[i].businessObject.sourceRef[0]);
        for (var i in element.outgoing)
            if (element.outgoing[i].type == "bpmn:DataOutputAssociation")
                successors.push(element.outgoing[i].businessObject.targetRef);
    }
    
    var matrices = document.checkMatrices(element, predecessors, successors);
    
    if (predecessors.length > 0 && successors.length > 0) {
        if (element.dptask == null) element.dptask = false;
        var checked = element.dptask?"checked=\"true\"":"";
        group.entries.push({
            id : 'pleak-dpvalues',
            description : 'DP-Task check box',
            label : 'DP-Task',
            modelProperty : 'dptask',
            html: 
                "<div class=\"checkbox\">"+
                "<label><input type=\"checkbox\" value=\"\" "+checked+" onchange='toggleDPTaskTracker(\""+element.id+"\")'>DP-Task</label>"+
                "</div>"
        });
        group.entries.push({
            id : 'pleak-dpvalues',
            description : 'DP-Task differential privacy values',
            label : 'Differential privacy values',
            modelProperty : 'dvalues',
            html: buildMatrix(element, predecessors, successors, 'Differential privacy', 'dpMatrix')
            });
        group.entries.push({
            id : 'pleak-cvalues',
            description : 'DP-Task sensitivity values',
            label : 'Sensitivity values',
            modelProperty : 'cvalues',
            html: buildMatrix(element, predecessors, successors, 'Sensitivity', 'cMatrix')
            });
    }
  } else if (is(element, 'bpmn:Process')) {
      console.log(element);
      group.entries.push({
        id : 'pleak-dpbounds',
        description : 'PA-BPMN differential privacy values',
        label : 'PA-BPMN differential privacy values',
        modelProperty : 'matrices',
        html: '<div id="pabpmn-matrices"></div>'
        });

  }
};