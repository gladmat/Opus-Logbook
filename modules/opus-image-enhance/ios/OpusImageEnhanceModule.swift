import CoreImage
import ExpoModulesCore
import Vision

/// Perspective correction + tone normalisation for photographed radiology
/// images (X-rays/CTs shot off a monitor or lightbox).
///
/// Two functions, both file-to-file:
/// - `detectRectangle` finds the dominant screen-like quad via Vision and
///   returns normalized corners in TOP-LEFT-origin coordinates (the Vision
///   lower-left → top-left y-flip happens here so JS never handles
///   coordinate systems).
/// - `enhanceImage` applies CIPerspectiveCorrection (when a quad is given),
///   optional grayscale, and histogram-percentile auto-levels, then writes
///   a JPEG.
///
/// `AsyncFunction` bodies run on the module's background dispatch queue, so
/// multi-MP Core Image renders never block the Hermes JS thread.
public class OpusImageEnhanceModule: Module {
  /// Long-edge cap applied before rendering — keeps peak memory bounded for
  /// 48MP camera sources while staying far above radiograph display needs.
  private static let maxLongEdge: CGFloat = 4032

  public func definition() -> ModuleDefinition {
    Name("OpusImageEnhance")

    AsyncFunction("detectRectangle") { (srcPath: String) -> [String: Any] in
      let image = try Self.loadOrientedImage(srcPath)

      let request = VNDetectRectanglesRequest()
      // Monitors span ~4:3 to ultrawide; under perspective distortion the
      // projected aspect ratio varies further, so accept 0.3–1.0
      // (shorter/longer edge). The quad must fill a meaningful part of the
      // frame — small rectangles are UI chrome / reflections, not the screen.
      request.minimumAspectRatio = 0.3
      request.maximumAspectRatio = 1.0
      request.quadratureTolerance = 20
      request.minimumSize = 0.35
      request.minimumConfidence = 0.6
      request.maximumObservations = 3

      let handler = VNImageRequestHandler(ciImage: image)
      try handler.perform([request])

      let best = (request.results ?? []).max { a, b in
        Double(a.confidence) * Self.quadArea(a) < Double(b.confidence) * Self.quadArea(b)
      }

      guard let rect = best else {
        return ["found": false]
      }

      // Vision coordinates are normalized with a LOWER-LEFT origin; flip to
      // top-left origin. The corner names stay visually correct.
      func flip(_ p: CGPoint) -> [String: Double] {
        ["x": Double(p.x), "y": Double(1 - p.y)]
      }

      return [
        "found": true,
        "confidence": Double(rect.confidence),
        "areaFraction": Self.quadArea(rect),
        "corners": [
          "topLeft": flip(rect.topLeft),
          "topRight": flip(rect.topRight),
          "bottomRight": flip(rect.bottomRight),
          "bottomLeft": flip(rect.bottomLeft),
        ],
      ]
    }

    AsyncFunction("enhanceImage") { (srcPath: String, dstPath: String, options: EnhanceOptions) -> [String: Any] in
      var image = try Self.loadOrientedImage(srcPath)

      // Downscale before any rendering so peak memory stays bounded.
      let longEdge = max(image.extent.width, image.extent.height)
      if longEdge > Self.maxLongEdge {
        let scale = Self.maxLongEdge / longEdge
        let lanczos = CIFilter(name: "CILanczosScaleTransform")!
        lanczos.setValue(image, forKey: kCIInputImageKey)
        lanczos.setValue(scale, forKey: kCIInputScaleKey)
        lanczos.setValue(1.0, forKey: kCIInputAspectRatioKey)
        image = lanczos.outputImage ?? image
      }

      // Perspective correction: normalized top-left-origin quad → CI pixel
      // space (lower-left origin, y up).
      if let quad = options.quad {
        guard quad.count == 8 else {
          throw InvalidQuadException(quad.count)
        }
        let extent = image.extent
        func ciPoint(_ x: Double, _ y: Double) -> CIVector {
          CIVector(
            x: extent.origin.x + CGFloat(x) * extent.width,
            y: extent.origin.y + CGFloat(1 - y) * extent.height
          )
        }
        let filter = CIFilter(name: "CIPerspectiveCorrection")!
        filter.setValue(image, forKey: kCIInputImageKey)
        filter.setValue(ciPoint(quad[0], quad[1]), forKey: "inputTopLeft")
        filter.setValue(ciPoint(quad[2], quad[3]), forKey: "inputTopRight")
        filter.setValue(ciPoint(quad[4], quad[5]), forKey: "inputBottomRight")
        filter.setValue(ciPoint(quad[6], quad[7]), forKey: "inputBottomLeft")
        image = filter.outputImage ?? image
      }

      if options.grayscale {
        let desaturate = CIFilter(name: "CIColorControls")!
        desaturate.setValue(image, forKey: kCIInputImageKey)
        desaturate.setValue(0.0, forKey: kCIInputSaturationKey)
        image = desaturate.outputImage ?? image
      }

      let context = CIContext()

      if options.autoLevels,
         let stretch = Self.buildLevelsStretch(for: image, context: context) {
        image = stretch
      }

      switch ((options.rotateQuarterTurns % 4) + 4) % 4 {
      case 1: image = image.oriented(.right)
      case 2: image = image.oriented(.down)
      case 3: image = image.oriented(.left)
      default: break
      }

      // Normalize the extent origin so the JPEG writer sees a zero-based rect.
      if image.extent.origin != .zero {
        image = image.transformed(
          by: CGAffineTransform(
            translationX: -image.extent.origin.x,
            y: -image.extent.origin.y
          )
        )
      }

      let dstUrl = Self.fileUrl(dstPath)
      try Self.ensureParentDirectory(dstUrl)
      let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
      try context.writeJPEGRepresentation(
        of: image,
        to: dstUrl,
        colorSpace: colorSpace,
        options: [
          kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption:
            options.jpegQuality
        ]
      )

      return [
        "width": Int(image.extent.width.rounded()),
        "height": Int(image.extent.height.rounded()),
      ]
    }
  }

  /// Loads a CIImage with its EXIF orientation applied, so detection and
  /// enhancement always share one upright coordinate space.
  private static func loadOrientedImage(_ pathOrUri: String) throws -> CIImage {
    guard let image = CIImage(
      contentsOf: fileUrl(pathOrUri),
      options: [.applyOrientationProperty: true]
    ) else {
      throw ImageLoadException(pathOrUri)
    }
    return image
  }

  /// Normalized quad area via the shoelace formula (fraction of the frame).
  private static func quadArea(_ rect: VNRectangleObservation) -> Double {
    let pts = [rect.topLeft, rect.topRight, rect.bottomRight, rect.bottomLeft]
    var sum: CGFloat = 0
    for i in 0..<4 {
      let a = pts[i]
      let b = pts[(i + 1) % 4]
      sum += a.x * b.y - b.x * a.y
    }
    return abs(Double(sum)) / 2
  }

  /// Histogram-percentile auto-levels: samples the image at low resolution,
  /// finds the 0.5% / 99.5% luminance percentiles, and applies a linear
  /// stretch via CIColorPolynomial. Deterministic and robust to specular
  /// glare on the monitor (unlike min/max stretching). Returns nil when the
  /// histogram can't be read or the range is already near-full/degenerate.
  private static func buildLevelsStretch(
    for image: CIImage,
    context: CIContext
  ) -> CIImage? {
    let sampleLongEdge: CGFloat = 128
    let extent = image.extent
    guard extent.width > 0, extent.height > 0 else { return nil }
    let scale = sampleLongEdge / max(extent.width, extent.height)
    let sampleWidth = max(1, Int((extent.width * scale).rounded()))
    let sampleHeight = max(1, Int((extent.height * scale).rounded()))

    let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let renderRect = CGRect(x: scaled.extent.origin.x,
                            y: scaled.extent.origin.y,
                            width: CGFloat(sampleWidth),
                            height: CGFloat(sampleHeight))

    let bytesPerRow = sampleWidth * 4
    var bitmap = [UInt8](repeating: 0, count: bytesPerRow * sampleHeight)
    context.render(
      scaled,
      toBitmap: &bitmap,
      rowBytes: bytesPerRow,
      bounds: renderRect,
      format: .RGBA8,
      colorSpace: CGColorSpace(name: CGColorSpace.sRGB)
    )

    var histogram = [Int](repeating: 0, count: 256)
    var total = 0
    var offset = 0
    while offset + 2 < bitmap.count {
      let r = Double(bitmap[offset])
      let g = Double(bitmap[offset + 1])
      let b = Double(bitmap[offset + 2])
      let luma = Int((0.299 * r + 0.587 * g + 0.114 * b).rounded())
      histogram[min(255, max(0, luma))] += 1
      total += 1
      offset += 4
    }
    guard total > 0 else { return nil }

    let loTarget = Int(Double(total) * 0.005)
    let hiTarget = Int(Double(total) * 0.995)
    var cumulative = 0
    var lo = 0
    var hi = 255
    var loFound = false
    for bin in 0..<256 {
      cumulative += histogram[bin]
      if !loFound && cumulative > loTarget {
        lo = bin
        loFound = true
      }
      if cumulative >= hiTarget {
        hi = bin
        break
      }
    }

    // Near-flat or already full-range → stretching would only amplify noise.
    guard hi - lo >= 10, lo > 2 || hi < 253 else { return nil }

    let loF = Double(lo) / 255
    let hiF = Double(hi) / 255
    let gain = 1 / (hiF - loF)
    let bias = -loF * gain

    let polynomial = CIFilter(name: "CIColorPolynomial")!
    polynomial.setValue(image, forKey: kCIInputImageKey)
    let channel = CIVector(x: CGFloat(bias), y: CGFloat(gain), z: 0, w: 0)
    polynomial.setValue(channel, forKey: "inputRedCoefficients")
    polynomial.setValue(channel, forKey: "inputGreenCoefficients")
    polynomial.setValue(channel, forKey: "inputBlueCoefficients")
    polynomial.setValue(
      CIVector(x: 0, y: 1, z: 0, w: 0),
      forKey: "inputAlphaCoefficients"
    )
    guard let stretched = polynomial.outputImage else { return nil }

    let clamp = CIFilter(name: "CIColorClamp")!
    clamp.setValue(stretched, forKey: kCIInputImageKey)
    clamp.setValue(CIVector(x: 0, y: 0, z: 0, w: 0), forKey: "inputMinComponents")
    clamp.setValue(CIVector(x: 1, y: 1, z: 1, w: 1), forKey: "inputMaxComponents")
    return clamp.outputImage
  }

  /// Accepts both `file://…` URIs and plain filesystem paths.
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

/// Options for `enhanceImage`. `quad` is 8 normalized top-left-origin values
/// ordered TL.x, TL.y, TR.x, TR.y, BR.x, BR.y, BL.x, BL.y.
internal struct EnhanceOptions: Record {
  @Field var quad: [Double]?
  @Field var grayscale: Bool = true
  @Field var autoLevels: Bool = true
  @Field var rotateQuarterTurns: Int = 0
  @Field var jpegQuality: Double = 0.85
}

internal final class ImageLoadException: GenericException<String> {
  override var reason: String {
    "Could not load image at \(param)"
  }
}

internal final class InvalidQuadException: GenericException<Int> {
  override var reason: String {
    "Perspective quad must have 8 values (TL,TR,BR,BL × x,y), got \(param)"
  }
}
