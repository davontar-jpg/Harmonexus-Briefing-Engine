/** Harmonexus v5 configuration. Secrets belong in Script Properties, never cells. */
const HX = Object.freeze({
  version: '5.0.0',
  sheets: Object.freeze({
    rawFRED: 'FRED_Raw', rawCFTC: 'CFTC_Raw', webhook: 'Webhook_Log',
    normalized: 'Normalized_Data', signals: 'Calculated_Signals', signalHistory: 'Signal_History', scores: 'Instrument_Scores',
    snapshots: 'Score_History', ai: 'AI_Interpretations', notifications: 'Notification_Log', systemLog: 'System_Log'
  }),
  fredCsvBase: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=',
  fredSeries: Object.freeze({
    REAL10Y: 'DFII10', US2Y: 'DGS2', US5Y: 'DGS5', US10Y: 'DGS10', US30Y: 'DGS30'
  }),
  cftcEndpoints: Object.freeze({
    legacy: 'https://publicreporting.cftc.gov/resource/6dca-aqww.json',
    tff: 'https://publicreporting.cftc.gov/resource/gpe5-46if.json'
  }),
  materialChange: Object.freeze({ scoreDelta: 1.5, directionFlip: true, confidenceDelta: 20 }),
  score: Object.freeze({ neutralBand: 0.15, maxAbsSignal: 1, historyLimit: 5000 })
});

const SIGNAL_HEADERS = Object.freeze([
  'As Of','Instrument','Factor','Raw Value','Normalized Signal','Source','Quality','Event ID',
  'Confidence','Driver','Contradiction','Prior Signal','Signal Delta','Material Change','Notes'
]);

/** Registry entries are data, not branching code. Add an instrument here to extend the system. */
const INSTRUMENTS = Object.freeze({
  XAGUSD: instrument_('Silver', 'metal', {DXY:-0.20, REAL10Y:-0.25, POSITIONING:0.25, COMMERCIAL:0.15, OI:0.15}, 'XAGUSD'),
  GOLD: instrument_('Gold', 'metal', {DXY:-0.25, REAL10Y:-0.30, POSITIONING:0.20, COMMERCIAL:0.15, OI:0.10}, 'GOLD'),
  COPPER: instrument_('Copper', 'metal', {DXY:-0.20, REAL10Y:-0.10, POSITIONING:0.25, COMMERCIAL:0.20, OI:0.10, RISK:0.15}, 'COPPER'),
  PLATINUM: instrument_('Platinum', 'metal', {DXY:-0.20, REAL10Y:-0.15, POSITIONING:0.25, COMMERCIAL:0.20, OI:0.20}, 'PLATINUM'),
  US30: instrument_('Dow Jones', 'equity', {DXY:-0.10, REAL10Y:-0.20, POSITIONING:0.25, COMMERCIAL:0.15, OI:0.10, RISK:0.20}, 'US30'),
  SPX500: instrument_('S&P 500', 'equity', {DXY:-0.10, REAL10Y:-0.20, POSITIONING:0.25, COMMERCIAL:0.15, OI:0.10, RISK:0.20}, 'SPX500'),
  NAS100: instrument_('Nasdaq 100', 'equity', {DXY:-0.10, REAL10Y:-0.30, POSITIONING:0.25, COMMERCIAL:0.10, OI:0.10, RISK:0.15}, 'NAS100'),
  RUSSELL2000: instrument_('Russell 2000', 'equity', {DXY:-0.10, REAL10Y:-0.20, POSITIONING:0.25, COMMERCIAL:0.15, OI:0.10, RISK:0.20}, 'RUSSELL2000'),
  DXY: instrument_('US Dollar Index', 'fx-index', {POSITIONING:0.30, COMMERCIAL:0.20, OI:0.15, US2Y:0.15, US10Y:0.10, RISK:0.10}, 'DXY'),
  EURUSD: instrument_('Euro / US Dollar', 'fx', {DXY:-0.35, US2Y:-0.20, POSITIONING:0.20, COMMERCIAL:0.15, RISK:0.10}, 'EURUSD'),
  GBPUSD: instrument_('Sterling / US Dollar', 'fx', {DXY:-0.35, US2Y:-0.20, POSITIONING:0.20, COMMERCIAL:0.15, RISK:0.10}, 'GBPUSD'),
  GBPJPY: instrument_('Sterling / Yen', 'fx-cross', {US2Y:0.10, POSITIONING:0.25, COMMERCIAL:0.20, RISK:0.25, TREND:0.20}, 'GBPJPY'),
  EURJPY: instrument_('Euro / Yen', 'fx-cross', {US2Y:0.10, POSITIONING:0.25, COMMERCIAL:0.20, RISK:0.25, TREND:0.20}, 'EURJPY'),
  USDJPY: instrument_('US Dollar / Yen', 'fx', {DXY:0.25, US2Y:0.25, US10Y:0.15, POSITIONING:0.15, COMMERCIAL:0.10, RISK:0.10}, 'USDJPY'),
  USDDKK: instrument_('US Dollar / Danish Krone', 'fx', {DXY:0.45, US2Y:0.20, POSITIONING:0.15, COMMERCIAL:0.10, TREND:0.10}, 'USDDKK'),
  US2Y: instrument_('US 2Y Yield', 'rate', {TREND:0.35, FED:0.30, INFLATION:0.20, RISK:-0.15}, null),
  US5Y: instrument_('US 5Y Yield', 'rate', {TREND:0.35, FED:0.25, INFLATION:0.25, RISK:-0.15}, null),
  US10Y: instrument_('US 10Y Yield', 'rate', {TREND:0.35, FED:0.20, INFLATION:0.30, RISK:-0.15}, null),
  US30Y: instrument_('US 30Y Yield', 'rate', {TREND:0.35, FED:0.10, INFLATION:0.40, RISK:-0.15}, null)
});

function instrument_(name, family, weights, cftcKey) {
  return Object.freeze({name:name, family:family, weights:Object.freeze(weights), cftcKey:cftcKey});
}
