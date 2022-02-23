import './index.scss';

import { AminerCtiPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new AminerCtiPlugin();
}
export { AminerCtiPluginSetup, AminerCtiPluginStart } from './types';
