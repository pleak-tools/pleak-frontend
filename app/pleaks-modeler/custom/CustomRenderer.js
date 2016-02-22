'use strict';

var inherits = require('inherits');

var BaseRenderer = require('diagram-js/lib/draw/BaseRenderer');

var componentsToPath = require('diagram-js/lib/util/RenderUtil').componentsToPath;


/**
 * A renderer that knows how to render custom elements.
 */
function CustomRenderer(eventBus, styles) {

  BaseRenderer.call(this, eventBus, 2000);

  this._styles = styles;

  var self = this;

  var computeStyle = styles.computeStyle;

  this.handlers = {
    'custom:query': function(p, element) {
      return self.drawQuery(p, element.width);
    }
  };

  /*
   * Draws the Query sign, a hexagon.
   */
  this.drawQuery = function(p, side, attrs) {
    var halfSide = side / 2,
        oneFourthSide = side / 4,
        threeFourthSide = (side / 4) * 3,
        points;

    points = [ halfSide, 0, side, oneFourthSide, side, threeFourthSide, halfSide, side, 0, threeFourthSide, 0, oneFourthSide ];

    attrs = computeStyle(attrs, {
      stroke: '#1f484f',
      strokeWidth: 3,
      fill: '#357986'
    });

    return p.polygon(points).attr(attrs);
  };

  this.getQueryPath = function(element) {
    var cx = element.x + element.width / 2,
        cy = element.y + element.height / 2,
        radius = element.width / 2;

    var queryPath = [
      ['M', cx, cy],
      ['m', 0, -radius],
      ['a', radius, radius, 0, 1, 1, 0, 2 * radius],
      ['a', radius, radius, 0, 1, 1, 0, -2 * radius],
      ['z']
    ];

    return componentsToPath(queryPath);
  };

}

inherits(CustomRenderer, BaseRenderer);

module.exports = CustomRenderer;

CustomRenderer.$inject = [ 'eventBus', 'styles' ];


CustomRenderer.prototype.canRender = function(element) {
  return /^custom\:/.test(element.type);
};

CustomRenderer.prototype.drawShape = function(visuals, element) {
  var type = element.type;
  var h = this.handlers[type];

  /* jshint -W040 */
  return h(visuals, element);
};

CustomRenderer.prototype.drawConnection = function(visuals, element) {
  var type = element.type;
  var h = this.handlers[type];

  /* jshint -W040 */
  return h(visuals, element);
};

CustomRenderer.prototype.getShapePath = function(element) {
  var type = element.type.replace(/^custom\:/, '');

  var shapes = {
    query: this.getQueryPath
  };

  return shapes[type](element);
};
