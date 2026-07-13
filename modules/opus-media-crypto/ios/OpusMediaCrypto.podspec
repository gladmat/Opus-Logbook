Pod::Spec.new do |s|
  s.name           = 'OpusMediaCrypto'
  s.version        = '1.0.0'
  s.summary        = 'Hardware-accelerated AES-256-GCM file crypto for the encrypted media store'
  s.description    = 'File-to-file AES-256-GCM via CryptoKit, byte-compatible with the JS @noble/ciphers envelope (raw ciphertext in .enc, hex nonce/tag in meta.json). Runs on a background dispatch queue so multi-MB image crypto never blocks the Hermes JS thread, and plaintext never enters the JS heap.'
  s.author         = 'Opus'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
