import { query } from './index';

export async function seedGroupAInitialData() {
  console.log('[Group A Seed] Initializing Group A predictive agent states...');
  
  const seedAgents = [
    {
      id: 'A1',
      name: 'Risk Prediction',
      code: 'RISK_PREDICTION',
      desc: 'Regional pre-event disaster risk modeling using active incidents and alerts',
      status: 'COMPLETE',
      progress: 100,
      summaryMetric: 'PEAK REGIONAL RISK: 92 (CRITICAL)',
    },
    {
      id: 'A2',
      name: 'Hazard Forecasting',
      code: 'HAZARD_FORECASTING',
      desc: 'Multi-hazard forecast modeling (structural, flood, weather) and trajectory projection',
      status: 'COMPLETE',
      progress: 100,
      summaryMetric: '2 ACTIVE HAZARD THREATS',
    },
    {
      id: 'A3',
      name: 'Vulnerability Analysis',
      code: 'VULNERABILITY_ANALYSIS',
      desc: 'Demographic, shelter deficit, and evacuation corridor bottleneck analysis',
      status: 'COMPLETE',
      progress: 100,
      summaryMetric: 'ZONE NE-4 ELEVATED DEFICIT',
    },
    {
      id: 'A4',
      name: 'Resource Pre-Positioning',
      code: 'RESOURCE_PREPOSITIONING',
      desc: 'Predictive resource staging recommendations gated by human command approval',
      status: 'COMPLETE',
      progress: 100,
      summaryMetric: '1 PENDING APPROVAL REQUEST',
    },
    {
      id: 'A5',
      name: 'Early Warning',
      code: 'EARLY_WARNING',
      desc: 'Pre-event early warning bulletins, sirens, and community advisories',
      status: 'COMPLETE',
      progress: 100,
      summaryMetric: 'CRITICAL ADVISORY ISSUED',
    },
    {
      id: 'A6',
      name: 'Preparedness Assessment',
      code: 'PREPAREDNESS_ASSESSMENT',
      desc: 'Readiness evaluation across shelter capacity, medical supply, and responder coverage',
      status: 'COMPLETE',
      progress: 100,
      summaryMetric: '76% SYSTEM READINESS (ACCEPTABLE)',
    },
  ];

  for (const agent of seedAgents) {
    await query(
      `INSERT INTO predictive_agent_state (agent_id, name, code, description, status, progress, summary_metric, last_run)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (agent_id) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         code = EXCLUDED.code,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         progress = EXCLUDED.progress,
         summary_metric = EXCLUDED.summary_metric,
         updated_at = CURRENT_TIMESTAMP`,
      [agent.id, agent.name, agent.code, agent.desc, agent.status, agent.progress, agent.summaryMetric]
    );
  }

  console.log('[Group A Seed] Group A predictive agent states populated.');
}

if (process.argv[1] && process.argv[1].includes('seedGroupA')) {
  seedGroupAInitialData()
    .then(() => {
      console.log('[Group A Seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Group A Seed Error]:', err);
      process.exit(1);
    });
}
