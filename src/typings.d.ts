/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

declare module 'bpmn-js/lib/Modeler' {
  export default class Modeler {
    constructor(options: any)
  }
}
