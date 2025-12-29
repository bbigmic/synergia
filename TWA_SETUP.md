# Konfiguracja TWA (Trusted Web Activity)

Aplikacja została przygotowana do publikacji jako TWA w Google Play Store.

## Co zostało zrobione:

1. ✅ Wygenerowano ikony w różnych rozmiarach (48x48, 72x72, 96x96, 144x144, 192x192, 512x512)
2. ✅ Utworzono `manifest.json` z konfiguracją PWA
3. ✅ Zaktualizowano `layout.tsx` z odpowiednimi meta tagami
4. ✅ Utworzono szablon `assetlinks.json`

## Następne kroki:

### 1. Konfiguracja assetlinks.json

Plik `.well-known/assetlinks.json` musi być dostępny pod adresem:
`https://synergia-ai.vercel.app/.well-known/assetlinks.json`

**Ważne:** Musisz zaktualizować plik `public/.well-known/assetlinks.json` z rzeczywistymi danymi:

- `package_name`: Nazwa pakietu Twojej aplikacji Android (np. `com.synergia.app`)
- `sha256_cert_fingerprints`: SHA-256 fingerprint z certyfikatu podpisywania aplikacji Android

Aby uzyskać SHA-256 fingerprint:
```bash
# Dla debug keystore:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Dla release keystore:
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

### 2. Konfiguracja na Vercel

Upewnij się, że plik `.well-known/assetlinks.json` jest dostępny publicznie. Vercel powinien automatycznie serwować pliki z folderu `public/.well-known/`.

Możesz przetestować dostępność:
```bash
curl https://synergia-ai.vercel.app/.well-known/assetlinks.json
```

### 3. Weryfikacja assetlinks.json

Użyj narzędzia Google do weryfikacji:
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://synergia-ai.vercel.app&relation=delegate_permission/common.handle_all_urls

### 4. Tworzenie aplikacji Android

Użyj narzędzia [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) lub [PWA Builder](https://www.pwabuilder.com/) do wygenerowania aplikacji Android z TWA.

Przykład z Bubblewrap:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://synergia-ai.vercel.app/manifest.json
bubblewrap build
```

### 5. Publikacja w Google Play Store

Po zbudowaniu aplikacji Android:
1. Podpisz aplikację certyfikatem release
2. Uzyskaj SHA-256 fingerprint z certyfikatu
3. Zaktualizuj `assetlinks.json` z fingerprint
4. Wdróż zaktualizowany `assetlinks.json` na Vercel
5. Zweryfikuj, że `assetlinks.json` jest dostępny i poprawny
6. Prześlij aplikację do Google Play Console

## Przydatne linki:

- [TWA Documentation](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)

## Regenerowanie ikon

Jeśli chcesz wygenerować ikony ponownie:
```bash
node scripts/generate-icons.js
```

