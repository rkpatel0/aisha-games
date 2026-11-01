// Aisha's Games — a tiny native macOS shell around the local web games.
// Everything it loads lives inside the app bundle, so it works offline.

import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!

    // Set AISHA_DEV=1 to enable the Web Inspector and a console diagnostic.
    private let devMode = ProcessInfo.processInfo.environment["AISHA_DEV"] == "1"

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        buildWindow()
        loadGames()
    }

    // MARK: - window

    private func buildWindow() {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        // Let the page reach its own sibling files (core/, games/) over file://.
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        // In dev mode flag the page before its scripts run, so a game can expose
        // a debug probe (see window.__AISHA_DEV in the new-game skill).
        if devMode {
            config.userContentController.addUserScript(WKUserScript(
                source: "window.__AISHA_DEV = true;",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            ))
        }

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        if #available(macOS 13.3, *) { webView.isInspectable = devMode }

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1180, height: 900),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Aisha's Games"
        window.minSize = NSSize(width: 760, height: 620)
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func loadGames() {
        guard let root = Bundle.main.resourceURL?.appendingPathComponent("web") else { return }
        // AISHA_DEV_PAGE opens straight into a game — handy when testing a build.
        let page = ProcessInfo.processInfo.environment["AISHA_DEV_PAGE"] ?? "index.html"
        webView.loadFileURL(root.appendingPathComponent(page), allowingReadAccessTo: root)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard devMode else { return }
        let probe = """
        (() => {
          const out = {
            page: location.pathname.split('/').slice(-2).join('/'),
            framework: typeof AG === 'object' ? Object.keys(AG).sort().join(',') : 'MISSING',
            tiles: document.querySelectorAll('.home-card, .pp-card').length,
          };
          try { localStorage.setItem('probe', '1'); out.storage = localStorage.getItem('probe') === '1'; }
          catch (e) { out.storage = false; }
          return JSON.stringify(out);
        })()
        """
        webView.evaluateJavaScript(probe) { result, _ in
            FileHandle.standardError.write("[AishaGames] \(result ?? "no result")\n".data(using: .utf8)!)
        }

        // AISHA_DEV_EVAL runs arbitrary JS after each load, for scripted checks.
        // It is run as an async function body, so it may `await` and must `return`.
        if let script = ProcessInfo.processInfo.environment["AISHA_DEV_EVAL"] {
            webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { outcome in
                let text: String
                switch outcome {
                case .success(let value): text = "\(value)"
                case .failure(let error):
                    // Surface the actual JS message, not just "an exception occurred".
                    let info = (error as NSError).userInfo
                    let detail = info["WKJavaScriptExceptionMessage"] as? String
                    let line = info["WKJavaScriptExceptionLineNumber"] as? Int
                    text = "error: " + (detail ?? error.localizedDescription)
                        + (line.map { " (line \($0))" } ?? "")
                }
                FileHandle.standardError.write("[AishaGames eval] \(text)\n".data(using: .utf8)!)
            }
        }
    }

    // MARK: - menu

    @objc private func reload(_ sender: Any?) { loadGames() }

    @objc private func goHome(_ sender: Any?) { loadGames() }

    private func buildMenu() {
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)

        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Aisha's Games",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())

        let home = appMenu.addItem(withTitle: "Back to All Games",
                                   action: #selector(goHome(_:)), keyEquivalent: "0")
        home.target = self

        let reloadItem = appMenu.addItem(withTitle: "Reload",
                                         action: #selector(reload(_:)), keyEquivalent: "r")
        reloadItem.target = self

        let fullScreen = appMenu.addItem(withTitle: "Enter Full Screen",
                                         action: #selector(NSWindow.toggleFullScreen(_:)),
                                         keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.command, .control]

        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Aisha's Games",
                        action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "Quit Aisha's Games",
                        action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

        appItem.submenu = appMenu
        NSApp.mainMenu = mainMenu
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
