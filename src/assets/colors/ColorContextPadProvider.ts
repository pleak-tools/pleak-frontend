// MODIFIED VERSION OF  bpmn-js-color-picker v0.4.0 (https://github.com/bpmn-io/bpmn-js-color-picker) MODULE
// SEE THE LICENSE FILE FOR MORE LICENSE INFORMATION
export default class ColorContextPadProvider {

    private contextPad;
    private popupMenu;
    private canvas;
    private translate;

    static $inject = ["contextPad", "popupMenu", "canvas", "translate"];

    constructor(contextPad, popupMenu, canvas, translate) {
        this.contextPad = contextPad;
        this.popupMenu = popupMenu;
        this.canvas = canvas;
        this.translate = translate;

        this.contextPad.registerProvider(this);
    }

    getContextPadEntries(element) {
        let self = this;
        let actions = {
            'set-color': {
                group: 'edit',
                className: 'fa fa-tint bpmn-item-color',
                title: self.translate('Set Color'),
                action: {
                    click: function (event) {
                        // get start popup draw start position
                        var position = {
                            ...self.getStartPosition(self.canvas, self.contextPad, element),
                            cursor: {
                                x: event.x,
                                y: event.y
                            }
                        };
                        // open new color-picker popup
                        self.popupMenu.open(element, 'color-picker', position);
                    }
                }
            }
        };

        return actions;
    };

    getStartPosition(canvas, contextPad, element) {
        const Y_OFFSET = 5;

        let diagramContainer = canvas.getContainer();
        let pad = contextPad.getPad(element).html;

        let diagramRect = diagramContainer.getBoundingClientRect();
        let padRect = pad.getBoundingClientRect();

        let top = padRect.top - diagramRect.top;
        let left = padRect.left - diagramRect.left;

        return {
            x: left,
            y: top + padRect.height + Y_OFFSET
        };
    }
}
