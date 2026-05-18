'use client';

// 結尾畫面。doc 04 §3:畫面切黑、「已刪除」、「你還活著」、僅有 X。
// doc 04 §6:不打擾使用者,沒有 auto-redirect、彈窗、音效、background animation。

import { useEffect } from 'react';
import { useSession } from '../../lib/sessionStore';

function reallyDeleteEverything(purge: () => void): void {
  // 1. session store
  purge();
  // 2. localStorage
  try {
    localStorage.clear();
  } catch {
    /* private mode */
  }
  // 3. sessionStorage
  try {
    sessionStorage.clear();
  } catch {
    /* private mode */
  }
  // 4. IndexedDB
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    indexedDB
      .databases()
      .then((dbs) => {
        for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
      })
      .catch(() => {});
  }
  // 5. Cache Storage
  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {});
  }
}

export default function EndingFinal(): JSX.Element {
  const purge = useSession((s) => s.purge);

  useEffect(() => {
    reallyDeleteEverything(purge);
  }, [purge]);

  // 故意:
  //   - 沒有 router push
  //   - 沒有 setTimeout 自動跳轉
  //   - 沒有 analytics event
  //   - 沒有 「再玩一次」、「分享」、「給我們回饋」
  //   - X 顏色很淡,不引導
  return (
    <div className="ending-final">
      <div className="ending-final-text">
        <p className="ending-final-line" style={{ animationDelay: '2s' }}>
          已刪除。
        </p>
        <p className="ending-final-line" style={{ animationDelay: '7s' }}>
          你還活著。
        </p>
      </div>
      <button
        className="ending-x"
        style={{ animationDelay: '8s' }}
        onClick={() => window.close()}
        aria-label="關閉"
      >
        ×
      </button>
    </div>
  );
}
