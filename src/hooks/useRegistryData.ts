import { useEffect, useState } from 'react';
import { registryRequest } from '../lib/asset-library';

/** Key the result to its request so old data cannot flash after navigation or a retry. */
export function useRegistryData<T>(
  action: string,
  parameters: Record<string, string> = {},
  authenticated = false,
) {
  const serialised = JSON.stringify(parameters);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([action, serialised, authenticated, version]);
  const [state, setState] = useState<{ key: string; data: T | null; error: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void registryRequest<T>(action, {
      query: JSON.parse(serialised),
      authenticated,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: '' });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error: e instanceof Error ? e.message : 'Registry request failed.',
          });
      });
    return () => controller.abort();
  }, [action, serialised, authenticated, key]);
  return {
    data: state?.key === key ? state.data : null,
    error: state?.key === key ? state.error : '',
    loading: state?.key !== key,
    reload: () => setVersion((v) => v + 1),
  };
}
