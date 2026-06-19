# Deploying Cadence

Release runbook for iOS (TestFlight / App Store) and Android (Google Play).

## One-time setup (already done)

- **EAS**: logged in as `gsorell`; GitHub repo `gsorell/JustDoIt` connected to the `cadence` project.
- **iOS credentials**: distribution cert + provisioning profile live on EAS servers. The **App Store Connect API key** is at `credentials/asc-api-key.p8` (git-ignored) and referenced in `eas.json` (`ascApiKeyId` `US949CQ2FH`, issuer `34b53089-…`) — enables non-interactive builds/submits (no Apple 2FA).
- **Android upload keystore**: `credentials/cadence-upload-key.jks` (git-ignored). alias `cadence`, store/key password `cadence2026`. **Back this up** — Play ties the app to it forever. The release `signingConfig` lives in `android/app/build.gradle`.
- **Local Android build env**: `JAVA_HOME` = Android Studio JBR, `ANDROID_HOME` = Android SDK.
- **Privacy policy**: `public/privacy.html` → https://chunkitdoit.netlify.app/privacy.html (Netlify auto-deploys on push to `master`).

## Every release — do this in order

### 1. Bump build identifiers (REQUIRED)
The stores reject re-using a build number / version code. Always bump first:

```
node scripts/bump-version.mjs
```

This increments `ios.buildNumber` and `android.versionCode` in `app.json` and syncs `android/app/build.gradle`. For a user-facing version change, also bump `expo.version` (and it flows to `versionName`) by hand, e.g. `1.0.0` → `1.0.1`.

### 2. Commit & push
```
git add -A && git commit -m "Release <version> (build <n>)" && git push
```
(EAS builds iOS from the pushed git state.)

### 3. iOS → TestFlight (cloud, hands-off)
```
eas build --platform ios --profile production --auto-submit --non-interactive
```
Uses the ASC API key, so no Apple login. Wait ~5–10 min for Apple processing, then the build appears in **App Store Connect → TestFlight**.

### 4. Android → Google Play (local build, manual upload)
```
cd android
./gradlew.bat bundleRelease    # gradlew on macOS/Linux
```
Signed bundle: `android/app/build/outputs/bundle/release/app-release.aab`.
Upload in **Play Console → Test and release → (Internal/Closed/Production) → Create release**.

## Gotchas (already handled — keep them this way)

- **No seed/test data ships.** `seedIfNeeded` / backfill / demo-notification are gated behind `__DEV__` in `src/context/AppContext.tsx`. Don't remove the gate; real users must start with an empty app.
- **App icon must have NO alpha channel** (Apple ITMS-90717). `scripts/gen-icons.mjs` flattens + removes alpha on the opaque iOS/PWA icons (Android adaptive foreground keeps alpha). Re-run it if you change the source mark, then rebuild.
- **iOS push entitlement is stripped.** `plugins/withoutApsEnvironment.js` removes `aps-environment` because Cadence is local-notifications-only; otherwise the build fails against a push-free provisioning profile.
- **`android/` is git-ignored.** The release `signingConfig` and `versionCode` live there. If you ever run `expo prebuild --clean`, you must re-add the release `signingConfig` (pointing at `credentials/cadence-upload-key.jks`) and re-apply the `versionCode`.
