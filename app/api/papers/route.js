import { NextResponse } from 'next/server';
import { getPapers } from '../../utils';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timeFrame = searchParams.get('timeFrame');
  const papers = await getPapers(timeFrame);
  return NextResponse.json(papers);
}