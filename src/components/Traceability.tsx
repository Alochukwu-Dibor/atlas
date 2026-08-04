import { atlas, format, getCycle, getUser, phase1Domain } from '../data/atlas';
import { DataTable, StatusBadge } from './Ui';

export function EvidenceTable({ evidenceIds }: { evidenceIds: string[] }) {
  const records = phase1Domain.evidenceRecords.filter((record) => evidenceIds.includes(record.id));
  if (!records.length) return <p className="empty-copy">No linked evidence is available.</p>;
  return (
    <DataTable
      caption="Linked evidence"
      headers={['Evidence', 'Type', 'Source location', 'Reporting period', 'Validation']}
      rows={records.map((record) => [
        record.name,
        record.type.replaceAll('_', ' '),
        record.locator,
        record.reportingPeriodId ? getCycle(record.reportingPeriodId).label : '—',
        <StatusBadge status={record.validationStatus} />,
      ])}
    />
  );
}

export function HistoryTable({
  revisionIds = [],
  entityId,
}: {
  revisionIds?: string[];
  entityId?: string;
}) {
  const revisions = phase1Domain.historicalRevisions.filter(
    (revision) => revisionIds.includes(revision.id) || revision.entityId === entityId,
  );
  if (!revisions.length) return <p className="empty-copy">No historical revisions recorded.</p>;
  return (
    <DataTable
      caption="Historical revisions"
      headers={[
        'Reporting period',
        'Previous value',
        'Current value',
        'Explanation',
        'Submitter',
        'Reviewer',
      ]}
      rows={revisions.map((revision) => [
        atlas.reportingCycles.find((period) => period.id === revision.reportingPeriodId)?.label ??
          revision.reportingPeriodId,
        revision.previousValue,
        revision.currentValue,
        revision.explanation,
        getUser(revision.actorId)?.name ?? 'Unknown',
        revision.reviewerId ? (getUser(revision.reviewerId)?.name ?? 'Unknown') : '—',
      ])}
    />
  );
}

export function DecisionHistory({ decisionId }: { decisionId: string }) {
  const decision = phase1Domain.decisions.find(
    (record) => record.decisionSupportItemId === decisionId,
  );
  if (!decision) return <p className="empty-copy">No final decision has been recorded yet.</p>;
  return (
    <dl className="summary-list">
      <div>
        <dt>Final decision</dt>
        <dd>{decision.finalDecision}</dd>
      </div>
      <div>
        <dt>Approved by</dt>
        <dd>{getUser(decision.approvedBy)?.name ?? 'Unknown'}</dd>
      </div>
      <div>
        <dt>Recorded</dt>
        <dd>{format.date(decision.createdAt)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>
          <StatusBadge status={decision.status} />
        </dd>
      </div>
    </dl>
  );
}
