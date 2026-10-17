import original from '../../../content/fixtures/production.demo.json';
import continuation from '../../../content/fixtures/production-continuation.demo.json';
import type {ProductionPrompt} from './types';
export const productionPrompts=[...original,...continuation] as ProductionPrompt[];
