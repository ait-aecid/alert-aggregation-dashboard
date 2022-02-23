import { PluginInitializerContext } from '../../../src/core/server';
import { AminerPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new AminerPlugin(initializerContext);
}

export { AminerPluginSetup, AminerPluginStart } from './types';
