jest.mock("./src/push",()=>({connectPush:jest.fn().mockResolvedValue(()=>{})}));
jest.mock("expo-secure-store",()=>({getItemAsync:jest.fn().mockResolvedValue(null),setItemAsync:jest.fn().mockResolvedValue(undefined),deleteItemAsync:jest.fn().mockResolvedValue(undefined)}));
jest.mock("expo-clipboard",()=>({setStringAsync:jest.fn().mockResolvedValue(true)}));
jest.mock("expo-crypto",()=>({randomUUID:()=>"00000000-0000-4000-8000-000000000001"}));
jest.mock("@react-native-community/datetimepicker",()=>"DateTimePicker");
jest.mock("react-native-safe-area-context",()=>require("react-native-safe-area-context/jest/mock").default);
jest.mock("@react-native-picker/picker",()=>{const React=require("react");const {View,Text}=require("react-native");const Picker=props=>React.createElement(View,props,props.children);Picker.Item=({label})=>React.createElement(Text,null,label);return {Picker};});
