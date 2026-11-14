import type {Exercise} from './types';

/** Demonstrable mismatches between v1 DEMO_ONLY topic metadata and the
 * prompt's actual grammatical or collocational task. This is a conservative
 * warning for linked evidence, not an editorial approval of remaining topics.
 * Original sources, versions, rights and learner responses remain untouched.
 */
const mismatches:Readonly<Record<string,string>>=Object.freeze({
 'SG-M04-006':'Irrealer Konditionalsatz, nicht indirekte Rede',
 'SG-M04-012':'Nominalisierung, nicht Irrealität',
 'SG-M04-013':'Attributives Partizip I, nicht Nominalisierung',
 'SG-M04-018':'Attributives Partizip II, nicht Nominalisierung',
 'SG-M04-024':'Konzessiver obwohl-Satz, nicht Partizipialattribut',
 'SG-M04-029':'Temporale kaum-hatte-Folge, keine konzessive Verbindung',
 'SG-M05-001':'Funktionsverbverbindung Beschluss fassen, keine indirekte Rede',
 'SG-M05-002':'Wortverbindung Entscheidung überdenken, keine indirekte Rede',
 'SG-M05-003':'Wortverbindung Rückschlüsse ziehen, keine indirekte Rede',
 'SG-M05-004':'Wortverbindung Stellung beziehen, keine indirekte Rede',
 'SG-M05-005':'Wortverbindung Einspruch einlegen, keine indirekte Rede',
 'SG-M05-006':'Wortverbindung Zweifel ausräumen, keine indirekte Rede'
});
/** The task itself is still available for source-valid individual practice. */
export function topicMismatchReason(item:Exercise):string|null{return mismatches[item.id]??null;}
/** True only means no specifically reproduced mismatch, NOT human approval. */
export function eligibleForTopicLink(item:Exercise):boolean{
 return item.status!=='WITHDRAWN'&&topicMismatchReason(item)===null;
}
