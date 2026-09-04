type Locale = 'en' | 'de' | 'es' | 'fr'

const messages = {
  en: {
    privateDefault: 'Private by default.', about: 'Privacy, terms & about',
    homeEyebrow: 'One kind moment can start another.', homeTitle: 'It starts with someone who showed up.',
    homeLead: 'Turn something you appreciate into a private story they can keep—or continue by passing the same gift with a new note.',
    homeAudience: 'For thanking a friend, colleague, carer or quiet supporter—without asking for their wallet address.',
    thinkTitle: 'Think of one person.', thinkBody: 'Write the thing you appreciate but do not always say.',
    linkTitle: 'Send one private link.', linkBody: 'Words are enough. Add NIM if you want—no wallet address needed.',
    chooseTitle: 'They choose what follows.', chooseBody: 'Keep the kindness, claim an attached gift, or pass that same gift onward with a new note.',
    start: 'Start with someone', recent: 'Watch your kindness trails',
    founderTitle: 'The first kindness chains are funded.', founderWaiting: 'prepaid 5,000 NIM gifts are waiting.',
    founderCta: 'Accept some kindness', founderNote: 'No purchase, deposit or wallet address. One per Nimiq Pay device while available; NIM value can change.',
    keep: 'Keep this kindness', fresh: 'Start a fresh act of kindness',
    freshNote: 'After claiming a gift, anything you add next is a separate, new gift.',
    verifiedGift: 'Gift verified on Nimiq', verifiedClaim: 'Claim verified on Nimiq',
  },
  de: {
    privateDefault: 'Standardmäßig privat.', about: 'Datenschutz, Bedingungen & Info',
    homeEyebrow: 'Ein freundlicher Moment kann den nächsten auslösen.', homeTitle: 'Es beginnt mit jemandem, der für dich da war.',
    homeLead: 'Mach aus deiner Wertschätzung eine private Geschichte, die man behalten oder mit demselben Geschenk und einer neuen Nachricht fortsetzen kann.',
    homeAudience: 'Für ein Dankeschön an Freunde, Kollegen, Helfer oder stille Unterstützer – ohne nach ihrer Wallet-Adresse zu fragen.',
    thinkTitle: 'Denk an eine Person.', thinkBody: 'Schreib, was du schätzt, aber nicht immer aussprichst.',
    linkTitle: 'Sende einen privaten Link.', linkBody: 'Worte genügen. Füge auf Wunsch NIM hinzu – ohne Wallet-Adresse.',
    chooseTitle: 'Die Person entscheidet.', chooseBody: 'Sie behält die Geste, löst das Geschenk ein oder gibt dasselbe Geschenk mit einer neuen Nachricht weiter.',
    start: 'Denk an jemanden', recent: 'Deine Freundlichkeitswege ansehen',
    founderTitle: 'Die ersten Freundlichkeitsketten sind finanziert.', founderWaiting: 'vorfinanzierte Geschenke mit je 5.000 NIM warten.',
    founderCta: 'Freundlichkeit annehmen', founderNote: 'Kein Kauf, keine Einzahlung und keine Wallet-Adresse. Eines pro Nimiq-Pay-Gerät, solange verfügbar; der NIM-Wert kann schwanken.',
    keep: 'Diese Freundlichkeit behalten', fresh: 'Eine neue freundliche Geste beginnen',
    freshNote: 'Nach dem Einlösen ist alles, was du als Nächstes hinzufügst, ein separates, neues Geschenk.',
    verifiedGift: 'Geschenk auf Nimiq verifiziert', verifiedClaim: 'Einlösung auf Nimiq verifiziert',
  },
  es: {
    privateDefault: 'Privado por defecto.', about: 'Privacidad, términos e información',
    homeEyebrow: 'Un momento amable puede iniciar otro.', homeTitle: 'Empieza con alguien que estuvo ahí.',
    homeLead: 'Convierte tu agradecimiento en una historia privada que pueden guardar o continuar pasando el mismo regalo con un mensaje nuevo.',
    homeAudience: 'Para agradecer a una amistad, colega, cuidador o apoyo silencioso, sin pedir su dirección de cartera.',
    thinkTitle: 'Piensa en una persona.', thinkBody: 'Escribe eso que agradeces pero no siempre dices.',
    linkTitle: 'Envía un enlace privado.', linkBody: 'Las palabras bastan. Añade NIM si quieres, sin pedir su dirección.',
    chooseTitle: 'La otra persona elige.', chooseBody: 'Puede guardar el gesto, cobrar el regalo o pasar ese mismo regalo con un mensaje nuevo.',
    start: 'Empieza con alguien', recent: 'Ver tus cadenas de bondad',
    founderTitle: 'Las primeras cadenas ya están financiadas.', founderWaiting: 'regalos prepagados de 5.000 NIM están esperando.',
    founderCta: 'Aceptar un gesto', founderNote: 'Sin compra, depósito ni dirección de cartera. Uno por dispositivo Nimiq Pay mientras haya disponibilidad; el valor de NIM puede cambiar.',
    keep: 'Guardar este gesto', fresh: 'Iniciar un gesto de bondad nuevo',
    freshNote: 'Después de cobrarlo, lo que añadas será un regalo nuevo e independiente.',
    verifiedGift: 'Regalo verificado en Nimiq', verifiedClaim: 'Cobro verificado en Nimiq',
  },
  fr: {
    privateDefault: 'Privé par défaut.', about: 'Confidentialité, conditions et à propos',
    homeEyebrow: 'Un geste attentionné peut en inspirer un autre.', homeTitle: 'Tout commence avec quelqu’un qui était là.',
    homeLead: 'Transformez votre gratitude en histoire privée à garder ou à poursuivre en transmettant le même cadeau avec un nouveau message.',
    homeAudience: 'Pour remercier un proche, un collègue, un aidant ou un soutien discret, sans demander son adresse de portefeuille.',
    thinkTitle: 'Pensez à une personne.', thinkBody: 'Écrivez ce que vous appréciez sans toujours le dire.',
    linkTitle: 'Envoyez un lien privé.', linkBody: 'Les mots suffisent. Ajoutez des NIM si vous voulez, sans adresse de portefeuille.',
    chooseTitle: 'La personne choisit la suite.', chooseBody: 'Elle garde l’attention, réclame le cadeau ou transmet ce même cadeau avec un nouveau message.',
    start: 'Pensez à quelqu’un', recent: 'Voir vos parcours de gentillesse',
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
