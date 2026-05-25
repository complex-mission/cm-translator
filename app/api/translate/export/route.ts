import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';
  const ids = searchParams.get('ids')?.split(',').map(BigInt);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const where: any = { userId: user.id };
  if (ids && ids.length > 0) where.id = { in: ids };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
  }

  const records = await db.translation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      sourceLang: true,
      targetLang: true,
      sourceText: true,
      translatedText: true,
      mode: true,
      createdAt: true,
    },
  });

  if (format === 'csv') {
    const header = 'Source Language,Target Language,Source Text,Translation,Mode,Date';
    const rows = records.map((r: { sourceLang: string; targetLang: string; sourceText: string | null; translatedText: string | null; mode: string; createdAt: Date }) =>
      [r.sourceLang, r.targetLang, `"${(r.sourceText || '').replace(/"/g, '""')}"`, `"${(r.translatedText || '').replace(/"/g, '""')}"`, r.mode, r.createdAt.toISOString()].join(',')
    );
    return new NextResponse([header, ...rows].join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=translations.csv' },
    });
  }

  if (format === 'markdown') {
    let md = '# Translation History\n\n';
    md += '| Source | Target | Source Text | Translation | Date |\n';
    md += '|--------|--------|-------------|-------------|------|\n';
    for (const r of records) {
      md += `| ${r.sourceLang} | ${r.targetLang} | ${(r.sourceText || '').slice(0, 50)} | ${(r.translatedText || '').slice(0, 50)} | ${r.createdAt.toISOString()} |\n`;
    }
    return new NextResponse(md, {
      headers: { 'Content-Type': 'text/markdown', 'Content-Disposition': 'attachment; filename=translations.md' },
    });
  }

  // JSON
  return NextResponse.json({ records });
}
