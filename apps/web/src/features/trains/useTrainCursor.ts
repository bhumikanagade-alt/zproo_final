import { useEffect } from 'react';

/** Shows the pointer (mouse hand) cursor on every clickable element of the train pages. */
export function useTrainCursor() {
  useEffect(() => {
    document.documentElement.classList.add('train-cursor');
    return () => document.documentElement.classList.remove('train-cursor');
  }, []);
}
