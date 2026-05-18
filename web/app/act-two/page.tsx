import ActTwoSequence from '../../components/ActTwoSequence';
import { SAMPLE_SCRIPT_DATA } from '../../lib/sampleData';

export const dynamic = 'force-static';

export default function ActTwoPage(): JSX.Element {
  return (
    <main className="shell">
      <ActTwoSequence data={SAMPLE_SCRIPT_DATA} />
    </main>
  );
}
