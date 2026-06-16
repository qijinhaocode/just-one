/**
 * usePB — React hook that subscribes to a PocketBase collection
 * and re-renders on any create/update/delete event.
 *
 * Usage:
 *   const tasks = usePB<Task[]>(() => tasksApi.list('priorityType = "inbox"'), []);
 *
 * The second argument is a dependency array: when any value changes,
 * the subscription is re-established with the new filter.
 */

import { useState, useEffect, useRef, useCallback, DependencyList } from 'react';
import { pb } from '../services/pb';

type Fetcher<T> = () => Promise<T>;

interface UsePBResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePB<T>(
  fetcher: Fetcher<T>,
  deps: DependencyList,
  collection?: string,  // if provided, subscribe to realtime events
): UsePBResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!collection) return;
    let cancelled = false;
    pb.collection(collection).subscribe('*', () => {
      if (!cancelled) fetch();
    });
    return () => {
      cancelled = true;
      pb.collection(collection).unsubscribe('*');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, fetch]);

  return { data, loading, error, refetch: fetch };
}
