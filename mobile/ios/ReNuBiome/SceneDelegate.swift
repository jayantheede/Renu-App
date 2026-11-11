import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let firstURL = connectionOptions.urlContexts.first?.url {
      sceneLaunchOptions[.url] = firstURL
    }
    if let firstActivity = connectionOptions.userActivities.first(where: {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }) {
      sceneLaunchOptions[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": firstActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": firstActivity,
      ]
    }

    if let existingWindow = appDelegate.window, existingWindow.rootViewController != nil {
      existingWindow.windowScene = windowScene
      self.window = existingWindow
      existingWindow.makeKeyAndVisible()
    } else {
      let window = UIWindow(windowScene: windowScene)
      self.window = window
      appDelegate.ensureReactNativeStarted(
        in: window,
        sceneLaunchOptions: sceneLaunchOptions.isEmpty ? nil : sceneLaunchOptions
      )
    }

    for urlContext in connectionOptions.urlContexts {
      _ = appDelegate.application(UIApplication.shared, open: urlContext.url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      _ = appDelegate.application(
        UIApplication.shared,
        continue: activity,
        restorationHandler: { _ in }
      )
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for urlContext in URLContexts {
      _ = appDelegate.application(UIApplication.shared, open: urlContext.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}

