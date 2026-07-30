Pod::Spec.new do |s|
  s.name           = 'OpusImageEnhance'
  s.version        = '1.0.0'
  s.summary        = 'Perspective correction + tone normalisation for photographed radiology images'
  s.description    = 'Vision rectangle detection (monitor/lightbox quad) and Core Image enhancement (CIPerspectiveCorrection, grayscale, histogram-stretch auto-levels) for photos of X-rays/CTs taken off a monitor. File-to-file on the module background queue so multi-MB renders never block the Hermes JS thread.'
  s.author         = 'Opus'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
