import PaperDashboard from './PaperDashboard';
import { getPapers } from './utils';

export default async function Home() {
  const initialTimeFrame = 'three_days'; // Default value for server-side rendering
  const initialPapers = await getPapers(initialTimeFrame);
  return <PaperDashboard initialPapers={initialPapers} initialTimeFrame={initialTimeFrame} />;
}