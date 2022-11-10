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
        }, {
            label: 'Cyber Red',
            fill: '#fe5d5d',
            stroke: '#fe5d5d'
        }, {
            label: 'Cyber Black',
            fill: '#202020',
            stroke: '#202020'
        }, {
            label: 'Cyber Dark Gray',
            fill: '#989898',
            stroke: '#989898'
        }, {
            label: 'Cyber Light Gray',
            fill: '#dfdfdf',
            stroke: '#dfdfdf'
        }, {
            label: 'Cyber Lightest Gray',
            fill: '#f2f2f2',
            stroke: '#f2f2f2'
        }, {
            label: 'Cyber Green',
            fill: '#b7f6c1',
            stroke: '#b7f6c1'
        }];

        let entries = colors.map(function (color) {
            if (!self.isConnection(element)) {
                color.stroke = "#000000";
            }
            let lowerCaseLabel = color.label.toLowerCase().replace(/ /g, "-");
            return {
                title: self.translate(color.label),
                id: lowerCaseLabel + '-color',
                className: 'color-icon-' + lowerCaseLabel,
                action: self.createAction(self.modeling, element, color)
            };
        });

        return entries;
    };

    isConnection(element) {
        return element.type === 'bpmn:DataInputAssociation' 
        || element.type === 'bpmn:DataOutputAssociation' 
        || element.type === 'bpmn:SequenceFlow'
        || element.type === 'label' 
        || element.type === 'bpmn:MessageFlow' 
        || element.type === 'bpmn:Association';
    }

    createAction(modeling, element, color) {
        return function () {
            modeling.setColor(element, color);
        };
    }
}