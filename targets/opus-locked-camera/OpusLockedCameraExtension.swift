import AVFoundation
import Foundation
import LockedCameraCapture
import SwiftUI

@available(iOS 18.0, *)
private struct PendingLockedCaptureRecord: Codable {
    let id: String
    let sourceUri: String
    let mimeType: String
    let capturedAt: String
}

@available(iOS 18.0, *)
private final class OpusLockedCameraController: NSObject, ObservableObject, AVCapturePhotoCaptureDelegate {
    @Published var isReady = false
    @Published var isCapturing = false
    @Published var statusMessage: String = "Captured photos will land in your Opus inbox."

    let previewSession = AVCaptureSession()

    private let photoOutput = AVCapturePhotoOutput()
    private let setupQueue = DispatchQueue(label: "com.drgladysz.opus.locked-camera")

    func start() {
        Task {
            let authorized = await requestCameraAccess()
            guard authorized else {
                await MainActor.run {
                    self.statusMessage = "Camera access is required to capture securely."
                }
                return
            }

            configureIfNeeded()
        }
    }

    func stop() {
        setupQueue.async {
            if self.previewSession.isRunning {
                self.previewSession.stopRunning()
            }
        }
    }

    func capture() {
        guard isReady && !isCapturing else {
            return
        }

        isCapturing = true
        let settings = AVCapturePhotoSettings()
        settings.processedFileType = .jpeg
        settings.flashMode = .off
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        defer {
            Task { @MainActor in
                self.isCapturing = false
            }
        }

        if let error {
            Task { @MainActor in
                self.statusMessage = "Capture failed: \(error.localizedDescription)"
            }
            return
        }

        guard let data = photo.fileDataRepresentation() else {
            Task { @MainActor in
                self.statusMessage = "Capture failed before the image could be saved."
            }
            return
        }

        do {
            let fileURL = try writePendingCapture(data)
            appendPendingCaptureRecord(
                PendingLockedCaptureRecord(
                    id: UUID().uuidString,
                    sourceUri: fileURL.path,
                    mimeType: "image/jpeg",
                    capturedAt: ISO8601DateFormatter().string(from: .now)
                )
            )
            Task { @MainActor in
                self.statusMessage = "Saved. Open Opus to finish encrypting this capture."
            }
        } catch {
            Task { @MainActor in
                self.statusMessage = "Capture failed: \(error.localizedDescription)"
            }
        }
    }

    private func configureIfNeeded() {
        setupQueue.async {
            guard !self.previewSession.isRunning else {
                return
            }

            self.previewSession.beginConfiguration()
            self.previewSession.sessionPreset = .photo
            self.previewSession.inputs.forEach { self.previewSession.removeInput($0) }

            do {
                guard
                    let device = AVCaptureDevice.default(
                        .builtInWideAngleCamera,
                        for: .video,
                        position: .back
                    )
                else {
                    throw NSError(
                        domain: "OpusLockedCamera",
                        code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "Back camera unavailable."]
                    )
                }

                let input = try AVCaptureDeviceInput(device: device)
                if self.previewSession.canAddInput(input) {
                    self.previewSession.addInput(input)
                }

                if self.previewSession.canAddOutput(self.photoOutput) {
                    self.previewSession.addOutput(self.photoOutput)
                }

                self.previewSession.commitConfiguration()
                self.previewSession.startRunning()

                Task { @MainActor in
                    self.isReady = true
                }
            } catch {
                self.previewSession.commitConfiguration()
                Task { @MainActor in
                    self.statusMessage = error.localizedDescription
                }
            }
        }
    }

    private func requestCameraAccess() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return true
        case .notDetermined:
            return await AVCaptureDevice.requestAccess(for: .video)
        default:
            return false
        }
    }

    private func writePendingCapture(_ data: Data) throws -> URL {
        guard
            let containerURL = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: OpusTargetSharedConstants.appGroup
            )
        else {
            throw NSError(
                domain: "OpusLockedCamera",
                code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Shared container unavailable."]
            )
        }

        let captureDirectory = containerURL.appendingPathComponent(
            "LockedCameraPending",
            isDirectory: true
        )
        // Apply `completeUntilFirstUserAuthentication` — the strictest class
        // compatible with a LockedCameraCapture extension, which by design
        // runs while the device is locked (so files cannot use
        // `.complete` / `NSFileProtectionComplete`). This is stricter than
        // the default `none` class the shared App Group container would
        // otherwise use, meaning forensic tools cannot read these files
        // until the device has been unlocked at least once since boot.
        try FileManager.default.createDirectory(
            at: captureDirectory,
            withIntermediateDirectories: true,
            attributes: [
                .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
            ]
        )

        let fileURL = captureDirectory.appendingPathComponent("\(UUID().uuidString).jpg")
        // Per-file protection locks the data to at least AFU state. The main
        // app will ingest + delete these files on next launch; see
        // `client/lib/sharedCaptureIngress.ts` and the >7-day orphan sweep.
        try data.write(
            to: fileURL,
            options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]
        )
        return fileURL
    }

    private func appendPendingCaptureRecord(_ record: PendingLockedCaptureRecord) {
        let defaults = UserDefaults(suiteName: OpusTargetSharedConstants.appGroup)
        let existingData = defaults?.string(forKey: OpusTargetSharedConstants.pendingLockedCapturesKey)
        var records = [PendingLockedCaptureRecord]()

        if
            let existingData,
            let decoded = try? JSONDecoder().decode(
                [PendingLockedCaptureRecord].self,
                from: Data(existingData.utf8)
            )
        {
            records = decoded
        }

        records.append(record)

        if let encoded = try? JSONEncoder().encode(records) {
            defaults?.set(String(decoding: encoded, as: UTF8.self), forKey: OpusTargetSharedConstants.pendingLockedCapturesKey)
        }
    }
}

@available(iOS 18.0, *)
private struct OpusLockedCameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.videoGravity = .resizeAspectFill
        view.previewLayer.session = session
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        uiView.previewLayer.session = session
    }
}

@available(iOS 18.0, *)
private final class PreviewView: UIView {
    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }

    var previewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }
}

@available(iOS 18.0, *)
private struct OpusLockedCameraView: View {
    @StateObject private var controller = OpusLockedCameraController()

    var body: some View {
        ZStack {
            OpusLockedCameraPreview(session: controller.previewSession)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()

                Text(controller.statusMessage)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.black.opacity(0.6), in: Capsule())

                Button {
                    controller.capture()
                } label: {
                    Circle()
                        .fill(.white)
                        .frame(width: 82, height: 82)
                        .overlay {
                            Circle()
                                .stroke(.black.opacity(0.12), lineWidth: 2)
                        }
                }
                .buttonStyle(.plain)
                .disabled(!controller.isReady || controller.isCapturing)
                .padding(.bottom, 28)
            }
            .padding(.horizontal, 20)
        }
        .background(.black)
        .task {
            controller.start()
        }
        .onDisappear {
            controller.stop()
        }
    }
}

@available(iOS 18.0, *)
@main
struct OpusLockedCameraExtension: LockedCameraCaptureExtension {
    var body: some LockedCameraCaptureExtensionScene {
        LockedCameraCaptureUIScene { _ in
            OpusLockedCameraView()
        }
    }
}
