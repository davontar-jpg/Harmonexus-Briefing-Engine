function interpretScoreWithAI(score) {
  const props = hxProps_();
  const apiKey = props.getProperty('OPENAI_API_KEY');
  if (!apiKey) {
    const fallback = hxDeterministicInterpretation_(score, 'Deterministic fallback: OPENAI_API_KEY not configured.');
    hxLogAI_(score, 'deterministic', fallback, 'Fallback');
    return fallback;
  }
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-5.5';
  const evidence = {
    instrument:score.instrument, direction:score.label, strength:score.strength,
    directionalScore:score.directionScore, confidence:score.confidence,
    strongestDrivers:score.strongestDrivers, contradictions:score.contradictions,
    prior:{direction:score.priorLabel, strength:score.priorStrength}, scoreChange:score.scoreChange
  };
  const prompt = [
    'You are the institutional briefing editor for Harmonexus.',
    'Use only the supplied evidence. Never invent prices, events, trades, targets, or catalysts.',
    'Return JSON with keys summary, drivers, contradictions, changed, watchNext.',
    'Use concise institutional language. This is decision support, not trade execution.',
    hxJson_(evidence)
  ].join('\n');
  try {
    const schema = {
      type:'object',additionalProperties:false,
      properties:{summary:{type:'string'},drivers:{type:'array',items:{type:'string'}},contradictions:{type:'array',items:{type:'string'}},changed:{type:'string'},watchNext:{type:'string'}},
      required:['summary','drivers','contradictions','changed','watchNext']
    };
    const response = hxFetch_('https://api.openai.com/v1/responses', {
      method:'post', contentType:'application/json',
      headers:{Authorization:'Bearer ' + apiKey},
      payload:JSON.stringify({model:model,input:prompt,reasoning:{effort:'low'},text:{verbosity:'low',format:{type:'json_schema',name:'harmonexus_interpretation',strict:true,schema:schema}}})
    }, 2);
    const body = JSON.parse(response.getContentText());
    const text = body.output_text || hxExtractOutputText_(body);
    const result = JSON.parse(text);
    hxLogAI_(score, model, result, 'AI');
    return result;
  } catch (error) {
    const fallback = hxDeterministicInterpretation_(score, 'AI unavailable: ' + error.message);
    hxLogAI_(score, model, fallback, 'Fallback');
    return fallback;
  }
}

function generateAIInterpretations() {
  const rows = hxLatestScoreRows_();
  return rows.map(row => interpretScoreWithAI({
    instrument:String(row.Instrument), name:String(row.Name || row.Instrument), family:String(row.Family || ''),
    label:String(row.Direction || 'Neutral'), strength:Number(row.Strength || 1),
    directionScore:Number(row['Directional Score'] || 0), confidence:Number(row.Confidence || 0),
    strongestDrivers:safeJsonCell_(row['Strongest Drivers'], []), contradictions:safeJsonCell_(row.Contradictions, []),
    priorLabel:String(row['Prior Direction'] || ''), priorStrength:row['Prior Strength'] === '' ? '' : Number(row['Prior Strength']),
    scoreChange:row['Score Change'] === '' ? null : Number(row['Score Change'])
  }));
}

function safeJsonCell_(value, fallback) {
  try { return typeof value === 'string' ? JSON.parse(value) : (value || fallback); }
  catch (error) { return fallback; }
}

function hxExtractOutputText_(body) {
  const output = body.output || [];
  for (let i=0; i<output.length; i++) {
    const content = output[i].content || [];
    for (let j=0; j<content.length; j++) if (content[j].text) return content[j].text;
  }
  throw new Error('Responses API returned no text output.');
}

function hxDeterministicInterpretation_(score, note) {
  const driverText = (score.strongestDrivers || []).map(d => d.factor + ' (' + (d.contribution >= 0 ? '+' : '') + d.contribution.toFixed(2) + ')');
  const contradictionText = (score.contradictions || []).map(d => d.factor + ' (' + d.contribution.toFixed(2) + ')');
  return {
    summary:score.name + ' is ' + score.label.toLowerCase() + ' at ' + score.strength.toFixed(1) + '/10 with ' + score.confidence + '% evidence coverage.',
    drivers:driverText,
    contradictions:contradictionText.length ? contradictionText : ['No material opposing factor in the available evidence.'],
    changed:score.scoreChange === null ? 'No prior reading.' : 'Strength changed ' + (score.scoreChange >= 0 ? '+' : '') + score.scoreChange.toFixed(1) + ' from the prior reading.',
    watchNext:'Watch data freshness, the highest-weight unresolved factor, and confirmation from structure/timing.',
    systemNote:note
  };
}

function hxLogAI_(score, model, result, mode) {
  const sh = hxSheet_(HX.sheets.ai, ['Timestamp','Instrument','Model','Mode','Direction','Strength','Input Evidence','Output']);
  hxAppendRows_(sh, [[new Date(),score.instrument,model,mode,score.label,score.strength,hxJson_(score),hxJson_(result)]]);
}
