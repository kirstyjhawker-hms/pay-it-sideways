type Locale = 'en' | 'de' | 'es' | 'fr'

const messages = {
  en: {
    privateDefault: 'Private by default.', about: 'Privacy, terms & about',
    homeEyebrow: 'A private note for one person.', homeTitle: 'Tell someone what they mean to you.',
    homeLead: 'Write a personal message for one specific person, then send them the unique private link. Only someone with the complete link can read it.',
    homeAudience: 'Your words are the gift. If you want, add a little NIM too—without asking for their wallet address.',
    visualNote: 'You made a hard day feel lighter.', visualNoteFrom: 'Written personally. Shared privately.',
    thinkTitle: 'Think of one person.', thinkBody: 'Write the thing you appreciate but do not always say.',
    linkTitle: 'Send it only to them.', linkBody: 'The unique, unguessable link carries their personal note privately.',
    chooseTitle: 'They choose what follows.', chooseBody: 'Keep the note. If NIM is attached, claim it or pass that same gift onward with a new note.',
    start: 'Write their note', recent: 'Watch your kindness trails',
    founderTitle: 'The first kindness chains are funded.', founderWaiting: 'prepaid 5,000 NIM gifts are waiting.',
    founderCta: 'Accept some kindness', founderNote: 'No purchase, deposit or wallet address. One per Nimiq Pay device while available; NIM value can change.',
    keep: 'Keep this kindness', fresh: 'Start a fresh act of kindness',
    freshNote: 'After claiming a gift, anything you add next is a separate, new gift.',
    verifiedGift: 'Gift verified on Nimiq', verifiedClaim: 'Claim verified on Nimiq',
  },
  de: {
    privateDefault: 'Standardmäßig privat.', about: 'Datenschutz, Bedingungen & Info',
    homeEyebrow: 'Eine private Nachricht für eine Person.', homeTitle: 'Sag jemandem, was er dir bedeutet.',
    homeLead: 'Schreib eine persönliche Nachricht für eine bestimmte Person und sende ihr den einzigartigen privaten Link. Nur wer den vollständigen Link hat, kann sie lesen.',
    homeAudience: 'Deine Worte sind das Geschenk. Auf Wunsch kannst du auch etwas NIM hinzufügen – ohne nach einer Wallet-Adresse zu fragen.',
    visualNote: 'Du hast einen schweren Tag leichter gemacht.', visualNoteFrom: 'Persönlich geschrieben. Privat geteilt.',
    thinkTitle: 'Denk an eine Person.', thinkBody: 'Schreib, was du schätzt, aber nicht immer aussprichst.',
    linkTitle: 'Sende ihn nur an diese Person.', linkBody: 'Der einzigartige, nicht erratbare Link übermittelt ihre persönliche Nachricht privat.',
    chooseTitle: 'Die Person entscheidet.', chooseBody: 'Sie behält die Nachricht. Falls NIM beigefügt ist, löst sie es ein oder gibt dasselbe Geschenk mit einer neuen Nachricht weiter.',
    start: 'Schreib die Nachricht', recent: 'Deine Freundlichkeitswege ansehen',
    founderTitle: 'Die ersten Freundlichkeitsketten sind finanziert.', founderWaiting: 'vorfinanzierte Geschenke mit je 5.000 NIM warten.',
    founderCta: 'Freundlichkeit annehmen', founderNote: 'Kein Kauf, keine Einzahlung und keine Wallet-Adresse. Eines pro Nimiq-Pay-Gerät, solange verfügbar; der NIM-Wert kann schwanken.',
    keep: 'Diese Freundlichkeit behalten', fresh: 'Eine neue freundliche Geste beginnen',
    freshNote: 'Nach dem Einlösen ist alles, was du als Nächstes hinzufügst, ein separates, neues Geschenk.',
    verifiedGift: 'Geschenk auf Nimiq verifiziert', verifiedClaim: 'Einlösung auf Nimiq verifiziert',
  },
  es: {
    privateDefault: 'Privado por defecto.', about: 'Privacidad, términos e información',
    homeEyebrow: 'Una nota privada para una persona.', homeTitle: 'Dile a alguien lo que significa para ti.',
    homeLead: 'Escribe un mensaje personal para una persona concreta y envíale el enlace privado único. Solo quien tenga el enlace completo podrá leerlo.',
    homeAudience: 'Tus palabras son el regalo. Si quieres, añade también un poco de NIM, sin pedir su dirección de cartera.',
    visualNote: 'Hiciste que un día difícil fuera más llevadero.', visualNoteFrom: 'Escrito personalmente. Compartido en privado.',
    thinkTitle: 'Piensa en una persona.', thinkBody: 'Escribe eso que agradeces pero no siempre dices.',
    linkTitle: 'Envíalo solo a esa persona.', linkBody: 'El enlace único e imposible de adivinar lleva su mensaje personal de forma privada.',
    chooseTitle: 'La otra persona elige.', chooseBody: 'Puede guardar la nota. Si incluye NIM, puede cobrarlo o pasar ese mismo regalo con un mensaje nuevo.',
    start: 'Escribe su nota', recent: 'Ver tus cadenas de bondad',
    founderTitle: 'Las primeras cadenas ya están financiadas.', founderWaiting: 'regalos prepagados de 5.000 NIM están esperando.',
    founderCta: 'Aceptar un gesto', founderNote: 'Sin compra, depósito ni dirección de cartera. Uno por dispositivo Nimiq Pay mientras haya disponibilidad; el valor de NIM puede cambiar.',
    keep: 'Guardar este gesto', fresh: 'Iniciar un gesto de bondad nuevo',
    freshNote: 'Después de cobrarlo, lo que añadas será un regalo nuevo e independiente.',
    verifiedGift: 'Regalo verificado en Nimiq', verifiedClaim: 'Cobro verificado en Nimiq',
  },
  fr: {
    privateDefault: 'Privé par défaut.', about: 'Confidentialité, conditions et à propos',
    homeEyebrow: 'Un mot privé pour une personne.', homeTitle: 'Dites à quelqu’un ce qu’il représente pour vous.',
    homeLead: 'Écrivez un message personnel pour une personne précise, puis envoyez-lui le lien privé unique. Seule une personne possédant le lien complet peut le lire.',
    homeAudience: 'Vos mots sont le cadeau. Si vous le souhaitez, ajoutez un peu de NIM, sans demander son adresse de portefeuille.',
    visualNote: 'Tu as rendu une journée difficile plus douce.', visualNoteFrom: 'Écrit personnellement. Partagé en privé.',
    thinkTitle: 'Pensez à une personne.', thinkBody: 'Écrivez ce que vous appréciez sans toujours le dire.',
    linkTitle: 'Envoyez-le uniquement à cette personne.', linkBody: 'Le lien unique et impossible à deviner transmet son message personnel en privé.',
    chooseTitle: 'La personne choisit la suite.', chooseBody: 'Elle garde le mot. Si des NIM sont joints, elle peut les réclamer ou transmettre ce même cadeau avec un nouveau message.',
    start: 'Écrivez son mot', recent: 'Voir vos parcours de gentillesse',
    founderTitle: 'Les premières chaînes sont financées.', founderWaiting: 'cadeaux prépayés de 5 000 NIM vous attendent.',
    founderCta: 'Accepter ce geste', founderNote: 'Sans achat, dépôt ni adresse de portefeuille. Un par appareil Nimiq Pay dans la limite des disponibilités ; la valeur du NIM peut varier.',
    keep: 'Garder cette attention', fresh: 'Créer un nouveau geste attentionné',
    freshNote: 'Après réclamation, tout ajout suivant est un nouveau cadeau distinct.',
    verifiedGift: 'Cadeau vérifié sur Nimiq', verifiedClaim: 'Réclamation vérifiée sur Nimiq',
  },
} as const

type MessageKey = keyof typeof messages.en

function resolveLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const requested = window.nimiqPay?.language || navigator.language || 'en'
  const language = requested.toLowerCase().split('-')[0]
  return language === 'de' || language === 'es' || language === 'fr' ? language : 'en'
}

export const locale = resolveLocale()
export function t(key: MessageKey): string { return messages[locale][key] }

if (typeof document !== 'undefined') document.documentElement.lang = locale
