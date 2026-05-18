import type { ScriptData, Section, ScriptStep } from './types.js';

const PAUSE = {
  half: 500,
  s1: 1000,
  s1_5: 1500,
  s2: 2000,
  s2_5: 2500,
  s3: 3000,
  s4: 4000,
  s5: 5000,
  s6: 6000,
};

const DELAY = {
  fileLine: 500,
  wordLine: 400,
  emotionLine: 300,
  personalityLine: 600,
};

function n(x: number): string {
  return x.toLocaleString('en-US');
}

function fmt1(x: number): string {
  return (Math.round(x * 10) / 10).toString();
}

function line(text: string, pauseAfterMs: number): ScriptStep {
  return { kind: 'line', text, pauseAfterMs };
}

function list(items: string[], perItemDelayMs: number, pauseAfterMs: number): ScriptStep {
  return { kind: 'list', items, perItemDelayMs, pauseAfterMs };
}

function compact(steps: (ScriptStep | null)[]): ScriptStep[] {
  return steps.filter((s): s is ScriptStep => s !== null);
}

export function buildScript(data: ScriptData): Section[] {
  return [
    {
      id: 'opening',
      title: '開場',
      steps: compact([
        line('正在解析你的數位足跡。', PAUSE.s1),
        list(
          data.archiveFiles.map((f) => `讀取 ${f}`),
          DELAY.fileLine,
          PAUSE.s2,
        ),
        line('完成。', PAUSE.s3),
      ]),
    },

    {
      id: 'wave-1',
      title: '第一波',
      steps: compact([
        line(`你在過去 ${data.yearsActive} 年發了 ${n(data.totalPosts)} 則貼文。`, PAUSE.s2),
        line(`平均每天 ${fmt1(data.postsPerDay)} 則。`, PAUSE.s3),
        data.deletedCount !== null
          ? line(`你刪除過 ${n(data.deletedCount)} 則。`, PAUSE.s4)
          : null,
      ]),
    },

    {
      id: 'wave-2',
      title: '第二波',
      steps: compact([
        line(`你最常在晚上 ${data.peakHourMinute} 發文。`, PAUSE.s2),
        line(`你在凌晨 2 點到 5 點之間發過 ${n(data.lateNightCount)} 則。`, PAUSE.s2),
        line(
          `你連續發文最久的一天:${n(data.longestDayCount)} 則,${data.longestDayDate}。`,
          PAUSE.s1_5,
        ),
        line('那天發生了什麼,我們不知道。', PAUSE.s1),
        data.longestDayWhyCount !== null
          ? line(`但你那天用了 ${n(data.longestDayWhyCount)} 次「為什麼」。`, PAUSE.s4)
          : null,
      ]),
    },

    {
      id: 'wave-3',
      title: '第三波',
      steps: compact([
        line('你最常用的詞:', PAUSE.half),
        list(
          data.topWordsWithCounts.map(({ word, count }) => `「${word}」　　${n(count)} 次`),
          DELAY.wordLine,
          PAUSE.s3,
        ),
        line(
          `「我」出現的頻率是「你」的 ${fmt1(data.pronounRatio)} 倍。`,
          PAUSE.s5,
        ),
      ]),
    },

    {
      id: 'wave-4',
      title: '第四波',
      steps: compact([
        data.motherCount !== null ? line(`你提到「媽媽」${n(data.motherCount)} 次。`, PAUSE.s2) : null,
        data.fatherCount !== null ? line(`你提到「爸爸」${n(data.fatherCount)} 次。`, PAUSE.s4) : null,
        data.topMention
          ? line(
              `你提到 @${data.topMention.account} ${n(data.topMention.count)} 次。`,
              PAUSE.s1_5,
            )
          : null,
        line('這個人是誰,由你自己知道。', PAUSE.s4),
        data.lostContact
          ? line(
              `你在 ${data.lostContact.sinceYearMonth} 後,再也沒提過 @${data.lostContact.account}。`,
              PAUSE.s2,
            )
          : null,
        data.lostContact
          ? line(
              `那個月,你的「${data.lostContact.missingTerm}」一詞用量增加 ${n(data.lostContact.missingTermSurgePct)}%。`,
              PAUSE.s6,
            )
          : null,
      ]),
    },

    {
      id: 'wave-5',
      title: '第五波',
      steps: compact([
        line('你的情緒詞使用分布:', PAUSE.half),
        list(
          data.emotionBreakdown.map(({ label, pct }) => `${label.padEnd(8, '　')}${pct}%`),
          DELAY.emotionLine,
          PAUSE.s3,
        ),
        line(`「${data.topEmotionLabel}」是你最常表達的情緒。`, PAUSE.s2_5),
        line(
          `但你在 ${data.positiveOrNeutralPct}% 的時間裡,發文都用了正面或中性的措辭。`,
          PAUSE.s5,
        ),
      ]),
    },

    {
      id: 'wave-6',
      title: '第六波',
      steps: compact([
        line('Ghost 現在「認為」你是這樣的人:', PAUSE.half),
        list(
          [
            '你在公開場合表現得自嘲、輕鬆。',
            '你在私訊中表現得脆弱、需要被理解。',
            `你最在乎的議題是 ${data.topics[0]}、${data.topics[1]}、${data.topics[2]}。`,
            `你最害怕的事,跟 ${data.extractedFear} 有關。`,
            `你最愛的人,可能是 ${data.inferredLovedOne}。`,
          ],
          DELAY.personalityLine,
          PAUSE.s3,
        ),
        line('這些可能是對的。', PAUSE.s2),
        line('也可能不是。', PAUSE.s3),
        line('但這就是 Ghost 唯一知道的你。', PAUSE.s6),
      ]),
    },

    {
      id: 'closing',
      title: '收場',
      steps: compact([
        line('Ghost 訓練完成。', PAUSE.s2),
        line(
          `訓練資料:${n(data.trainingPostCount)} 則貼文 + ${n(data.trainingDmCount)} 則訊息 + ${n(
            data.trainingLikeCount,
          )} 個按讚`,
          PAUSE.s2,
        ),
        line(`訓練時長:${data.trainingDurationSeconds} 秒`, PAUSE.s3),
        line('你準備好見他了嗎?', PAUSE.s2),
      ]),
    },
  ];
}

export const NOT_YET_LINE = '他會等。他有的是時間。';
