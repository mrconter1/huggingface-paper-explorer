import PaperDashboard from './PaperDashboard';
import { getPapers } from './utils';

export default async function Home() {
  const initialPapers = await getPapers('today');
  return <PaperDashboard initialPapers={initialPapers} />;
}