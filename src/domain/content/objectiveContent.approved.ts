import approved from '../../../content/approved/approved.json';
import type {Exercise} from './types';
// Future approved-only source. Current manifest/release gates forbid activation.
export const objectiveItems:Exercise[]=[...(approved as Exercise[])];
