/** Generate the Apps Script projection of the exact published Instrument Lab artifact. */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const [archive, output] = process.argv.slice(2);
if (!archive || !output) throw new Error('Usage: node tools/build-executive-research.mjs <published archive JSON> <Apps Script output>');
const original = await readFile(archive, 'utf8');
const input = JSON.parse(original);
if (input.version !== 'xagusd-descriptive-archive.2' || input.instrument !== 'XAGUSD' || input.mode !== 'historical_research' || input.currentEligible !== false)
  throw new Error('Not an accepted non-operating XAGUSD research artifact');
const sources = {};
for (const name of ['longM5', 'longCoreM5', 'histCoreM5']) {
  const part = input.sections[name];
  const project = (part) => Object.fromEntries(Object.entries(part).map(([regime, row]) => [regime, {
    holdoutPeriods: row.testN, recovered: row.pullback, healthy: row.healthyPullback, other: row.otherPullback,
    recoveryMinutes: row.recoveryMinutes, observedRecovery: row.healthyOutcome
  }]));
  sources[name] = {provider:part.provider,scope:part.sessionScope,first:part.first,last:part.sourceAsOf,
    quality:part.quality,week:part.weeklyExtremes.full,range:part.range,
    daily:project(part.trailing.dailyNewYork),weekly:project(part.trailing.weekly),
    overlap:part.daily.full.extremes.high.marketWindows['London–New York overlap'],
    events:Object.fromEntries(Object.entries(part.events || {}).filter(([,r])=>r.eventsWithCompleteSession > 0))};
}
// Canonicalize line endings so a Git checkout under Windows produces the same identifier.
const payload={schema:input.version,sha256:createHash('sha256').update(original.replace(/\r\n/g,'\n')).digest('hex'),
  state:'historical_observation',priceUnit:input.priceUnit,sources};
await writeFile(output, '// Generated from the published Instrument Lab archive. Do not edit by hand.\nconst HX_EXECUTIVE_ARCHIVE = Object.freeze('+JSON.stringify(payload)+');\n');
