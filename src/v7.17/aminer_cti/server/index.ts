import { PluginInitializerContext } from '../../../src/core/server';
import { AminerCtiPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new AminerCtiPlugin(initializerContext);
}

export { AminerCtiPluginSetup, AminerCtiPluginStart } from './types';
