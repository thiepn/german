import core from '../../../content/fixtures/core.demo.json';
import syntax from '../../../content/fixtures/syntax-collocations.demo.json';
import contrasts from '../../../content/fixtures/collocation-contrasts.demo.json';
import anchored from '../../../content/fixtures/nuance-grounded.demo.json';
import precision from '../../../content/fixtures/advanced-precision.demo.json';
import semantic from '../../../content/fixtures/semantic-register.demo.json';
import type {Exercise} from './types';
// Historical development-only content. Never include this module in approved-only bundles.
export const objectiveItems:Exercise[]=[...(core as Exercise[]),...(syntax as Exercise[]),...(contrasts as Exercise[]),
 ...(anchored as Exercise[]),...(precision as Exercise[]),...(semantic as Exercise[])];
