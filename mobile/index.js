import { registerRootComponent } from "expo";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import App from "./App";
// Notification payloads are displayed by Android in the background. Do not display a duplicate.
setBackgroundMessageHandler(getMessaging(getApp()), async () => {});
registerRootComponent(App);
