type Locale = 'en' | 'de' | 'es' | 'fr'

const messages = {
  en: {
    privateDefault: 'Private by default.', about: 'Privacy, terms & about',
    homeEyebrow: 'One kind moment can start another.', homeTitle: 'It starts with someone who showed up.',
    homeLead: 'Turn something you appreciate into a private story they can keep—or continue with a fresh act of their own.',
    thinkTitle: 'Think of one person.', thinkBody: 'Write the thing you appreciate but do not always say.',
    linkTitle: 'Send one private link.', linkBody: 'Words are enough. Add NIM if you want—no wallet address needed.',
    chooseTitle: 'They choose what follows.', chooseBody: 'Keep what they received, or start fresh kindness for someone else.',
    start: 'Start with someone', recent: 'Reopen a recent private link',
    keep: 'Keep this kindness', fresh: 'Start a fresh act of kindness',
    freshNote: 'The NIM you received is yours. Anything you add next is a separate, new gift.',
    verifiedGift: 'Gift verified on Nimiq', verifiedClaim: 'Claim verified on Nimiq',
  },
  de: {
    privateDefault: 'Standardmäßig privat.', about: 'Datenschutz, Bedingungen & Info',
    homeEyebrow: 'Ein freundlicher Moment kann den nächsten auslösen.', homeTitle: 'Es beginnt mit jemandem, der für dich da war.',
    homeLead: 'Mach aus deiner Wertschätzung eine private Geschichte, die man behalten oder mit einer neuen Geste fortsetzen kann.',
    thinkTitle: 'Denk an eine Person.', thinkBody: 'Schreib, was du schätzt, aber nicht immer aussprichst.',
    linkTitle: 'Sende einen privaten Link.', linkBody: 'Worte genügen. Füge auf Wunsch NIM hinzu – ohne Wallet-Adresse.',
    chooseTitle: 'Die Person entscheidet.', chooseBody: 'Sie behält das Erhaltene oder beginnt eine neue Geste für jemand anderen.',
    start: 'Denk an jemanden', recent: 'Letzten privaten Link öffnen',
    keep: 'Diese Freundlichkeit behalten', fresh: 'Eine neue freundliche Geste beginnen',
    freshNote: 'Die erhaltenen NIM gehören dir. Alles, was du als Nächstes hinzufügst, ist ein separates, neues Geschenk.',
    verifiedGift: 'Geschenk auf Nimiq verifiziert', verifiedClaim: 'Einlösung auf Nimiq verifiziert',
  },
  es: {
    privateDefault: 'Privado por defecto.', about: 'Privacidad, términos e información',
    homeEyebrow: 'Un momento amable puede iniciar otro.', homeTitle: 'Empieza con alguien que estuvo ahí.',
    homeLead: 'Convierte tu agradecimiento en una historia privada que pueden guardar o continuar con un gesto nuevo.',
    thinkTitle: 'Piensa en una persona.', thinkBody: 'Escribe eso que agradeces pero no siempre dices.',
    linkTitle: 'Envía un enlace privado.', linkBody: 'Las palabras bastan. Añade NIM si quieres, sin pedir su dirección.',
    chooseTitle: 'La otra persona elige.', chooseBody: 'Puede guardar lo recibido o iniciar un gesto nuevo para otra persona.',
    start: 'Empieza con alguien', recent: 'Abrir un enlace privado reciente',
    keep: 'Guardar este gesto', fresh: 'Iniciar un gesto de bondad nuevo',
    freshNote: 'Los NIM que recibiste son tuyos. Lo que añadas después será un regalo nuevo e independiente.',
    verifiedGift: 'Regalo verificado en Nimiq', verifiedClaim: 'Cobro verificado en Nimiq',
  },
  fr: {
    privateDefault: 'Privé par défaut.', about: 'Confidentialité, conditions et à propos',
    homeEyebrow: 'Un geste attentionné peut en inspirer un autre.', homeTitle: 'Tout commence avec quelqu’un qui était là.',
    homeLead: 'Transformez votre gratitude en histoire privée à garder ou à poursuivre avec un nouveau geste.',
    thinkTitle: 'Pensez à une personne.', thinkBody: 'Écrivez ce que vous appréciez sans toujours le dire.',
    linkTitle: 'Envoyez un lien privé.', linkBody: 'Les mots suffisent. Ajoutez des NIM si vous voulez, sans adresse de portefeuille.',
    chooseTitle: 'La personne choisit la suite.', chooseBody: 'Elle garde ce qu’elle reçoit ou crée un nouveau geste pour quelqu’un d’autre.',
    start: 'Pensez à quelqu’un', recent: 'Rouvrir un lien privé récent',
    keep: 'Garder cette attention', fresh: 'Créer un nouveau geste attentionné',
    freshNote: 'Les NIM reçus sont à vous. Tout ajout suivant est un nouveau cadeau distinct.',
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
