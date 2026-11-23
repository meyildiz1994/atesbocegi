import ExpoModulesCore
import GameKit

/// Game Center: oturum açma, skor gönderme ve sıralama ekranı.
public class GlowjarGameCenterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GlowjarGameCenter")

    AsyncFunction("authenticate") { (promise: Promise) in
      let player = GKLocalPlayer.local
      if player.isAuthenticated {
        promise.resolve(true)
        return
      }
      var settled = false
      player.authenticateHandler = { [weak self] viewController, error in
        if let vc = viewController {
          // Oturum açılmamışsa Apple'ın giriş ekranı gösterilir.
          self?.appContext?.utilities?.currentViewController()?.present(vc, animated: true)
          return
        }
        if !settled {
          settled = true
          promise.resolve(error == nil && GKLocalPlayer.local.isAuthenticated)
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("submitScore") { (leaderboardId: String, score: Int, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(false)
        return
      }
      GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
        promise.resolve(error == nil)
      }
    }

    AsyncFunction("showLeaderboard") { (leaderboardId: String, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated,
            let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.resolve(nil)
        return
      }
      let vc = GKGameCenterViewController(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime)
      vc.gameCenterDelegate = GameCenterDismisser.shared
      presenter.present(vc, animated: true)
      promise.resolve(nil)
    }.runOnQueue(.main)
  }
}

final class GameCenterDismisser: NSObject, GKGameCenterControllerDelegate {
  static let shared = GameCenterDismisser()
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}
