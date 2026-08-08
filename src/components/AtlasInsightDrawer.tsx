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
}

const presetQuestions = [
  'What changed from the previous period?',
  'What is the recommended next action?',
  'Which project or baseline measure is affected?',
];

export function AtlasInsightDrawer({
  context,
  onClose,
}: {
  context: AtlasInsightContext | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Array<{ question: string; answer: string }>>([]);

  const ask = (value: string) => {
    const prompt = value.trim();
    if (!prompt || !context) return;
    setConversation((current) => [
      ...current,
      {
        question: prompt,
        answer: `${context.title} remains linked to the current approved baseline. ${context.impact ?? context.description} The next step is to confirm the accountable owner, timing and supporting evidence in the next Weekly Update.`,
      },
    ]);
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
          <section>
            <h3>Ask Atlas a follow-up</h3>
            <div className="atlas-follow-up-presets">
              {presetQuestions.map((preset) => (
                <Button key={preset} variant="secondary" onClick={() => ask(preset)}>
                  {preset}
                </Button>
              ))}
            </div>
          </section>
          {conversation.length > 0 && (
            <ol className="atlas-insight-conversation">
              {conversation.map((message, index) => (
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
