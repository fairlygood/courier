// Mock for react-native-fs — web dev environment
// Provides stub implementations that satisfy the plugin's API surface

export const CachesDirectoryPath = '/tmp';

export async function mkdir(_path: string) {}
export async function copyFile(_src: string, _dest: string) {}
export async function stat(_path: string) {
  return { size: 0 };
}
export async function unlink(_path: string) {}

export function downloadFile(_options: any) {
  return {
    promise: Promise.resolve({ statusCode: 200 }),
  };
}

// Default export for require('react-native-fs')
export default {
  CachesDirectoryPath,
  mkdir,
  copyFile,
  stat,
  unlink,
  downloadFile,
};
