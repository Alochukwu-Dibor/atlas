import { useState, type CSSProperties } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button, Drawer, StatusBadge } from './Ui';

export function HealthMetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: string;
}) {
  return (
    <article className="panel kpi executive-health-card">
      <span className="kpi__label">{label}</span>
      <div className="executive-health-card__value">
        <span
          className="executive-health-card__ring"
          style={{ '--health-value': `${value * 3.6}deg` } as CSSProperties}
          aria-hidden="true"
        />
        <strong>{value}</strong>
        <StatusBadge status={status} />
      </div>
    </article>
  );
}

export interface AtlasInsightContext {
  title: string;
  description: string;
  impact?: string;
  status: string;
  kind?: 'risk' | 'insight';
  reference?: string;
}

interface InsightAnalysis {
  change: string;
  driver: string;
  consequence: string;
  action: string;
  evidence: string;
  questions: string[];
}

function analyseContext(context: AtlasInsightContext): InsightAnalysis {
  const subject = context.title.toLowerCase();
  const reference = context.reference ?? 'the linked project';

  if (subject.includes('rotor') || subject.includes('logistics')) {
    return {
      change:
        'The delivery date has moved beyond the installation sequence assumed in the approved plan, reducing schedule confidence for the current reporting period.',
      driver:
        'Final freight routing and site-delivery confirmation remain unresolved, so mechanical installation cannot start on the planned date.',
      consequence:
        'Continued constrained production increases deferred barrels and revenue exposure while compressing the commissioning window.',
      action:
        'Confirm the carrier, arrival date and contingency route; then re-baseline the installation sequence through an approved forecast revision.',
      evidence:
        'Carrier confirmation, material receipt record, revised installation schedule and the next manager Weekly Update.',
      questions: [
        'How many production days are exposed by the rotor delay?',
        'What logistics contingency should the project owner activate?',
        'Which evidence will confirm the recovery date?',
      ],
    };
  }

  if (subject.includes('production') || subject.includes('delivery constraint')) {
    return {
      change:
        'Reported output remains below the confirmed production target and the recovery rate is not yet sufficient to close the plan gap.',
      driver:
        'Equipment availability and delayed restoration activities are constraining deliverable capacity across the linked assets.',
      consequence:
        'The shortfall reduces revenue and cost-recovery capacity and may cause the next reporting period to miss its approved target.',
      action:
        'Prioritise the highest-volume restoration activity, confirm daily recovery milestones and assign an owner to each unresolved constraint.',
      evidence:
        'Daily production statements, equipment-availability logs, completed work orders and approved target records.',
      questions: [
        `Which production constraint is having the largest impact on ${reference}?`,
        'How much output can be recovered in the next reporting period?',
        'Which project milestone must be accelerated first?',
      ],
    };
  }

  if (
    subject.includes('cash') ||
    subject.includes('liquidity') ||
    subject.includes('budget') ||
    subject.includes('financial')
  ) {
    return {
      change:
        'The latest forecast has moved closer to the approved funding threshold while committed costs remain above the planned position.',
      driver:
        'Adverse project variance and the timing of near-term obligations are consuming available liquidity faster than planned.',
      consequence:
        'Operating flexibility may narrow and discretionary project commitments could require reprioritisation.',
      action:
        'Validate the thirteen-week cash forecast, challenge uncommitted spend and escalate only the funding decisions that affect critical delivery.',
      evidence:
        'Approved budget lines, commitment register, receivables ageing and the current cash-flow forecast.',
      questions: [
        'Which commitments are creating the largest funding exposure?',
        'How much headroom remains above the minimum cash threshold?',
        'What spend can be deferred without affecting critical delivery?',
      ],
    };
  }

  if (
    subject.includes('community') ||
    subject.includes('regulatory') ||
    subject.includes('legal') ||
    subject.includes('inspection')
  ) {
    return {
      change:
        'The required access or approval has not been secured by the date assumed in the project plan.',
      driver:
        'An outstanding stakeholder commitment or supporting submission is preventing the planned activity from proceeding.',
      consequence:
        'The project may lose schedule days and face increased licence-to-operate or compliance exposure.',
      action:
        'Confirm the outstanding obligation, accountable owner and decision deadline, then record documentary evidence of closure.',
      evidence:
        'Stakeholder minutes, approval correspondence, commitment register and the relevant regulatory submission.',
      questions: [
        'Which stakeholder commitment remains unresolved?',
        'What is the latest date that avoids a schedule impact?',
        'What documentary evidence is required to close this issue?',
      ],
    };
  }

  if (subject.includes('hse') || subject.includes('safety') || subject.includes('isolation')) {
    return {
      change:
        'Open corrective actions have carried into the current reporting period without complete closure evidence.',
      driver:
        'Field verification and accountable-owner sign-off are incomplete for one or more high-potential controls.',
      consequence:
        'The affected work cannot safely advance to handover and residual operational exposure remains.',
      action:
        'Complete field verification, attach closure evidence and obtain HSE owner sign-off before the next gated activity.',
      evidence:
        'Corrective-action register, isolation certificate, site photographs and HSE verification record.',
      questions: [
        'Which corrective action is blocking safe progression?',
        'Who must verify closure before work resumes?',
        'What evidence is still missing from the HSE record?',
      ],
    };
  }

  return {
    change:
      'The latest validated update has moved this item outside the tolerance assumed in the confirmed baseline.',
    driver: context.description,
    consequence:
      context.impact ?? 'Delivery confidence will remain reduced until the variance is resolved.',
    action:
      'Confirm the accountable owner, revised forecast and supporting evidence in the next Weekly Update.',
    evidence: 'Approved baseline, latest Weekly Update, owner comment and supporting evidence.',
    questions: [
      `What is driving “${context.title}”?`,
      `What happens if “${context.title}” is not resolved this period?`,
      `What evidence would confirm “${context.title}” is improving?`,
    ],
  };
}

export function AtlasInsightDrawer({
  context,
  onClose,
}: {
  context: AtlasInsightContext | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<{
    contextTitle: string;
    messages: Array<{ question: string; answer: string }>;
  }>({ contextTitle: '', messages: [] });

  const analysis = context ? analyseContext(context) : null;
  const activeMessages =
    context && conversation.contextTitle === context.title ? conversation.messages : [];

  const ask = (value: string) => {
    const prompt = value.trim();
    if (!prompt || !context) return;
    const lowerPrompt = prompt.toLowerCase();
    const answer = lowerPrompt.match(/why|driv|cause|reason/)
      ? analysis!.driver
      : lowerPrompt.match(/impact|happen|expos|risk/)
        ? analysis!.consequence
        : lowerPrompt.match(/evidence|confirm|prove|document/)
          ? analysis!.evidence
          : lowerPrompt.match(/change|previous|trend/)
            ? analysis!.change
            : lowerPrompt.match(/who|owner/)
              ? `The accountable owner for ${context.reference ?? 'this item'} should confirm the recovery action and due date in the next Weekly Update. Atlas currently flags owner confirmation as required.`
              : analysis!.action;
    setConversation((current) => ({
      contextTitle: context.title,
      messages: [
        ...(current.contextTitle === context.title ? current.messages : []),
        { question: prompt, answer },
      ],
    }));
    setQuestion('');
  };

  return (
    <Drawer title={context?.title ?? 'Atlas insight'} open={Boolean(context)} onClose={onClose}>
      {context && (
        <div className="atlas-insight-drawer">
          <div className="atlas-insight-summary">
            <StatusBadge status={context.status} />
            <p>{context.description}</p>
            {context.impact && <small>{context.impact}</small>}
          </div>
          <section className="atlas-insight-analysis" aria-label="Atlas analysis">
            <div>
              <span>What changed</span>
              <p>{analysis!.change}</p>
            </div>
            <div>
              <span>Likely driver</span>
              <p>{analysis!.driver}</p>
            </div>
            <div>
              <span>Business consequence</span>
              <p>{analysis!.consequence}</p>
            </div>
            <div>
              <span>Recommended action</span>
              <p>{analysis!.action}</p>
            </div>
            <div>
              <span>Evidence to verify</span>
              <p>{analysis!.evidence}</p>
            </div>
          </section>
          <section>
            <h3>Ask Atlas a follow-up</h3>
            <div className="atlas-follow-up-presets">
              {analysis!.questions.map((preset) => (
                <Button key={preset} variant="secondary" onClick={() => ask(preset)}>
                  {preset}
                </Button>
              ))}
            </div>
          </section>
          {activeMessages.length > 0 && (
            <ol className="atlas-insight-conversation">
              {activeMessages.map((message, index) => (
                <li key={`${message.question}-${index}`}>
                  <strong>You</strong>
                  <p>{message.question}</p>
                  <strong>Atlas</strong>
                  <p>{message.answer}</p>
                </li>
              ))}
            </ol>
          )}
          <form
            className="atlas-insight-composer"
            onSubmit={(event) => {
              event.preventDefault();
              ask(question);
            }}
          >
            <label>
              <span className="sr-only">Ask Atlas about this item</span>
              <textarea
                value={question}
                placeholder="Ask Atlas about this risk or insight"
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={!question.trim()} aria-label="Send question to Atlas">
              <ArrowUp aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}
    </Drawer>
  );
}
