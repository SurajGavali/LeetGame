enum BubbleDecision { keep, swap }

class BubbleMoveResult {
  final bool isCorrect;
  final bool didSwap;
  final int leftValue;
  final int rightValue;

  const BubbleMoveResult({
    required this.isCorrect,
    required this.didSwap,
    required this.leftValue,
    required this.rightValue,
  });
}

class BubbleSortEngine {
  BubbleSortEngine(List<int> values)
    : assert(values.length >= 2),
      values = List<int>.from(values);

  final List<int> values;

  int pass = 1;
  int comparisonIndex = 0;
  int comparisonCount = 0;
  int swapCount = 0;
  int mistakeCount = 0;
  int sortedCount = 0;
  bool awaitingAdvance = false;
  bool isComplete = false;

  bool _swappedThisPass = false;

  int get leftValue => values[comparisonIndex];
  int get rightValue => values[comparisonIndex + 1];
  bool get shouldSwap => leftValue > rightValue;
  int get totalPossibleComparisons => values.length * (values.length - 1) ~/ 2;

  BubbleMoveResult submit(BubbleDecision decision) {
    if (isComplete || awaitingAdvance) {
      throw StateError('The engine is not waiting for a decision.');
    }

    final left = leftValue;
    final right = rightValue;
    final choseSwap = decision == BubbleDecision.swap;
    final correct = choseSwap == shouldSwap;

    if (!correct) {
      mistakeCount++;
      return BubbleMoveResult(
        isCorrect: false,
        didSwap: false,
        leftValue: left,
        rightValue: right,
      );
    }

    if (choseSwap) {
      values[comparisonIndex] = right;
      values[comparisonIndex + 1] = left;
      swapCount++;
      _swappedThisPass = true;
    }

    comparisonCount++;
    awaitingAdvance = true;
    return BubbleMoveResult(
      isCorrect: true,
      didSwap: choseSwap,
      leftValue: left,
      rightValue: right,
    );
  }

  void advance() {
    if (!awaitingAdvance || isComplete) {
      throw StateError('Complete the current comparison before advancing.');
    }

    final lastComparisonIndex = values.length - sortedCount - 2;
    if (comparisonIndex < lastComparisonIndex) {
      comparisonIndex++;
    } else {
      sortedCount++;

      // A pass with no swaps proves the entire remaining array is sorted.
      if (!_swappedThisPass || sortedCount >= values.length - 1) {
        sortedCount = values.length;
        isComplete = true;
      } else {
        pass++;
        comparisonIndex = 0;
        _swappedThisPass = false;
      }
    }

    awaitingAdvance = false;
  }
}
