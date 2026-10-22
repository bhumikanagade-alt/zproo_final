import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Lazy routes (the home page pulls in the search forms) can take over a second to load in jsdom.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});

// jsdom does not implement these browser APIs used by layout code.
if (typeof window !== 'undefined') window.scrollTo = () => {};
