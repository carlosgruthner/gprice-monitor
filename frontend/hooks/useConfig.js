import { useState, useEffect } from 'react';

export function useConfig() {
  const [config, setConfig] = useState({ apiIp: '', apiPort: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
      })
      .catch(() => {
        console.error("Erro ao carregar config");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { config, loading };
}