# ReNu-Biome — Android Release Signing Keystore Credentials

> **CRITICAL PRODUCTION ASSET**: Keep this file and `release.keystore` secure. Do not share credentials publicly.

---

### Keystore Specifications

| Attribute | Value |
| :--- | :--- |
| **Keystore File** | `mobile/android/app/release.keystore` |
| **Backup Path** | `playstore_assets/release.keystore` |
| **Format** | PKCS#12 (Standard Java & Android Keystore) |
| **Key Algorithm** | RSA 2048-bit |
| **Keystore Password** | `ReNuBiome2026PlayStoreKey!` |
| **Key Alias** | `renubiome` |
| **Key Password** | `ReNuBiome2026PlayStoreKey!` |
| **Validity** | 10,000 Days (~27.4 years, expires in 2054) |
| **Certificate Issuer** | `CN=ReNu Biome, OU=Operations, O=ReNu Biome Inc, C=US` |

---

### Certificate Fingerprints (Google Play App Signing & API Integration)

| Algorithm | Fingerprint |
| :--- | :--- |
| **SHA-1** | `43:99:A0:DC:9A:8B:60:D7:02:B6:59:42:A7:A2:1E:B9:D2:37:5B:E1` |
| **SHA-256** | `59:01:9A:41:54:FB:DE:F4:E4:DD:14:DF:5A:D4:19:30:3E:E4:74:74:B1:02:3D:C3:80:17:CE:A5:EF:3C:36:BF` |
| **MD5** | `7F:8A:69:9C:FD:2E:71:4B:E2:AC:09:FF:08:61:8F:09` |

Use the **SHA-256** and **SHA-1** fingerprints above when registering your Android app with Google Cloud Console, Google Play App Signing, or Firebase / Maps APIs.
