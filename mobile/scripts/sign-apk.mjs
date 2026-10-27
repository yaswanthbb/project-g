import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  throw new Error(
    "Usage: node scripts/sign-apk.mjs <input.apk> <output.apk> (paths relative to mobile)",
  );
}
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error("Set ANDROID_HOME to the installed Android SDK.");
const buildTools = join(sdk, "build-tools");
const version = readdirSync(buildTools)
  .filter((entry) => existsSync(join(buildTools, entry, "apksigner")))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .at(-1);
if (!version)
  throw new Error("Install Android SDK build-tools before signing.");
const config = JSON.parse(readFileSync(join(root, "credentials.json"), "utf8"));
const key = config.android.keystore;
const keystore = isAbsolute(key.keystorePath)
  ? key.keystorePath
  : resolve(root, key.keystorePath);
if (!existsSync(keystore))
  throw new Error(
    "The saved Android signing key is missing. Restore its backup; do not replace it for an update.",
  );
const source = resolve(root, input);
const destination = resolve(root, output);
if (source === destination)
  throw new Error("Use a separate output file for the signed APK.");
if (!existsSync(source))
  throw new Error("Build the release APK before signing.");
mkdirSync(dirname(destination), { recursive: true });
const signer = join(buildTools, version, "apksigner");
const environment = {
  ...process.env,
  PATH: process.env.JAVA_HOME
    ? `${join(process.env.JAVA_HOME, "bin")}${delimiter}${process.env.PATH || ""}`
    : process.env.PATH,
  PROJECT_G_STORE_PASSWORD: key.keystorePassword,
  PROJECT_G_KEY_PASSWORD: key.keyPassword,
};
function run(args) {
  const result = spawnSync(signer, args, {
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run([
  "sign",
  "--ks",
  keystore,
  "--ks-key-alias",
  key.keyAlias,
  "--ks-pass",
  "env:PROJECT_G_STORE_PASSWORD",
  "--key-pass",
  "env:PROJECT_G_KEY_PASSWORD",
  "--out",
  destination,
  source,
]);
run(["verify", "--verbose", "--print-certs", destination]);
console.log(`Signed APK: ${destination}`);
