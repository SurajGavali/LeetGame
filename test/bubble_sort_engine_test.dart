import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:leet_game/models/bubble_sort_engine.dart';
import 'package:leet_game/models/game_state.dart';
import 'package:leet_game/screens/bubble_sort_screen.dart';
import 'package:provider/provider.dart';

void main() {
  group('BubbleSortEngine', () {
    test('swaps an inverted adjacent pair and waits before moving on', () {
      final engine = BubbleSortEngine([4, 2, 3]);

      final result = engine.submit(BubbleDecision.swap);

      expect(result.isCorrect, isTrue);
      expect(result.didSwap, isTrue);
      expect(engine.values, [2, 4, 3]);
      expect(engine.comparisonIndex, 0);
      expect(engine.awaitingAdvance, isTrue);

      engine.advance();
      expect(engine.comparisonIndex, 1);
      expect(engine.awaitingAdvance, isFalse);
    });

    test('rejects a wrong decision without advancing machine state', () {
      final engine = BubbleSortEngine([1, 3, 2]);

      final result = engine.submit(BubbleDecision.swap);

      expect(result.isCorrect, isFalse);
      expect(engine.values, [1, 3, 2]);
      expect(engine.comparisonCount, 0);
      expect(engine.mistakeCount, 1);
      expect(engine.awaitingAdvance, isFalse);
    });

    test('sorts a full round using only local comparisons', () {
      final engine = BubbleSortEngine([6, 3, 8, 2, 5]);

      while (!engine.isComplete) {
        final decision = engine.shouldSwap
            ? BubbleDecision.swap
            : BubbleDecision.keep;
        engine.submit(decision);
        engine.advance();
      }

      expect(engine.values, [2, 3, 5, 6, 8]);
      expect(engine.sortedCount, 5);
      expect(engine.mistakeCount, 0);
      expect(engine.comparisonCount, lessThanOrEqualTo(10));
    });

    test('stops early after a pass with no swaps', () {
      final engine = BubbleSortEngine([1, 2, 3, 4, 5]);

      while (!engine.isComplete) {
        engine.submit(BubbleDecision.keep);
        engine.advance();
      }

      expect(engine.comparisonCount, 4);
      expect(engine.pass, 1);
      expect(engine.sortedCount, 5);
    });
  });

  testWidgets('game renders and accepts a swap on a phone-sized screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => GameState(),
        child: MaterialApp(
          theme: ThemeData.dark(),
          home: const BubbleSortScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('You are the sorting machine'), findsOneWidget);
    expect(find.text('Is 6 greater than 3?'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('SWAP'));
    await tester.pumpAndSettle();

    expect(find.text('6 > 3, so the machine swaps them.'), findsOneWidget);
    expect(find.text('Next Comparison'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
