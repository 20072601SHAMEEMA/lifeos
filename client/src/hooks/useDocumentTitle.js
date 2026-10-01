import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · LifeOS` : 'LifeOS — Personal Safety Dashboard';
  }, [title]);
}
