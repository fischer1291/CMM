// On-device speech recognition (German) with word timestamps, for placing
// voice-over phrases in hero/shots.json. Nothing leaves the Mac. Run via
// transcribe.sh; macOS asks once for speech recognition access.
import Foundation
import Speech

setvbuf(stdout, nil, _IONBF, 0)
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "de-DE"))!
recognizer.queue = OperationQueue()
var words: [Int: (Double, Double, String)] = [:]
var lastCallback = Date()
let lock = NSLock()
var task: SFSpeechRecognitionTask?

func flush() -> Never {
  lock.lock()
  for (_, w) in words.sorted(by: { $0.key < $1.key }) { print(String(format: "%.2f\t%.2f\t%@", w.0, w.1, w.2)) }
  exit(0)
}

SFSpeechRecognizer.requestAuthorization { status in
  guard status == .authorized else { print("no auth"); exit(2) }
  DispatchQueue.main.async {
    let req = SFSpeechURLRecognitionRequest(url: url)
    req.requiresOnDeviceRecognition = true
    req.shouldReportPartialResults = true
    task = recognizer.recognitionTask(with: req) { result, error in
      lock.lock()
      lastCallback = Date()
      if let result = result {
        // Timestamps are absolute; later results for the same words overwrite earlier guesses
        for s in result.bestTranscription.segments where !s.substring.isEmpty && s.duration > 0.05 {
          words[Int((s.timestamp * 20).rounded())] = (s.timestamp, s.timestamp + s.duration, s.substring)
        }
      }
      lock.unlock()
      if error != nil { flush() }
    }
  }
}
// Done when nothing has come in for a while
Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
  lock.lock(); let idle = Date().timeIntervalSince(lastCallback); lock.unlock()
  if idle > 12 { flush() }
}
DispatchQueue.main.asyncAfter(deadline: .now() + 240) { flush() }
dispatchMain()
