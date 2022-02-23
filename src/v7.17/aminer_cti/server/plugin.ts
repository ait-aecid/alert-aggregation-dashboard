import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { AminerCtiPluginSetup, AminerCtiPluginStart } from './types';
import { defineRoutes } from './routes';

export class AminerCtiPlugin implements Plugin<AminerCtiPluginSetup, AminerCtiPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('aminerCTI: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('aminerCTI: Started');
    return {};
  }

  public stop() {}
}
