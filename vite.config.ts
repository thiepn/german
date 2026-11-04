import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import manifest from './content/manifest.json';
import approved from './content/approved/approved.json';
import ledger from './content/editorial/approval-ledger.json';
import {resolveContentChannel} from './scripts/content/channel';
import {auditSourceBoundary} from './scripts/content/releaseBoundary.mjs';
const channel=resolveContentChannel(process.env.SG_CONTENT_CHANNEL??'DEMO_ONLY',manifest,approved,ledger);
// Even with forged approvals, production cannot compile any direct DEMO source graph.
if(channel==='APPROVED_ONLY')auditSourceBoundary({channel});
export default defineConfig({
 plugins:[react()],base:'./',build:{target:'es2022'},
 resolve:{alias:channel==='APPROVED_ONLY'?[{
  find:/^\.\/objectiveContent\.demo$/,
  replacement:fileURLToPath(new URL('./src/domain/content/objectiveContent.approved.ts',import.meta.url))
 }]:[]}
});
