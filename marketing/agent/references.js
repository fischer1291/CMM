// Only the reference images for the hero characters (Actions → Marketing-Agent
// → mode "figuren"): proposes images where none is chosen yet or where new
// ones were asked for in the console. The daily run does the same on the side.
const { backend, spent, BudgetExceeded } = require('./common');
const { ensureReferences } = require('./characters');

async function main() {
  const { characters } = await backend('GET', '/marketing/characters');
  const after = await ensureReferences(characters);
  for (const c of after) console.log(`${c.name}: ${c.chosen ? 'Referenzbild gewählt' : `${c.candidates.length} Vorschläge, noch keins gewählt`}`);
  console.log(`Kosten: ${spent().toFixed(2)} €`);
}

main().catch((err) => {
  if (err instanceof BudgetExceeded) {
    console.log(`::warning::${err.message}`);
    return;
  }
  console.error(err);
  process.exit(1);
});
