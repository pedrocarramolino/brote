import { useEffect, useState } from 'react';
import { getProvider, type AIProvider, type AIStatus } from '../services/ai';

export function useAI() {
  const [state, setState] = useState<{ provider: AIProvider | null; status: AIStatus | null }>({ provider: null, status: null });
  useEffect(() => {
    let alive = true;
    getProvider().then((r) => alive && setState(r));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
