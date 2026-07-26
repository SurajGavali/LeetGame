import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class GameState extends ChangeNotifier {
  int _totalXP = 0;
  final Map<String, int> _bestStars = {}; // challengeId -> stars (1-3)

  int get totalXP => _totalXP;
  Map<String, int> get bestStars => Map.unmodifiable(_bestStars);

  int get level => (_totalXP / 200).floor() + 1;
  double get levelProgress => (_totalXP % 200) / 200.0;
  int get challengesCompleted => _bestStars.length;

  int starsFor(String challengeId) => _bestStars[challengeId] ?? 0;

  Future<void> loadProgress() async {
    final prefs = await SharedPreferences.getInstance();
    _totalXP = prefs.getInt('totalXP') ?? 0;

    final keys = prefs.getKeys().where((k) => k.startsWith('stars_'));
    for (final key in keys) {
      _bestStars[key.replaceFirst('stars_', '')] = prefs.getInt(key) ?? 0;
    }
    notifyListeners();
  }

  Future<void> completeChallenge(String challengeId, int stars, int xp) async {
    final previousStars = _bestStars[challengeId] ?? 0;

    if (stars > previousStars) {
      _bestStars[challengeId] = stars;
    }

    if (previousStars == 0) {
      // Award XP once, on the first successful completion.
      _totalXP += xp;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('totalXP', _totalXP);
    await prefs.setInt('stars_$challengeId', _bestStars[challengeId]!);
    notifyListeners();
  }
}
