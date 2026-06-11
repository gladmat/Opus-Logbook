import ExpoModulesCore

/// Marks PHI-bearing directories as excluded from iCloud / iTunes backup.
///
/// Rationale: every file under these directories is either AEAD ciphertext
/// (XChaCha20-Poly1305 / AES-256-GCM) keyed by the master key, which lives in
/// the Keychain with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` and therefore NEVER
/// survives a restore-from-backup — or plaintext shape metadata (`meta.json`)
/// alongside that ciphertext. Backing these up provides zero recovery value
/// while shipping ciphertext + metadata to iCloud. Exclusion is strictly
/// safer and loses nothing.
///
/// Exclusion is applied to the directory URL itself; iOS backup honours the
/// flag for the whole subtree, and the flag persists until the item is
/// deleted, so calling this once per boot keeps newly-created parents covered.
public class OpusBackupGuardModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OpusBackupGuard")

    AsyncFunction("excludePhiPathsFromBackup") { () -> [String: Int] in
      var excluded = 0
      var missing = 0
      var failed = 0

      for url in Self.phiDirectoryCandidates() {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory) else {
          missing += 1
          continue
        }
        do {
          var mutableUrl = url
          var values = URLResourceValues()
          values.isExcludedFromBackup = true
          try mutableUrl.setResourceValues(values)
          excluded += 1
        } catch {
          failed += 1
        }
      }

      return ["excluded": excluded, "missing": missing, "failed": failed]
    }
  }

  private static func phiDirectoryCandidates() -> [URL] {
    let fm = FileManager.default
    var candidates: [URL] = []

    if let documents = fm.urls(for: .documentDirectory, in: .userDomainMask).first {
      // Encrypted media store: image.enc / thumb.enc / plaintext meta.json.
      candidates.append(documents.appendingPathComponent("opus-media", isDirectory: true))
      // react-native-mmkv default root (encrypted Opus Inbox storage).
      candidates.append(documents.appendingPathComponent("mmkv", isDirectory: true))
      // Legacy AsyncStorage location (pre-Application Support versions).
      candidates.append(documents.appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true))
    }

    if let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
      // @react-native-async-storage/async-storage v2 location:
      // Application Support/<bundle id>/RCTAsyncLocalStorage_V1
      let bundleId = Bundle.main.bundleIdentifier ?? ""
      let scoped = appSupport.appendingPathComponent(bundleId, isDirectory: true)
      candidates.append(scoped.appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true))
      candidates.append(scoped.appendingPathComponent("RCTStorage", isDirectory: true))
    }

    return candidates
  }
}
