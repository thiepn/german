import type {Exercise,Mode} from './types';
import {objectiveItems} from './objectiveContent.demo';
import {modes} from './modes';
// Vite APPROVED_ONLY builds must alias objectiveContent.demo to objectiveContent.approved
// and pass strict curriculum-wide rights/approval gates before this module is bundled.
export const allItems:Exercise[]=[...objectiveItems];
export const itemById=new Map(allItems.map(x=>[x.id,x]));
export function itemsForMode(mode:Mode):Exercise[]{return allItems.filter(x=>x.mode===mode&&x.status!=='WITHDRAWN');}
export const availableDomains=new Set(Object.values(modes).map(m=>m.domain));
export const domains=[['G01','Artikel und Genus'],['G02','Kasus und Flexion'],['G03','Rektion und Präpositionen'],['G04','Syntax und Informationsstruktur'],['G05','Modus, Tempus und Diathese'],['G06','Wortschatz und Semantik'],['G07','Kollokationen und Phraseologie'],['G08','Stil, Register und Pragmatik'],['G09','Lesen und Textkompetenz'],['G10','Hören und Hörpragmatik'],['G11','Schreiben und Überarbeiten'],['G12','Sprechen und Interaktion'],['G13','Mediation und Transfer']] as const;
