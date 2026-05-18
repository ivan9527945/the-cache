'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ActTwoSequence from '../../components/ActTwoSequence';
import { useSession } from '../../lib/sessionStore';
import { SAMPLE_SCRIPT_DATA } from '../../lib/sampleData';
import type { ScriptData } from '../../../src/actTwo';

export default function ActTwoClient(): JSX.Element {
  const sessionData = useSession((s) => s.actTwoData);
  const [data, setData] = useState<ScriptData | null>(null);
  const [usingSample, setUsingSample] = useState(false);

  useEffect(() => {
    if (sessionData) {
      setData(sessionData);
      setUsingSample(false);
    } else {
      setData(SAMPLE_SCRIPT_DATA);
      setUsingSample(true);
    }
  }, [sessionData]);

  if (!data) return <p className="line dim">準備中⋯</p>;

  return (
    <>
      {usingSample && (
        <p className="line dim" style={{ marginBottom: '2rem' }}>
          (用 sample 資料 demo —{' '}
          <Link href="/upload">改用自己的 archive</Link>)
        </p>
      )}
      <ActTwoSequence data={data} />
    </>
  );
}
