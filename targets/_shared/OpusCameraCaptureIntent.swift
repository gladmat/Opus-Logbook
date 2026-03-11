import AppIntents
import Foundation

@available(iOS 18.0, *)
struct OpusCaptureAppContext: Codable, Sendable {
    var targetMode: String = "inbox"
    var returnURL: String = "opus://camera?mode=inbox"
}

@available(iOS 18.0, *)
struct OpusCameraCaptureIntent: CameraCaptureIntent {
    typealias AppContext = OpusCaptureAppContext

    static let title: LocalizedStringResource = "Capture to Inbox"
    static let description = IntentDescription(
        "Capture clinical photos directly into the secure Opus inbox."
    )

    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        let context = AppContext()
        try await Self.updateAppContext(context)
        return .result(opensIntent: OpenURLIntent(URL(string: context.returnURL)!))
    }
}
