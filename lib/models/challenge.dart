class TestCase {
  final dynamic input;
  final dynamic expectedOutput;
  final String explanation;

  const TestCase({
    required this.input,
    required this.expectedOutput,
    required this.explanation,
  });
}

enum Difficulty { easy, medium, hard }

class Challenge {
  final String id;
  final String leetcodeNumber;
  final String title;
  final Difficulty difficulty;
  final String description;
  final List<TestCase> testCases;
  final int xpReward;
  final String algorithmHint;
  final String thinkLikeComputer;

  const Challenge({
    required this.id,
    required this.leetcodeNumber,
    required this.title,
    required this.difficulty,
    required this.description,
    required this.testCases,
    required this.xpReward,
    required this.algorithmHint,
    required this.thinkLikeComputer,
  });

  String get difficultyLabel {
    switch (difficulty) {
      case Difficulty.easy:
        return 'Easy';
      case Difficulty.medium:
        return 'Medium';
      case Difficulty.hard:
        return 'Hard';
    }
  }
}

// ─── Challenge Data ─────────────────────────────────────────────────

final List<Challenge> allChallenges = [
  Challenge(
    id: 'stock_trading',
    leetcodeNumber: '122',
    title: 'Best Time to Buy and Sell Stock II',
    difficulty: Difficulty.medium,
    description:
        'You are given an integer array prices where prices[i] is the price of a '
        'given stock on the ith day.\n\n'
        'On each day, you may decide to buy and/or sell the stock. You can only hold '
        'at most one share of the stock at any time.\n\n'
        'Find and return the maximum profit you can achieve.',
    testCases: [
      TestCase(
        input: [7, 1, 5, 3, 6, 4],
        expectedOutput: 7,
        explanation:
            'Buy on day 2 (price = 1) and sell on day 3 (price = 5), profit = 4.\n'
            'Then buy on day 4 (price = 3) and sell on day 5 (price = 6), profit = 3.\n'
            'Total profit = 7.',
      ),
      TestCase(
        input: [1, 2, 3, 4, 5],
        expectedOutput: 4,
        explanation:
            'Buy on day 1 (price = 1) and sell on day 5 (price = 5), profit = 4.',
      ),
      TestCase(
        input: [7, 6, 4, 3, 1],
        expectedOutput: 0,
        explanation:
            'Prices only decrease, so no profitable transaction is possible.',
      ),
    ],
    xpReward: 100,
    algorithmHint:
        'Greedy approach: Collect every uphill — whenever tomorrow\'s price is '
        'higher than today\'s, buy today and sell tomorrow.',
    thinkLikeComputer:
        'A computer scans one day at a time. It can\'t see the future! '
        'At each step, it only compares today\'s price with tomorrow\'s.',
  ),
  Challenge(
    id: 'reverse_integer',
    leetcodeNumber: '7',
    title: 'Reverse Integer',
    difficulty: Difficulty.medium,
    description:
        'Given a signed 32-bit integer x, return x with its digits reversed. '
        'If reversing x causes the value to go outside the signed 32-bit integer '
        'range [-2³¹, 2³¹ - 1], then return 0.\n\n'
        'Assume the environment does not allow you to store 64-bit integers.',
    testCases: [
      TestCase(
        input: 123,
        expectedOutput: 321,
        explanation: 'Reverse the digits of 123 to get 321.',
      ),
      TestCase(
        input: -123,
        expectedOutput: -321,
        explanation: 'Negative sign is preserved. Reverse 123 → 321, apply sign → -321.',
      ),
      TestCase(
        input: 120,
        expectedOutput: 21,
        explanation: 'Trailing zero is dropped when reversed.',
      ),
    ],
    xpReward: 100,
    algorithmHint:
        'Extract digits one by one using modulo (% 10) and integer division (÷ 10). '
        'Build the result using result = result × 10 + digit.',
    thinkLikeComputer:
        'A computer cannot "see" individual digits visually. It must extract them '
        'mathematically using % 10 to pop the last digit, and ÷ 10 to shrink the number.',
  ),
];
