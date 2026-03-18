import { NextResponse } from 'next/server';
import { getPapers } from '../../utils';

export const revalidate = 300; // Cache each unique URL for 5 minutes

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const timeFrame = searchParams.get('timeFrame');
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const papers = await getPapers(timeFrame, offset);
  return NextResponse.json(papers);
}