package expo.modules.opusmediacrypto

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.URI
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

private const val NONCE_LENGTH = 12
private const val TAG_LENGTH = 16
private const val DEK_LENGTH = 32

/**
 * Hardware-accelerated AES-256-GCM file crypto for the encrypted media store.
 *
 * Byte-compatible with the JS `@noble/ciphers` envelope (and the iOS
 * CryptoKit twin): the `.enc` file holds RAW ciphertext (tag NOT appended);
 * the 12-byte nonce and 16-byte tag travel as lowercase hex in `meta.json`.
 * `javax.crypto`'s `doFinal` emits `ciphertext || tag`, so encrypt splits the
 * last 16 bytes off before writing and decrypt re-appends them before
 * `doFinal` — this split is what keeps the on-disk format identical across
 * all three implementations.
 *
 * `AsyncFunction` bodies run on the module's background dispatcher, so
 * multi-MB crypto never blocks the JS thread, and plaintext never enters the
 * JS heap (file-to-file only).
 */
class OpusMediaCryptoModule : Module() {
  private val secureRandom by lazy { SecureRandom() }

  override fun definition() = ModuleDefinition {
    Name("OpusMediaCrypto")

    AsyncFunction("encryptFile") { srcPath: String, dstPath: String, dek: ByteArray ->
      if (dek.size != DEK_LENGTH) {
        throw InvalidDekException(dek.size)
      }
      val plain = fileFor(srcPath).readBytes()
      val nonce = ByteArray(NONCE_LENGTH).also { secureRandom.nextBytes(it) }
      val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
        init(
          Cipher.ENCRYPT_MODE,
          SecretKeySpec(dek, "AES"),
          GCMParameterSpec(TAG_LENGTH * 8, nonce),
        )
      }
      val ciphertextWithTag = cipher.doFinal(plain)
      // doFinal output is ciphertext||tag — write RAW ciphertext only; the
      // tag is returned separately, matching the shared on-disk envelope.
      val ciphertextSize = ciphertextWithTag.size - TAG_LENGTH
      val dstFile = fileFor(dstPath)
      dstFile.parentFile?.mkdirs()
      dstFile.outputStream().use { it.write(ciphertextWithTag, 0, ciphertextSize) }
      mapOf(
        "nonceHex" to nonce.toLowercaseHex(),
        "tagHex" to ciphertextWithTag.toLowercaseHex(ciphertextSize, TAG_LENGTH),
        "sourceSize" to plain.size,
        "ciphertextSize" to ciphertextSize,
      )
    }

    AsyncFunction("decryptFile") { srcPath: String, dstPath: String, dek: ByteArray, nonceHex: String, tagHex: String ->
      if (dek.size != DEK_LENGTH) {
        throw InvalidDekException(dek.size)
      }
      val nonce = hexToBytes(nonceHex)
      val tag = hexToBytes(tagHex)
      if (nonce == null || nonce.size != NONCE_LENGTH || tag == null || tag.size != TAG_LENGTH) {
        throw InvalidEnvelopeException()
      }
      val ciphertext = fileFor(srcPath).readBytes()
      val plain = try {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
          init(
            Cipher.DECRYPT_MODE,
            SecretKeySpec(dek, "AES"),
            GCMParameterSpec(TAG_LENGTH * 8, nonce),
          )
        }
        // Re-append the tag: doFinal authenticates ciphertext||tag and
        // throws AEADBadTagException on any mismatch.
        cipher.doFinal(ciphertext + tag)
      } catch (e: Exception) {
        throw AuthenticationFailedException()
      }
      val dstFile = fileFor(dstPath)
      dstFile.parentFile?.mkdirs()
      dstFile.outputStream().use { it.write(plain) }
    }
  }

  /**
   * Accepts both `file://…` URIs (what expo-file-system `File.uri` yields,
   * possibly percent-encoded) and plain filesystem paths.
   */
  private fun fileFor(pathOrUri: String): File {
    if (pathOrUri.startsWith("file://")) {
      return File(URI(pathOrUri))
    }
    return File(pathOrUri)
  }

  private fun ByteArray.toLowercaseHex(offset: Int = 0, length: Int = size - offset): String {
    val builder = StringBuilder(length * 2)
    for (i in offset until offset + length) {
      builder.append("%02x".format(this[i]))
    }
    return builder.toString()
  }

  private fun hexToBytes(hex: String): ByteArray? {
    if (hex.length % 2 != 0) return null
    val bytes = ByteArray(hex.length / 2)
    for (i in bytes.indices) {
      val byte = hex.substring(i * 2, i * 2 + 2).toIntOrNull(16) ?: return null
      bytes[i] = byte.toByte()
    }
    return bytes
  }
}

internal class InvalidDekException(size: Int) :
  CodedException("AES-256-GCM key must be 32 bytes, got $size")

internal class InvalidEnvelopeException :
  CodedException("Invalid AES-GCM nonce or tag")

internal class AuthenticationFailedException :
  CodedException("Decryption failed — wrong key or tampered data")
