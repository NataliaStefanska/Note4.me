const TODAY = new Date();
export const daysAgo = (d) => new Date(TODAY - d * 86400000).toISOString().split("T")[0];
export function daysSince(d) { return Math.floor((TODAY - new Date(d)) / 86400000); }
export { TODAY };

export const INITIAL_SPACES = [
  { id: "s1", name: "Praca A",   emoji: "\u{1F4BC}", color: "#6366F1" },
  { id: "s2", name: "Praca B",   emoji: "\u{1F3D7}\uFE0F", color: "#0EA5E9" },
  { id: "s3", name: "Osobiste",  emoji: "\u{1F33F}", color: "#10B981" },
];

export const INITIAL_NOTES = {
  s1: [
    { id:"n1", title:"Pomys\u0142y na projekt", tags:["produkt"],
      content:"Research konkurencji \u2014 co robi\u0105 inaczej, czego im brakuje.\n\nRozmowa z Ani\u0105 ujawni\u0142a problem z onboardingiem.",
      tasks:[{id:"t1",text:"Draft onboardingu",done:false},{id:"t2",text:"Spotkanie z teamem",done:true}],
      intent:"Referencja przed pi\u0105tkowym meetingiem", linkedNotes:[], lastOpened:daysAgo(1), updatedAt:daysAgo(1) },
    { id:"n2", title:"Notatki ze spotkania 17.02", tags:["spotkania"],
      content:"MVP do ko\u0144ca marca. Klient chce prostszy interfejs.\n\nNie dok\u0142ada\u0107 funkcji \u2014 dopracowa\u0107 to co jest.",
      tasks:[{id:"t3",text:"Wys\u0142a\u0107 podsumowanie emailem",done:false}],
      intent:"\u015Alad decyzji na przysz\u0142o\u015B\u0107", linkedNotes:[], lastOpened:daysAgo(4), updatedAt:daysAgo(4) },
  ],
  s2: [
    { id:"n3", title:"Q1 roadmap", tags:["strategia"],
      content:"Cele na Q1:\n- Wdro\u017Cenie nowego CRM\n- Migracja danych\n- Szkolenie zespo\u0142u",
      tasks:[{id:"t4",text:"Prezentacja dla zarz\u0105du",done:false}],
      intent:"Plan na pierwsze p\u00F3\u0142rocze", linkedNotes:[], lastOpened:daysAgo(2), updatedAt:daysAgo(2) },
  ],
  s3: [
    { id:"n4", title:"Ksi\u0105\u017Cki 2025", tags:["rozw\u00F3j"],
      content:"Atomic Habits \u2014 przeczytana \u2713\nDune \u2014 w trakcie, s. 180",
      tasks:[{id:"t5",text:"Sko\u0144czy\u0107 Dune",done:false}],
      intent:"Wracam co miesi\u0105c \u017Ceby zaznaczy\u0107 post\u0119p", linkedNotes:[], lastOpened:daysAgo(35), updatedAt:daysAgo(35) },
  ],
};

export const EMOJI_OPTIONS = ["\u{1F4BC}","\u{1F3D7}\uFE0F","\u{1F33F}","\u{1F3A8}","\u{1F4DA}","\u{1F52C}","\u{1F4A1}","\u{1F3E0}","\u2708\uFE0F","\u{1F3AF}","\u{1F6E0}\uFE0F","\u{1F30D}"];
export const COLOR_OPTIONS = ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6"];
export const SUGGESTED_TAGS = ["produkt","spotkania","strategia","rozw\u00F3j","osobiste","pomys\u0142y","research","decyzje"];
export const HUB_COLORS = ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316","#84CC16"];
