// Mock for sn-plugin-lib — web dev environment
// Provides no-op stubs so the plugin UI works in a browser

export const PluginManager = {
  init: () => {},
  registerButton: (_slot: number, _dataTypes: string[], _config: any) => {},
  openPluginView: () => {},
  closePluginView: () => {},
};

export const NativePluginManager = {};

export const FileUtils = {
  listFiles: async (_dir: string): Promise<string[] | null> => null,
};

export const PluginFileAPI = {
  generateNotePng: async (_notePath: string, _page: number, _outputPath: string) => {
    throw new Error('PluginFileAPI.generateNotePng() not available in web dev mode');
  },
};
