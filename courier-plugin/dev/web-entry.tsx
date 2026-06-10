// Pre-load native module mocks and expose a synchronous require() shim.
// The plugin code uses lazy require('react-native-fs') etc. at runtime,
// which doesn't work in Vite's ESM environment.
import * as _RNFS from './mocks/react-native-fs';
import * as _SQLite from './mocks/react-native-sqlite-storage';
import * as _SN from './mocks/sn-plugin-lib';

const mocks: Record<string, any> = {
  'react-native-fs': { ..._RNFS, default: _RNFS },
  'react-native-sqlite-storage': { ..._SQLite, default: _SQLite },
  'sn-plugin-lib': { ..._SN },
};

(globalThis as any).require = (name: string) => {
  if (name in mocks) return mocks[name];
  throw new Error(`require('${name}') not available in web dev mode`);
};

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found in HTML');

const root = createRoot(rootEl);
root.render(<App />);
