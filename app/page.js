import PaperDashboard from './PaperDashboard';
import { getPapers } from './utils';

export default async function Home() {
  const initialTimeFrame = 'three_days';
  const { papers: initialPapers, total: initialTotal } = await getPapers(initialTimeFrame);
  return (
    <PaperDashboard
      initialPapers={initialPapers}
      initialTotal={initialTotal}
      initialTimeFrame={initialTimeFrame}
    />
  );
}
