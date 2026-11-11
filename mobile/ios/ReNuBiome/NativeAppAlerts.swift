import Foundation
import UIKit
import UserNotifications

@objc(NativeAppAlerts)
public class NativeAppAlerts: NSObject {
  @objc public static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(getPermissionStatus:rejecter:)
  public func getPermissionStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        resolve("granted")
      case .denied:
        resolve("denied")
      case .notDetermined:
        resolve("default")
      @unknown default:
        resolve("default")
      }
    }
  }

  @objc(requestPermission:rejecter:)
  public func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
        resolve(true)
        return
      }
      center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        resolve(granted)
      }
    }
  }

  @objc(scheduleLocalAlert:body:identifier:delaySeconds:url:resolver:rejecter:)
  public func scheduleLocalAlert(
    _ title: String,
    body: String,
    identifier: String,
    delaySeconds: Double,
    url: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      let dispatchBlock = {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        if let url = url {
          content.userInfo = ["url": url]
        }

        let trigger: UNNotificationTrigger? =
          delaySeconds > 0.1
          ? UNTimeIntervalNotificationTrigger(timeInterval: delaySeconds, repeats: false)
          : nil

        let reqId = identifier.isEmpty ? "renu-\(UUID().uuidString)" : identifier
        let request = UNNotificationRequest(identifier: reqId, content: content, trigger: trigger)
        center.add(request) { error in
          if let error = error {
            reject("E_NOTIFICATION_SCHEDULE", error.localizedDescription, error)
          } else {
            resolve(true)
          }
        }
      }

      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        dispatchBlock()
      case .notDetermined:
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          if granted {
            dispatchBlock()
          } else {
            resolve(false)
          }
        }
      case .denied:
        resolve(false)
      @unknown default:
        resolve(false)
      }
    }
  }

  @objc(setBadgeCount:resolver:rejecter:)
  public func setBadgeCount(
    _ count: Int,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let safeCount = max(0, count)
    if #available(iOS 16.0, *) {
      UNUserNotificationCenter.current().setBadgeCount(safeCount) { error in
        if let error = error {
          reject("E_BADGE_COUNT", error.localizedDescription, error)
        } else {
          resolve(true)
        }
      }
    } else {
      DispatchQueue.main.async {
        UIApplication.shared.applicationIconBadgeNumber = safeCount
        resolve(true)
      }
    }
  }
}

