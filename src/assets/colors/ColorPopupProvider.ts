// MODIFIED VERSION OF  bpmn-js-color-picker v0.4.0 (https://github.com/bpmn-io/bpmn-js-color-picker) MODULE
// SEE THE LICENSE FILE FOR MORE LICENSE INFORMATION
export default class ColorPopupProvider {

    private popupMenu;
    private modeling;
    private translate;

    static $inject = ["popupMenu", "modeling", "translate"];

    constructor(popupMenu, modeling, translate) {
        this.popupMenu = popupMenu;
        this.modeling = modeling;
        this.translate = translate;

        this.popupMenu.registerProvider('color-picker', this);
    }

    getEntries(element) {
        let self = this;

        let colors = [{
            label: 'Default',
            fill: undefined,
            stroke: undefined
        }, {
            label: 'Blue',
            fill: '#BBDEFB',
            stroke: '#0073d7'
        }, {
            label: 'Orange',
            fill: '#ffe6c0',
            stroke: '#e67e00'
        }, {
            label: 'Green',
            fill: '#C8E6C9',
            stroke: '#009608'
        }, {
            label: 'Red',
            fill: '#FFCDD2',
            stroke: '#dd0400'
        }, {
            label: 'Purple',
            fill: '#E1BEE7',
            stroke: '#8400a8'
        }, {
            label: 'Fuchsia',
            fill: '#ffd1ff',
            stroke: '#FF00FF'
        }, {
            label: 'Gray',
            fill: '#bdbdbd',
            stroke: '#575555'
        }, {
            label: 'Lime',
            fill: '#acffac',
            stroke: '#00b100'
        }, {
            label: 'Maroon',
            fill: '#c0a7a7',
            stroke: '#800000'
        }, {
            label: 'Navy',
            fill: '#9595be',
            stroke: '#000080'
        }, {
            label: 'Olive',
            fill: '#e7e7ab',
            stroke: '#808000'
        }, {
            label: 'Silver',
            fill: '#e7e7e7',
            stroke: '#828282'
        }, {
            label: 'Teal',
            fill: '#9ddada',
            stroke: '#008080'
        }, {
            label: 'Yellow',
            fill: '#ffff71',
            stroke: '#a2a200'
        }, {
            label: 'Cyan',
            fill: '#ceffff',
            stroke: '#00bfbf'
        }];

        let entries = colors.map(function (color) {
            return {
                title: self.translate(color.label),
                id: color.label.toLowerCase() + '-color',
                className: 'color-icon-' + color.label.toLowerCase(),
                action: self.createAction(self.modeling, element, color)
            };
        });

        return entries;
    };

    createAction(modeling, element, color) {
        return function () {
            modeling.setColor(element, color);
        };
    }
}