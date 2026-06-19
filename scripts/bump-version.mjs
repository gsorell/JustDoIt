// Bumps the build identifiers that the app stores require to be unique on every
// upload: iOS buildNumber and Android versionCode. Run before each release build.
//   node scripts/bump-version.mjs
//
// Updates app.json (the source of truth) and syncs the local Android Gradle
// project (android/app/build.gradle) used by local `gradlew bundleRelease`.
// Does NOT change the user-facing version (expo.version / versionName) — bump
// that by hand when you ship a real new version (e.g. 1.0.0 -> 1.0.1).
import fs from 'fs';

const APP_JSON = 'app.json';
const GRADLE = 'android/app/build.gradle';

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
app.expo.ios ??= {};
app.expo.android ??= {};

const newBuildNumber = String((parseInt(app.expo.ios.buildNumber ?? '0', 10) || 0) + 1);
const newVersionCode = (parseInt(app.expo.android.versionCode ?? 0, 10) || 0) + 1;

app.expo.ios.buildNumber = newBuildNumber;
app.expo.android.versionCode = newVersionCode;
fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n');

if (fs.existsSync(GRADLE)) {
  let g = fs.readFileSync(GRADLE, 'utf8');
  g = g.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
  fs.writeFileSync(GRADLE, g);
}

console.log(`iOS buildNumber -> ${newBuildNumber}`);
console.log(`Android versionCode -> ${newVersionCode}`);
console.log('(expo.version / versionName unchanged — bump manually for a new public version)');
