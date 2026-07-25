class AppConstants {
  static const String appName = 'LeetGame';
  static const String tagline = 'Think Like a Computer';

  // XP rewards
  static const int xpEasy = 50;
  static const int xpMedium = 100;
  static const int xpHard = 200;

  // Star thresholds (ratio of user moves to optimal)
  static const double star3Threshold = 1.0; // Perfect
  static const double star2Threshold = 1.3; // Within 30% of optimal
  static const double star1Threshold = 2.0; // Within 100% of optimal
}
