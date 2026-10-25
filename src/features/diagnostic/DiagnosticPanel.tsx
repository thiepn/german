import PilotDiagnostic from './PilotDiagnostic';
import {DIAGNOSTIC_A_BLUEPRINT,DIAGNOSTIC_A_TOTAL,validateDiagnosticA} from '../../domain/diagnostic/engine';
import {diagnosticAItems} from '../../domain/diagnostic/items';
export default function DiagnosticPanel({onExit}:{onExit:()=>void}){
 const gate=validateDiagnosticA(diagnosticAItems);
 return <section><h1 className="page-title">Diagnostik A</h1><p className="lead">Die Einstufung ist gesperrt, bis Originalaufgaben und Hörmaterial geprüft und offene Antworten fachkundig bewertet werden können.</p><PilotDiagnostic/><div className="panel"><h2>{gate.ready?'Form bereit':'Noch nicht verfügbar'}</h2><p><strong>{diagnosticAItems.length} von {DIAGNOSTIC_A_TOTAL}</strong> geprüften Aufgaben vorhanden.</p><div className="grid">{DIAGNOSTIC_A_BLUEPRINT.map(([id,n])=><div className="listitem" key={id}><strong>{id}</strong><div className="muted">{n} benötigte Aufgaben</div></div>)}</div></div><div className="buttonrow"><button className="button outline" onClick={onExit}>Zurück zum Lernen</button></div></section>;
}
