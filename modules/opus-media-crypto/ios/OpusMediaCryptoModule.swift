import CryptoKit
import ExpoModulesCore

/// Hardware-accelerated AES-256-GCM file crypto for the encrypted media store.
///
/// Byte-compatible with the JS `@noble/ciphers` envelope: the `.enc` file holds
/// RAW ciphertext (tag NOT appended); the 12-byte nonce and 16-byte tag travel
/// as lowercase hex in `meta.json`. CryptoKit's `SealedBox` keeps ciphertext
/// and tag separate, so no reassembly or migration is needed in either
/// direction — files written by one implementation decrypt under the other.
///
/// `AsyncFunction` bodies run on the module's background dispatch queue, so
/// multi-MB crypto never blocks the Hermes JS thread, and plaintext never
/// enters the JS heap (file-to-file only).
public class OpusMediaCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OpusMediaCrypto")

    AsyncFunction("encryptFile") { (srcPath: String, dstPath: String, dek: Data) -> [String: Any] in
      guard dek.count == 32 else {
        throw InvalidDekException(dek.count)
      }
      let plain = try Data(contentsOf: Self.fileUrl(srcPath))
      let nonce = AES.GCM.Nonce() // 12 bytes, CryptoKit default
      let sealed = try AES.GCM.seal(plain, using: SymmetricKey(data: dek), nonce: nonce)
      let dstUrl = Self.fileUrl(dstPath)
      try Self.ensureParentDirectory(dstUrl)
      // RAW ciphertext only — the tag is returned separately, matching the
      // on-disk envelope shared with the JS implementation.
      try sealed.ciphertext.write(to: dstUrl, options: .atomic)
      return [
        "nonceHex": Data(nonce).lowercaseHex,
        "tagHex": sealed.tag.lowercaseHex,
        "sourceSize": plain.count,
        "ciphertextSize": sealed.ciphertext.count,
      ]
    }

    AsyncFunction("decryptFile") { (srcPath: String, dstPath: String, dek: Data, nonceHex: String, tagHex: String) in
      guard dek.count == 32 else {
        throw InvalidDekException(dek.count)
      }
      guard let nonceData = Data(hex: nonceHex), nonceData.count == 12,
            let tagData = Data(hex: tagHex), tagData.count == 16
      else {
        throw InvalidEnvelopeException()
      }
      let ciphertext = try Data(contentsOf: Self.fileUrl(srcPath))
      let plain: Data
      do {
        let box = try AES.GCM.SealedBox(
          nonce: AES.GCM.Nonce(data: nonceData),
          ciphertext: ciphertext,
          tag: tagData
        )
        plain = try AES.GCM.open(box, using: SymmetricKey(data: dek))
      } catch {
        throw AuthenticationFailedException()
      }
      let dstUrl = Self.fileUrl(dstPath)
      try Self.ensureParentDirectory(dstUrl)
      try plain.write(to: dstUrl, options: .atomic)
    }
  }

  /// Accepts both `file://…` URIs (what expo-file-system `File.uri` yields)
  /// and plain filesystem paths.
  private static func fileUrl(_ pathOrUri: String) -> URL {
    if pathOrUri.hasPrefix("file://"), let url = URL(string: pathOrUri) {
      return url
    }
    return URL(fileURLWithPath: pathOrUri)
  }

  private static func ensureParentDirectory(_ url: URL) throws {
    let parent = url.deletingLastPathComponent()
    try FileManager.default.createDirectory(
      at: parent,
      withIntermediateDirectories: true
    )
  }
}

internal final class InvalidDekException: GenericException<Int> {
  override var reason: String {
    "AES-256-GCM key must be 32 bytes, got \(param)"
  }
}

internal final class InvalidEnvelopeException: Exception {
  override var reason: String {
    "Invalid AES-GCM nonce or tag"
  }
}

internal final class AuthenticationFailedException: Exception {
  override var reason: String {
    "Decryption failed — wrong key or tampered data"
  }
}

private extension Data {
  var lowercaseHex: String {
    map { String(format: "%02x", $0) }.joined()
  }

  init?(hex: String) {
    guard hex.count % 2 == 0 else { return nil }
    var bytes = [UInt8]()
    bytes.reserveCapacity(hex.count / 2)
    var index = hex.startIndex
    while index < hex.endIndex {
      let next = hex.index(index, offsetBy: 2)
      guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }
      bytes.append(byte)
      index = next
    }
    self.init(bytes)
  }
}
