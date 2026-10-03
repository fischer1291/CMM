// The owner's hints from the Monday review (plan 2.11): AppConfig.marketingNotes,
// sent by GET /marketing/context as `notes`. Kept apart from prompt.js so the
// section can be tested without the agent's own dependencies.

const MAX_NOTES = 1000;

/** The prompt section for the owner's notes, or '' when there are none. */
function notesSection(notes) {
  const text = typeof notes === 'string' ? notes.trim().slice(0, MAX_NOTES) : '';
  if (!text) return '';
  return `# Hinweise des Owners für diese Woche
Aus der Wochenreview am Montag (Hook-Thema, Kanal, was ausprobiert werden soll). Sie haben Vorrang vor deinen eigenen Themenideen: Wähl Hook und Thema heute danach. Die Regeln oben (keine erfundenen Zahlen, nur echte Funktionen, kein Druck) gelten trotzdem.

${text}

`;
}

module.exports = { notesSection, MAX_NOTES };
