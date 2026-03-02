import React, { useEffect, useState } from 'react';
import { ContributionData } from './types';
import { fetchContributions } from './services/githubService';
import GameCanvas from './components/GameCanvas';

function getUsernameFromURL(): string {
  // Try pathname first: /username
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (pathname) return pathname;

  // Fall back to query param: ?username=xxx
  const params = new URLSearchParams(window.location.search);
  return params.get('username') || 'prayag78';
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ContributionData | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const username = getUsernameFromURL();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchContributions(username);
        setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const handleRestart = () => {
    setGameKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      {loading ? (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-gray-400 font-mono">Loading {username}'s contributions...</p>
        </div>
      ) : data ? (
        <GameCanvas key={gameKey} data={data} onRestart={handleRestart} />
      ) : (
        <div className="text-center text-gray-400 font-mono">
          <p className="text-xl mb-2">🚀 GitHub Contribution Rocket</p>
          <p className="text-sm">Failed to load contributions</p>
        </div>
      )}
    </div>
  );
};

export default App;