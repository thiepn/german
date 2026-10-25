import type {ReactNode} from 'react';
export type Tab='Heute'|'Lernen'|'Trainieren'|'Fehler'|'Fortschritt';
const tabs:Tab[]=['Heute','Lernen','Trainieren','Fehler','Fortschritt'];
export function MobileShell({active,onSelect,children}:{active:Tab;onSelect:(tab:Tab)=>void;children:ReactNode}){
 const nav=(kind:string)=><nav className={kind} aria-label="Hauptnavigation">{tabs.map(tab=><button key={tab} type="button" onClick={()=>onSelect(tab)} className={active===tab?'active':''} aria-current={active===tab?'page':undefined}>{tab}</button>)}</nav>;
 return <><a href="#content" className="skip">Zum Inhalt springen</a><div className="app"><aside className="sidebar"><div><div className="brand">Sprachgefühl</div></div>{nav('nav')}</aside><main id="content" className="main">{children}</main></div>{nav('bottomnav')}</>;
}
