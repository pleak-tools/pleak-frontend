'use strict';

var $ = require('jquery');

const topologicalSorting = function (adjList, invAdjList, sources) {
    var order = new Array();
    
    var sourcesp = new Set(sources);
    var invAdjListp = new Map();
    for (var [key, value] of invAdjList)
        invAdjListp.set(key, Array.from(value));
    while (sourcesp.size > 0) {
        var n = sourcesp.values().next().value;
        sourcesp.delete(n);
        order.push(n);
        if (adjList.get(n))
            for (let m of adjList.get(n)) {
                invAdjListp.get(m).splice(invAdjListp.get(m).indexOf(n), 1);
                if (invAdjListp.get(m).length == 0) {
                    sourcesp.add(m);
                }
            }
    }
    
    return order;
}

const transitiveClosure = function (adjList, sources) {
    var transClosure = new Map();
    
    for (let source of sources) {
        var visited = new Set();
        var open = new Array(source);
        while (open.length > 0) {
            var curr = open.pop();
            visited.add(curr);
            if (adjList.get(curr))
                for (let succ of adjList.get(curr))
                    if (!visited.has(succ) && open.indexOf(succ) < 0)
                        open.push(succ);
        }
        transClosure.set(source, visited);        
    }
    return transClosure;
}

const computeDPMatrices = function (adjList, invAdjList, sources, sinks) {
    var order = topologicalSorting(adjList, invAdjList, sources);
    var transClosure = transitiveClosure(adjList, sources);
    
    var ddp = new Map();
    var dc = new Map();
    
    for (let p of order) {
        if (p.$type !== "bpmn:DataObjectReference") {
            console.log(`About to process: ${p.name}`);
            for (let source of sources) {
                console.log('--------------');
                console.log(`Source: ${source.name}`);
                if (!transClosure.get(source).has(p)) continue;
                console.log(`Source: ${source.name}`);
                console.log('..');
                for (let pred of invAdjList.get(p)) {
                    if (!transClosure.get(source).has(pred)) continue;
                    console.log(`Predecessor: ${pred.name}`);
                    for (let succ of adjList.get(p)) {
                        if (!transClosure.get(source).has(succ)) continue;
                        console.log(`Successor: ${succ.name}`);
                        if (source === pred) {
                            var map1 = ddp.get(pred) || new Map();
                            map1.set(succ, p.matrices.dpMatrix[pred.id][succ.id]);
                            console.log(`epsilon_{${p.name}}[${pred.name},${succ.name}] = ${p.matrices.dpMatrix[pred.id][succ.id]}`);
                            ddp.set(pred, map1);
                            var map2 = dc.get(pred) || new Map();
                            map2.set(succ, p.matrices.cMatrix[pred.id][succ.id]);
                            console.log(`c_{${p.name}}[${pred.name},${succ.name}] = ${p.matrices.cMatrix[pred.id][succ.id]}`);
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
    
    for (let src of sources) {
        for (let snk of sinks) {
            if (ddp.get(src) && ddp.get(src).has(snk)) {
                console.log(`ddp(${src.name},${snk.name})= ${ddp.get(src).get(snk)}`);
                console.log(`dc(${src.name},${snk.name})= ${dc.get(src).get(snk)}`);
            }
        }
    }
    
    var htmlStr = "<h3>Differential privacy</h3> <table class='matrix'>";
    htmlStr += "<tr class='matrix'><td class='matrix'/>";
    var targets = new Array();
    for (let tgt of order)
        if (tgt.$type == "bpmn:DataObjectReference" && !sources.has(tgt)) {
            targets.push(tgt);
            htmlStr += "<td class='matrix'>"+(tgt.name || j)+"</td>";
        }
    for (let src of order) {
        if (src.$type == "bpmn:DataObjectReference" && sources.has(src)) {
            htmlStr += "<tr class='matrix'><td class='matrix'>" + src.name +"</td>";
            for (let tgt of targets) 
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
    var targets = new Set();
    for (let flowElement of procDef.flowElements) {
        if (flowElement.dataInputAssociations) {
            for (let sourceAssociation of flowElement.dataInputAssociations) {
                let sourceNode = sourceAssociation.sourceRef[0];
                adjList.set(sourceNode, (adjList.get(sourceNode) || []).concat(flowElement));
                invAdjList.set(flowElement, (invAdjList.get(flowElement) || []).concat(sourceNode));
                targets.add(flowElement);
            }
        }
        if (flowElement.dataOutputAssociations) {
            for (let targetAssociation of flowElement.dataOutputAssociations) {
                let targetNode = targetAssociation.targetRef;
                adjList.set(flowElement, (adjList.get(flowElement) || []).concat(targetNode));
                invAdjList.set(targetNode, (invAdjList.get(targetNode) || []).concat(flowElement));
                targets.add(targetNode);
            }
        }
    }
    console.log(adjList);
    var sources = new Set();
    var sinks = new Set();

    for (let node of adjList.keys()) if (!targets.has(node)) sources.add(node);
    for (let node of targets) if (!adjList.has(node)) sinks.add(node);

    computeDPMatrices(adjList, invAdjList, sources, sinks);
}

module.exports = function(elementRegistry) {
for (var key in elementRegistry._elements) {
    var element = elementRegistry.get(key);
    if (element.type == "bpmn:Process") {
        analyzeDPOnProcessDef(element.businessObject);        
    }
}};