import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface AminerCtiPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AminerCtiPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
