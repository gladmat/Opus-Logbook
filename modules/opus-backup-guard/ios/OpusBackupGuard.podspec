Pod::Spec.new do |s|
  s.name           = 'OpusBackupGuard'
  s.version        = '1.0.0'
  s.summary        = 'Excludes PHI-bearing directories from iCloud backup'
  s.description    = 'Sets NSURLIsExcludedFromBackupKey on the encrypted media, AsyncStorage, and MMKV directories. Their contents are AEAD-encrypted under a WHEN_UNLOCKED_THIS_DEVICE_ONLY Keychain key that never survives a backup restore, so backing them up provides zero recovery value while exposing ciphertext + plaintext metadata to iCloud.'
  s.author         = 'Opus'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
