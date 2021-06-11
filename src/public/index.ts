import './index.scss';

import { AminerPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new AminerPlugin();
}
export { AminerPluginSetup, AminerPluginStart } from './types';
