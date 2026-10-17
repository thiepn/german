import type {Mode} from './types';
export const modes:Record<Mode,{label:string;skillId:string;domain:string;description:string}> = {
 M01:{label:'Artikelblitz',skillId:'G01.GENUS',domain:'G01',description:'Genus und Artikel im Kontext'},
 M02:{label:'Kasus-Kette',skillId:'G02.ADJEKTIVFLEXION',domain:'G02',description:'Kasus, Artikel und Deklination'},
 M03:{label:'Präpositionsjagd',skillId:'G03.VALENZ',domain:'G03',description:'Rektion und Kasus als Einheit'},
 M04:{label:'Satzlabor',skillId:'G04.SYNTAX',domain:'G04',description:'Konjunktiv, Satzverknüpfung und Syntax'},
 M05:{label:'Kollokationsduell',skillId:'G07.KOLLOKATION',domain:'G07',description:'Idiomatische Wortverbindungen in Kontexten'}
};
export const availableModes=Object.keys(modes) as Mode[];
