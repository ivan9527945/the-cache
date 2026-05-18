'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  parseAnyArchive,
  buildFeaturesFromTweets,
} from '../../../src/extract';
import { buildScriptData } from '../../../src/actTwo';
import { useSession } from '../../lib/sessionStore';

type Status = 'idle' | 'parsing' | 'error';

export default function UploadPage(): JSX.Element {
  const router = useRouter();
  const setFeatures = useSession((s) => s.setFeatures);
  const setActTwoData = useSession((s) => s.setActTwoData);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('parsing');
    setError(null);
    setProgress(`讀取 ${file.name}⋯`);
    try {
      const tweets = await parseAnyArchive(file);
      setProgress(`解析 ${tweets.length} 則 tweet⋯`);
      const { features } = buildFeaturesFromTweets(tweets);
      const actTwoData = buildScriptData(tweets);
      // 原始 tweets 不寫進 session,讓 GC 回收。送出去的只有兩個摘要物件。
      setFeatures(features);
      setActTwoData(actTwoData);
      router.push('/act-two');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
      setProgress(null);
    }
  }

  return (
    <main className="shell">
      <p className="line">上傳你的 Twitter / X archive。</p>
      <div className="spacer" />
      <p className="line dim">
        原始檔不會離開你的瀏覽器。解析、特徵抽取、所有計算都在這個分頁裡跑完;
        送到後端的只有純統計摘要,不含一個字的原文。
      </p>
      <div className="spacer" />
      <p className="line">
        <input
          type="file"
          accept=".zip,.js"
          onChange={onFile}
          disabled={status === 'parsing'}
        />
      </p>
      {status === 'parsing' && progress && <p className="line dim">{progress}</p>}
      {status === 'error' && (
        <>
          <p className="line">解析失敗:{error}</p>
          <p className="line dim">支援 .zip(整包 archive)或 tweets*.js(單檔)。</p>
        </>
      )}
      <div className="spacer" />
      <p className="line dim">
        <Link href="/privacy">→ 想知道為什麼可以信任這件事</Link>
      </p>
    </main>
  );
}
