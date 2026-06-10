import { NativeModules } from 'react-native';

let loaded = false;

export async function loadCustomFonts(): Promise<void> {
  if (loaded) return;
  loaded = true;

  try {
    const RNFS = require('react-native-fs');
    const { NativePluginManager } = require('sn-plugin-lib');

    const pluginDir = (await NativePluginManager.getPluginDirPath()) || '';
    const fontPath = `${pluginDir}/fonts/MomoSignature-Regular.ttf`;

    const exists = await RNFS.exists(fontPath);
    if (!exists) {
      console.log('Font file not found at:', fontPath);
      return;
    }

    const { FontLoaderModule } = NativeModules;
    if (!FontLoaderModule) {
      console.log('FontLoaderModule native module not available');
      return;
    }

    await FontLoaderModule.loadFont('MomoSignature-Regular', fontPath);
    console.log('Custom font loaded successfully');
  } catch (err: any) {
    console.log('Font loading skipped (web/dev mode):', err.message || String(err));
  }
}
