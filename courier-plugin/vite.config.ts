import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'dev'),
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'sn-plugin-lib': path.resolve(__dirname, 'dev/mocks/sn-plugin-lib'),
      'react-native-fs': path.resolve(__dirname, 'dev/mocks/react-native-fs'),
      'react-native-sqlite-storage': path.resolve(__dirname, 'dev/mocks/react-native-sqlite-storage'),
      'react-native-svg': path.resolve(__dirname, 'dev/mocks/react-native-svg'),
    },
  },
  server: {
    port: 8080,
  },
  publicDir: path.resolve(__dirname, 'assets'),
});
