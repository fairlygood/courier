import { AppRegistry, Image } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PluginManager } from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

let pendingButtonId: number | null = null;

PluginManager.registerButtonListener({
  onButtonPress: (event: { id: number }) => {
    pendingButtonId = event.id;
  },
});

export function checkPendingButton(): number | null {
  const id = pendingButtonId;
  pendingButtonId = null;
  return id;
}

PluginManager.registerButton(1, ['NOTE'], {
  id: 100,
  name: 'Courier Dashboard',
  icon: Image.resolveAssetSource(
    require('./assets/icon.png'),
  ).uri,
  showType: 1,
});

PluginManager.registerButton(1, ['NOTE'], {
  id: 200,
  name: 'Send to Courier',
  icon: Image.resolveAssetSource(
    require('./assets/icon.png'),
  ).uri,
  showType: 1,
});
