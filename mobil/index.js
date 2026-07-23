import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent AppRegistry.registerComponent('main', ...) chaqiradi —
// shu bo'lmasa "App entry not found" xatosi chiqadi.
registerRootComponent(App);
