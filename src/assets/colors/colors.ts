import ColorContextPadProvider from './ColorContextPadProvider';
import ColorPopupProvider from './ColorPopupProvider';


// MODIFIED VERSION OF  bpmn-js-color-picker v0.4.0 (https://github.com/bpmn-io/bpmn-js-color-picker) MODULE
// SEE THE LICENSE FILE FOR MORE LICENSE INFORMATION
export default {
  __init__: [
    'colorContextPadProvider',
    'colorPopupProvider'
  ],
  colorContextPadProvider: [ 'type', ColorContextPadProvider ],
  colorPopupProvider: [ 'type', ColorPopupProvider ]
};