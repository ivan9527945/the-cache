// 第二層:無狀態後端。出自 docs/03-privacy-architecture.md。
//
// 這個 handler 唯一的職責是把瀏覽器組好的 features + messages 轉發給 Anthropic。
//   - 沒有資料庫、Redis、檔案儲存
//   - 不記 request body
//   - 不記使用者識別資訊
//   - dynamic = 'force-dynamic',Next 不會 cache 任何回應
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ghost } from '../../../../src/ghost';
import type { ChatMessage, UserFeatures } from '../../../../src/ghost';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  features: UserFeatures;
  messages: ChatMessage[];
}

function safeError(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!body.features || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'missing features or messages' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'server missing ANTHROPIC_API_KEY' },
      { status: 500 },
    );
  }

  try {
    const ghost = new Ghost({ features: body.features, apiKey });
    const reply = await ghost.chat(body.messages);
    return NextResponse.json(reply, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 502 });
  }
}
