'use strict';

var $ = require('jquery');

var topologicalSorting = function (adjList, invAdjList, sources) {
    var order = new Array();
    
    var sourcesp = sources.slice();
    var invAdjListp = new Map();

    $.each(invAdjList, function(key, value) {
        invAdjList.set(key, value.slice());
    });

    while (sourcesp.length > 0) {
        var n = sourcesp.pop();
        order.push(n);
        if (adjList.get(n))
            for (var _m in adjList.get(n)) {
                var m = adjList.get(n)[_m];
                invAdjListp.get(m).splice(invAdjListp.get(m).indexOf(n), 1);
                if (invAdjListp.get(m).length == 0) {
                    sourcesp.push(m);
                }
            }
    }
    
    return order;
}

var transitiveClosure = function (adjList, sources) {
    var transClosure = new Map();

    $.each(sources, function(key, value) {
        var source = sources[key];
        var visited = new Array();
        var open = new Array();
        open.push(source);
        while (open.length > 0) {
            var curr = open.pop();
            visited.push(curr);
            if (adjList.get(curr)) {
                $.each(adjList.get(curr), function(k, v) {
                    var succ = adjList.get(curr)[k];
                    if (visited.indexOf(succ) < 0 && open.indexOf(succ) < 0)
                        open.push(succ);
                });
            }
        }
        transClosure.set(source, visited);        
    });

    return transClosure;
}

var computeDPMatrices = function (adjList, invAdjList, sources, sinks) {
    var order = topologicalSorting(adjList, invAdjList, sources);
    var transClosure = transitiveClosure(adjList, sources);
    
    var ddp = new Map();
    var dc = new Map();
    
    for (var _p in order) {
        var p = order[_p];
        if (p.$type !== "bpmn:DataObjectReference") {
            // console.log(`About to process: ${p.name}`);
            for (var i; i < sources.length; ++i) {
                var source = sources[i];
                // var source = sources[_source];
                // console.log('--------------');
                // console.log(`Source: ${source.name}`);
                if (transClosure.get(source).indexOf(p) < 0) continue;
                // console.log(`Source: ${source.name}`);
                // console.log('..');
                for (var _pred in invAdjList.get(p)) {
                    var pred = invAdjList.get(p)[_pred];
                    if (transClosure.get(source).indexOf(pred) < 0) continue;
                    // console.log(`Predecessor: ${pred.name}`);
                    for (var _succ in adjList.get(p)) {
                        var succ = adjList.get(p)[_succ];
                        if (transClosure.get(source).indexOf(succ) < 0) continue;
                        // console.log(`Successor: ${succ.name}`);
                        if (source === pred) {
                            var map1 = ddp.get(pred) || new Map();
                            map1.set(succ, p.matrices.dpMatrix[pred.id][succ.id]);
                            // console.log(`epsilon_{${p.name}}[${pred.name},${succ.name}] = ${p.matrices.dpMatrix[pred.id][succ.id]}`);
                            ddp.set(pred, map1);
                            var map2 = dc.get(pred) || new Map();
                            map2.set(succ, p.matrices.cMatrix[pred.id][succ.id]);
                            // console.log(`c_{${p.name}}[${pred.name},${succ.name}] = ${p.matrices.cMatrix[pred.id][succ.id]}`);
                            dc.set(pred, map2);                        
                        } else {
                            if (ddp.get(source) && ddp.get(source).has(pred)) {
                                var _ddp = ddp.get(source).get(pred);
                                var _dc = dc.get(source).get(pred);
                                if (ddp.get(source).has(succ)) {
                                    var __ddp = ddp.get(source).get(succ);
                                    var __dc = dc.get(source).get(succ);
                                    
                                    ddp.get(source).set(succ, __ddp + Math.min(_ddp, _dc * p.matrices.dpMatrix[pred.id][succ.id]));
                                    dc.get(source).set(succ, __dc + _dc * p.matrices.cMatrix[pred.id][succ.id]);
                                    // ddp.get(source).set(succ, `${__ddp} + min(${_ddp}, ${_dc} * epsilon_{${p.name}}[${pred.name},${succ.name}])`);
                                    // dc.get(source).set(succ, `${__dc} + ${_dc} * c_{${p.name}}[${pred.name},${succ.name}]`);
                                } else {
                                    ddp.get(source).set(succ, Math.min(_ddp, _dc * p.matrices.dpMatrix[pred.id][succ.id]));
                                    dc.get(source).set(succ, _dc * p.matrices.cMatrix[pred.id][succ.id]);
                                    // ddp.get(source).set(succ, `min(${_ddp}, ${_dc} * epsilon_{${p.name}}[${pred.name},${succ.name}])`);
                                    // dc.get(source).set(succ, `${_dc} * c_{${p.name}}[${pred.name},${succ.name}]`);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // for (var _src in sources) {
    //     var src = sources[_src];
    //     for (var snk in sinks) {
    //         var snk = sinks[_snk];
    //         if (ddp.get(src) && ddp.get(src).has(snk)) {
    //             console.log(`ddp(${src.name},${snk.name})= ${ddp.get(src).get(snk)}`);
    //             console.log(`dc(${src.name},${snk.name})= ${dc.get(src).get(snk)}`);
    //         }
    //     }
    // }
    
    var htmlStr = "<h3>Differential privacy</h3> <table class='matrix'>";
    htmlStr += "<tr class='matrix'><td class='matrix'/>";
    var targets = new Array();
    for (var i; i < order.length; ++i) {
        var tgt = order[i];
        if (tgt.$type == "bpmn:DataObjectReference" && sources.indexOf(tgt) < 0) {
            targets.push(tgt);
            htmlStr += "<td class='matrix'>"+(tgt.name || j)+"</td>";
        }
    }
    for (var j; j < order.length; ++j) {
        var src = order[j];
        if (src.$type == "bpmn:DataObjectReference" && sources.indexOf(src) >= 0) {
            htmlStr += "<tr class='matrix'><td class='matrix'>" + src.name +"</td>";
            for (var tgt in targets)
                htmlStr += "<td class='matrix'><input class='matrix' id='"+src.id+","+tgt.id+"' value='"+ddp.get(src).get(tgt)+"' onfocus='focusTracker(this)' onblur='blurTracker(this)'/></td>";
            htmlStr += "</tr>";
        }
    }
    htmlStr += "</table>";
    
    $("div#pabpmn-matrices").html(htmlStr);
}

var analyzeDPOnProcessDef = function (procDef) {
    var adjList = new Map();
    var invAdjList = new Map();
    var targets = new Array();
    for (var _flowElement in procDef.flowElements) {
        var flowElement = procDef.flowElements[_flowElement];
        if (flowElement.dataInputAssociations) {
            for (var _sourceAssociation in flowElement.dataInputAssociations) {
                var sourceAssociation = flowElement.dataInputAssociations[_sourceAssociation];
                var sourceNode = sourceAssociation.sourceRef[0];
                adjList.set(sourceNode, (adjList.get(sourceNode) || []).concat(flowElement));
                invAdjList.set(flowElement, (invAdjList.get(flowElement) || []).concat(sourceNode));
                targets.push(flowElement);
            }
        }
        if (flowElement.dataOutputAssociations) {
            for (var _targetAssociation in flowElement.dataOutputAssociations) {
                var targetAssociation = flowElement.dataOutputAssociations[_targetAssociation];
                var targetNode = targetAssociation.targetRef;
                adjList.set(flowElement, (adjList.get(flowElement) || []).concat(targetNode));
                invAdjList.set(targetNode, (invAdjList.get(targetNode) || []).concat(flowElement));
                targets.push(targetNode);
            }
        }
    }
    console.log(adjList);
    var sources = new Array();
    var sinks = new Array();

    if (!Object.keys) {
        Object.keys = function(obj) {
            var keys = [];
            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    keys.push(i);
                }
            }
            return keys;
        };
    }

    for (var i=0; i < adjList.length; ++i) {
        var node = adjList.keys()[i];
        if (targets.indexOf(node) < 0) sources.push(node);
    }

    for (var j=0; j < targets.length; ++j) {
        var node = targets[j];
        if (!adjList.has(node)) sinks.push(node);
    }

    computeDPMatrices(adjList, invAdjList, sources, sinks);
}

module.exports = function(elementRegistry) {
for (var key in elementRegistry._elements) {
    var element = elementRegistry.get(key);
    if (element.type == "bpmn:Participant") {
        var procDef = element.businessObject.processRef;
        if (procDef.flowElements.length > 0)
            analyzeDPOnProcessDef(procDef);        
    } else if (element.type == "bpmn:Process") {
        analyzeDPOnProcessDef(element.businessObject);        
    }
}};