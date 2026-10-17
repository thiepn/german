import demo from '../../../content/fixtures/core.demo.json';
import type {Exercise,Mode} from './types';
import newDemo from '../../../content/fixtures/syntax-collocations.demo.json';
import contrastDemo from '../../../content/fixtures/collocation-contrasts.demo.json';
import anchoredDemo from '../../../content/fixtures/nuance-grounded.demo.json';
import precisionDemo from '../../../content/fixtures/advanced-precision.demo.json';
import {modes} from './modes';
export const allItems:Exercise[]=[...(demo as unknown as Exercise[]),...(newDemo as unknown as Exercise[]),...(contrastDemo as unknown as Exercise[]),...(anchoredDemo as unknown as Exercise[]),...(precisionDemo as unknown as Exercise[])];
export const itemById=new Map(allItems.map(x=>[x.id,x]));
export function itemsForMode(mode:Mode):Exercise[]{return allItems.filter(x=>x.mode===mode&&x.status!=='WITHDRAWN');}
export const availableDomains=new Set(Object.values(modes).map(m=>m.domain));

export const domains=[['G01','Artikel und Genus'],['G02','Kasus und Flexion'],['G03','Rektion und Präpositionen'],['G04','Syntax und Informationsstruktur'],['G05','Modus, Tempus und Diathese'],['G06','Wortschatz und Semantik'],['G07','Kollokationen und Phraseologie'],['G08','Stil, Register und Pragmatik'],['G09','Lesen und Textkompetenz'],['G10','Hören und Hörpragmatik'],['G11','Schreiben und Überarbeiten'],['G12','Sprechen und Interaktion'],['G13','Mediation und Transfer']] as const;
