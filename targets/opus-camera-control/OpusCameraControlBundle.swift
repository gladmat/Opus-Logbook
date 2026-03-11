import SwiftUI
import WidgetKit

private struct OpusInboxEntry: TimelineEntry {
    let date: Date
    let inboxCount: Int
}

private struct OpusInboxProvider: TimelineProvider {
    func placeholder(in context: Context) -> OpusInboxEntry {
        OpusInboxEntry(date: .now, inboxCount: 3)
    }

    func getSnapshot(in context: Context, completion: @escaping (OpusInboxEntry) -> Void) {
        completion(OpusInboxEntry(date: .now, inboxCount: loadInboxCount()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OpusInboxEntry>) -> Void) {
        let entry = OpusInboxEntry(date: .now, inboxCount: loadInboxCount())
        let refreshDate = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(refreshDate)))
    }

    private func loadInboxCount() -> Int {
        let defaults = UserDefaults(suiteName: OpusTargetSharedConstants.appGroup)
        return defaults?.integer(forKey: OpusTargetSharedConstants.inboxCountKey) ?? 0
    }
}

private struct OpusInboxWidgetView: View {
    let entry: OpusInboxEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "tray.full.fill")
                    .font(.system(size: 16, weight: .semibold))
                Spacer()
                Text("\(entry.inboxCount)")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(.white.opacity(0.18), in: Capsule())
            }

            Spacer()

            Text("Inbox")
                .font(.system(size: 22, weight: .bold, design: .rounded))

            Text(
                entry.inboxCount == 1
                    ? "1 unassigned capture"
                    : "\(entry.inboxCount) unassigned captures"
            )
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.secondary)
        }
        .padding(18)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [
                    Color(red: 0.96, green: 0.91, blue: 0.84),
                    Color(red: 0.88, green: 0.80, blue: 0.72),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .widgetURL(URL(string: "opus://inbox"))
    }
}

struct OpusInboxWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: OpusTargetSharedConstants.inboxWidgetKind,
            provider: OpusInboxProvider()
        ) { entry in
            OpusInboxWidgetView(entry: entry)
        }
        .configurationDisplayName("Opus Inbox")
        .description("See unassigned captures and jump straight back into Opus.")
        .supportedFamilies([.systemSmall])
    }
}

@available(iOS 18.0, *)
struct OpusCaptureControl: ControlWidget {
    static let kind = OpusTargetSharedConstants.captureControlKind

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: OpusCameraCaptureIntent()) {
                Label("Capture to Inbox", systemImage: "camera.fill")
            }
        }
        .displayName("Capture to Inbox")
        .description("Launch secure capture straight into the Opus inbox.")
    }
}

@main
struct OpusCameraControlBundle: WidgetBundle {
    var body: some Widget {
        OpusInboxWidget()

        if #available(iOS 18.0, *) {
            OpusCaptureControl()
        }
    }
}
