import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = process.env.HARMONEXUS_RESEARCH_SOURCE_DIR
  || "C:/Users/robin/OneDrive/Desktop/Momentity/Harmonexus/Market data";
const packagePath = path.join(sourceDir, "harmonexus_engine_integration_package.json");
const summaryPath = path.join(sourceDir, "harmonexus_combined_instrument_summary.csv");
const discoveriesPath = path.join(sourceDir, "harmonexus_combined_top_discoveries.csv");

const ENGINE_INSTRUMENTS = new Set([
  "XAGUSD","GOLD","COPPER","PLATINUM","US30","SPX500","NAS100","RUSSELL2000",
  "DXY","EURUSD","GBPUSD","GBPJPY","EURJPY","USDJPY","USDDKK","US2Y","US5Y","US10Y","US30Y"
]);

const SYMBOL_MAP = new Map(Object.entries({
  "COMEX_DL_SI1!, 60(2)": "XAGUSD",
  "FX_XAGUSD": "XAGUSD",
  "TVC_GOLD, 60(1)": "GOLD",
  "COMEX_DL_HG1!, 60(2)": "COPPER",
  "NYMEX_DL_PL1!": "PLATINUM",
  "CAPITALCOM_US30, 60(2)": "US30",
  "TVC_DJI": "US30",
  "SP_SPX": "SPX500",
  "NASDAQ_DLY_NDX, 60(2)": "NAS100",
  "OANDA_US2000USD, 60(2)": "RUSSELL2000",
  "IG_RUSSELL, 60(2)": "RUSSELL2000",
  "TVC_DXY": "DXY",
  "OANDA_EURUSD": "EURUSD",
  "OANDA_GBPUSD, 60(2)": "GBPUSD",
  "OANDA_GBPJPY, 60(2)": "GBPJPY",
  "OANDA_EURJPY": "EURJPY",
  "FX_USDJPY": "USDJPY",
  "OANDA_USDDKK, 60(2)": "USDDKK",
  "TVC_US02Y, 60(1)": "US2Y",
  "TVC_US05Y, 60(1)": "US5Y",
  "TVC_US10Y, 60(1)": "US10Y",
  "TVC_US30Y": "US30Y"
}));

const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_NAMES = {Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday",Sat:"Saturday",Sun:"Sunday"};

const round = (value, digits = 4) => {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
};

const confidenceFromResearch = (entry = {}) => {
  if (entry.daily_only === true) return "Low";
  const rows = Number(entry.rows || 0);
  const years = Number(entry.years || 0);
  if (rows >= 20000 || years >= 10) return "High";
  if (rows >= 5000 || years >= 3) return "Moderate";
  return "Low";
};

const engineInstrument = symbol => {
  const mapped = SYMBOL_MAP.get(symbol);
  return mapped && ENGINE_INSTRUMENTS.has(mapped) ? mapped : "";
};

const parseCsv = text => {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter(r => r.some(v => v !== "")).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
};

const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
const summaryRows = parseCsv(await fs.readFile(summaryPath, "utf8"));
const discoveryRows = parseCsv(await fs.readFile(discoveriesPath, "utf8"));

const summaryBySymbol = new Map(summaryRows.map(row => [row.instrument, row]));
const probabilityRows = (pkg.probability_tables || []).map((row, index) => ({
  ...row,
  rank: Number(row.rank || index + 1),
  engine_instrument: engineInstrument(row.instrument),
  supported: Boolean(engineInstrument(row.instrument))
}));

const monthlyProbability = new Map();
for (const p of probabilityRows) {
  const match = String(p.finding || "").match(/Month\s+(\d+)/i);
  if (p.engine_instrument && p.category === "Monthly seasonality" && match) {
    monthlyProbability.set(`${p.instrument}|${Number(match[1])}`, p);
  }
}

const instrumentMap = Object.entries(pkg.seasonal_database || {}).map(([symbol, entry]) => {
  const row = summaryBySymbol.get(symbol) || {};
  const mapped = engineInstrument(symbol);
  return {
    research_symbol: symbol,
    engine_instrument: mapped || "UNSUPPORTED",
    supported: Boolean(mapped),
    unsupported_reason: mapped ? "" : "No active Harmonexus v5 instrument mapping.",
    source_batch: entry.source_batch || row.source_batch || "",
    rows: Number(entry.rows || row.rows || 0) || null,
    daily_bars: Number(entry.daily_bars || row.daily_bars || 0) || null,
    start: entry.start || row.start || "",
    end: entry.end || row.end || "",
    years: round(entry.years || row.years, 2),
    has_volume: entry.has_volume ?? (row.has_volume === "" ? null : row.has_volume),
    daily_only: entry.daily_only ?? (row.daily_only === "" ? null : row.daily_only),
    research_confidence: confidenceFromResearch(entry)
  };
});

const seasonal = Object.entries(pkg.seasonal_database || {}).map(([symbol, entry]) => {
  const row = summaryBySymbol.get(symbol) || {};
  const mapped = engineInstrument(symbol);
  const bestMonth = Number(entry.best_month || row.best_month || 0) || null;
  const worstMonth = Number(entry.worst_month || row.worst_month || 0) || null;
  const bestProb = bestMonth ? monthlyProbability.get(`${symbol}|${bestMonth}`) : null;
  const worstProb = worstMonth ? monthlyProbability.get(`${symbol}|${worstMonth}`) : null;
  return {
    research_symbol: symbol,
    engine_instrument: mapped || "UNSUPPORTED",
    supported: Boolean(mapped),
    best_month: bestMonth,
    best_month_name: bestMonth ? MONTH_NAMES[bestMonth] : "UNKNOWN",
    best_month_avg_pct: round(row["best_month_avg_%"] || null, 6),
    best_month_probability: bestProb ? round(bestProb.probability, 4) : null,
    best_month_sample_size: bestProb ? Number(bestProb.sample_size || 0) || null : null,
    worst_month: worstMonth,
    worst_month_name: worstMonth ? MONTH_NAMES[worstMonth] : "UNKNOWN",
    worst_month_avg_pct: round(row["worst_month_avg_%"] || null, 6),
    worst_month_probability: worstProb ? round(worstProb.probability, 4) : null,
    worst_month_sample_size: worstProb ? Number(worstProb.sample_size || 0) || null : null,
    best_dow: row.best_dow || "UNKNOWN",
    best_dow_avg_pct: round(row["best_dow_avg_%"] || null, 6),
    reversal_after_3_probability: round(entry.reversal_after_3_same_direction_probability || row.rev_after_3_prob || null, 4),
    weekly_first_day_continuation_probability: round(entry.weekly_first_day_continuation_probability || row.weekly_firstday_cont_prob || null, 4),
    source_batch: entry.source_batch || row.source_batch || "",
    research_confidence: confidenceFromResearch(entry)
  };
});

const sessions = Object.entries(pkg.session_database || {}).map(([symbol, entry]) => {
  const mapped = engineInstrument(symbol);
  const seasonalEntry = pkg.seasonal_database?.[symbol] || {};
  return {
    research_symbol: symbol,
    engine_instrument: mapped || "UNSUPPORTED",
    supported: Boolean(mapped),
    session_preference: entry.SessionPreference || "UNKNOWN",
    ny_reverses_london_probability: round(entry.NYReversesLondonProbability, 4),
    source_batch: seasonalEntry.source_batch || "",
    research_confidence: confidenceFromResearch(seasonalEntry)
  };
});

const hourly = Object.entries(pkg.hourly_database || {}).map(([symbol, entry]) => {
  const mapped = engineInstrument(symbol);
  const seasonalEntry = pkg.seasonal_database?.[symbol] || {};
  const summary = summaryBySymbol.get(symbol) || {};
  return {
    research_symbol: symbol,
    engine_instrument: mapped || "UNSUPPORTED",
    supported: Boolean(mapped),
    most_volatile_hour_et: entry.MostVolatileHourET === null ? null : Number(entry.MostVolatileHourET),
    most_volatile_hour_avg_range_pct: round(summary["most_volatile_hour_avg_range_%"] || null, 6),
    daily_only: entry.DailyOnly,
    source_batch: seasonalEntry.source_batch || "",
    research_confidence: confidenceFromResearch(seasonalEntry)
  };
});

const personality = Object.entries(pkg.market_personality_flags || {}).map(([symbol, entry]) => ({
  research_symbol: symbol,
  engine_instrument: engineInstrument(symbol) || "UNSUPPORTED",
  supported: Boolean(engineInstrument(symbol)),
  ...entry
}));

const discoveries = discoveryRows.map((row, index) => ({
  research_symbol: row.instrument,
  engine_instrument: engineInstrument(row.instrument) || "UNSUPPORTED",
  supported: Boolean(engineInstrument(row.instrument)),
  category: row.category,
  finding: row.finding,
  why_it_matters: row.why_it_matters,
  confidence_score: round(row.confidence_score, 6),
  sample_size: Number(row.n || 0) || null,
  source_batch: row.source_batch,
  confidence: row.confidence,
  rank: Number(row.rank || index + 1)
}));

const timingRows = probabilityRows
  .filter(row => row.supported && /^Weekly (high|low) timing$/.test(row.category))
  .map(row => {
    const match = String(row.finding || "").match(/([A-Za-z]+)\s+forms weekly\s+(high|low)\s+([\d.]+)%.*sample\s+([\d.]+)/i);
    return {
      engine_instrument: row.engine_instrument,
      research_symbol: row.instrument,
      machine_state: "Any",
      timing_type: match ? match[2].toLowerCase() : "UNKNOWN",
      day: match ? DOW_NAMES[match[1].slice(0,3)] || match[1] : "UNKNOWN",
      probability: match ? round(Number(match[3]) / 100, 4) : row.probability,
      sample_size: match ? Number(match[4]) : row.sample_size,
      confidence: row.confidence,
      finding: row.finding,
      source_batch: row.source_batch
    };
  });

const normalized = {
  generated_at: new Date().toISOString(),
  source_files: {
    package: path.basename(packagePath),
    summary: path.basename(summaryPath),
    top_discoveries: path.basename(discoveriesPath)
  },
  package_name: pkg.package_name,
  package_version: pkg.version,
  scope: pkg.scope,
  hard_rules: pkg.hard_rules,
  confidence_weights: pkg.confidence_weights,
  instrument_map: instrumentMap,
  seasonal_database: seasonal,
  session_database: sessions,
  hourly_database: hourly,
  market_personality_flags: personality,
  probability_tables: probabilityRows,
  top_discoveries: discoveries,
  seasonal_watch_rules: pkg.seasonal_watch_rules || [],
  session_watch_rules: pkg.session_watch_rules || [],
  timing_windows: timingRows,
  risk_notes: pkg.risk_notes || [],
  coding_notes: pkg.coding_notes || [],
  unsupported_symbols: instrumentMap.filter(row => !row.supported).map(row => row.research_symbol),
  validation: {
    package_symbol_count: Object.keys(pkg.seasonal_database || {}).length,
    supported_symbol_count: instrumentMap.filter(row => row.supported).length,
    unsupported_symbol_count: instrumentMap.filter(row => !row.supported).length,
    engine_instrument_count: new Set(instrumentMap.filter(row => row.supported).map(row => row.engine_instrument)).size,
    probability_rows: probabilityRows.length,
    top_discovery_rows: discoveries.length
  }
};

const dataDir = path.join(root, "data", "research");
await fs.mkdir(dataDir, {recursive:true});
await fs.writeFile(path.join(dataDir, "harmonexus_research_library.normalized.json"), JSON.stringify(normalized, null, 2) + "\n");

const appScript = `/**\n * Generated by tools/build-research-library.mjs from the authoritative Harmonexus Research Department package.\n * This is structured lookup data only; live market evidence remains primary.\n */\nconst RESEARCH_LIBRARY = ${JSON.stringify(normalized)};\n`;
await fs.writeFile(path.join(root, "src", "08_ResearchLibrary.gs"), appScript);

console.log(JSON.stringify(normalized.validation, null, 2));
