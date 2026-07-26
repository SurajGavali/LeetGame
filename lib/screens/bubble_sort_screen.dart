import 'package:animate_do/animate_do.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/bubble_sort_engine.dart';
import '../models/game_state.dart';
import '../utils/theme.dart';

class BubbleSortScreen extends StatefulWidget {
  const BubbleSortScreen({super.key});

  @override
  State<BubbleSortScreen> createState() => _BubbleSortScreenState();
}

class _BubbleSortScreenState extends State<BubbleSortScreen> {
  static const _rounds = [
    [6, 3, 8, 2, 5],
    [7, 4, 1, 6, 3],
    [5, 2, 4, 1, 3],
  ];

  late BubbleSortEngine _engine;
  int _roundIndex = 0;
  String? _feedback;
  bool _feedbackIsError = false;
  bool _completionRecorded = false;

  @override
  void initState() {
    super.initState();
    _engine = BubbleSortEngine(_rounds[_roundIndex]);
  }

  int get _stars {
    if (_engine.mistakeCount == 0) return 3;
    if (_engine.mistakeCount <= 2) return 2;
    return 1;
  }

  int get _accuracy {
    final attempts = _engine.comparisonCount + _engine.mistakeCount;
    if (attempts == 0) return 100;
    return ((_engine.comparisonCount / attempts) * 100).round();
  }

  void _submit(BubbleDecision decision) {
    if (_engine.awaitingAdvance || _engine.isComplete) return;

    final result = _engine.submit(decision);
    HapticFeedback.selectionClick();

    setState(() {
      _feedbackIsError = !result.isCorrect;
      if (!result.isCorrect) {
        final relation = result.leftValue > result.rightValue
            ? 'greater than'
            : 'not greater than';
        final correctAction = result.leftValue > result.rightValue
            ? 'SWAP'
            : 'KEEP';
        _feedback =
            '${result.leftValue} is $relation ${result.rightValue}. The machine must $correctAction.';
      } else if (result.didSwap) {
        _feedback =
            '${result.leftValue} > ${result.rightValue}, so the machine swaps them.';
      } else {
        _feedback =
            '${result.leftValue} ≤ ${result.rightValue}, so their order stays the same.';
      }
    });

    if (!result.isCorrect) {
      HapticFeedback.mediumImpact();
    }
  }

  void _advance() {
    if (!_engine.awaitingAdvance) return;

    setState(() {
      _engine.advance();
      _feedback = null;
      _feedbackIsError = false;
    });

    if (_engine.isComplete) {
      HapticFeedback.heavyImpact();
      _recordCompletion();
    }
  }

  void _recordCompletion() {
    if (_completionRecorded) return;
    _completionRecorded = true;
    context.read<GameState>().completeChallenge('bubble_sort', _stars, 120);
  }

  void _startNewRound() {
    setState(() {
      _roundIndex = (_roundIndex + 1) % _rounds.length;
      _engine = BubbleSortEngine(_rounds[_roundIndex]);
      _feedback = null;
      _feedbackIsError = false;
      _completionRecorded = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Bubble Sort'),
        actions: [
          IconButton(
            tooltip: 'Restart round',
            onPressed: () {
              setState(() {
                _engine = BubbleSortEngine(_rounds[_roundIndex]);
                _feedback = null;
                _feedbackIsError = false;
                _completionRecorded = false;
              });
            },
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FadeInDown(child: _buildMissionCard()),
              const SizedBox(height: 16),
              FadeInUp(
                delay: const Duration(milliseconds: 80),
                child: _buildStats(),
              ),
              const SizedBox(height: 16),
              FadeInUp(
                delay: const Duration(milliseconds: 140),
                child: _buildArrayBoard(),
              ),
              const SizedBox(height: 16),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: _engine.isComplete
                    ? _buildCompletionCard()
                    : _buildDecisionPanel(),
              ),
              const SizedBox(height: 16),
              _buildHowItWorks(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMissionCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF312E81), Color(0xFF1E3A8A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.accentPurple.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.memory_rounded,
              color: AppColors.accentCyan,
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'You are the sorting machine',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontSize: 16,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Compare only the highlighted neighbors. Move the larger value right.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.72),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStats() {
    return Row(
      children: [
        _statChip('PASS', '${_engine.pass}', AppColors.accentPurple),
        const SizedBox(width: 8),
        _statChip(
          'COMPARE',
          '${_engine.comparisonCount}',
          AppColors.accentCyan,
        ),
        const SizedBox(width: 8),
        _statChip('SWAPS', '${_engine.swapCount}', AppColors.warning),
        const SizedBox(width: 8),
        _statChip('ACCURACY', '$_accuracy%', AppColors.success),
      ],
    );
  }

  Widget _statChip(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.divider),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.labelMedium?.copyWith(color: color, fontSize: 15),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontSize: 8,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildArrayBoard() {
    final maxValue = _engine.values.reduce((a, b) => a > b ? a : b);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 18, 14, 14),
      decoration: BoxDecoration(
        gradient: AppColors.cardGradient,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                _engine.isComplete ? 'SORTED ARRAY' : 'MACHINE MEMORY',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const Spacer(),
              if (!_engine.isComplete)
                Text(
                  'i = ${_engine.comparisonIndex}',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.accentCyan,
                    fontSize: 11,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 178,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(_engine.values.length, (index) {
                final value = _engine.values[index];
                final isCompared =
                    !_engine.isComplete &&
                    (index == _engine.comparisonIndex ||
                        index == _engine.comparisonIndex + 1);
                final isSorted =
                    _engine.isComplete ||
                    index >= _engine.values.length - _engine.sortedCount;
                final barColor = isSorted
                    ? AppColors.success
                    : isCompared
                    ? AppColors.accentCyan
                    : AppColors.accentBlue;

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (isCompared)
                          Text(
                            index == _engine.comparisonIndex ? 'LEFT' : 'RIGHT',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: AppColors.accentCyan,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w800,
                                ),
                          )
                        else if (isSorted)
                          const Icon(
                            Icons.lock_rounded,
                            color: AppColors.success,
                            size: 13,
                          )
                        else
                          const SizedBox(height: 13),
                        const SizedBox(height: 5),
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeOutBack,
                          height: 44 + (value / maxValue) * 82,
                          decoration: BoxDecoration(
                            color: barColor.withValues(
                              alpha: isCompared || isSorted ? 0.92 : 0.42,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: barColor,
                              width: isCompared ? 2 : 1,
                            ),
                            boxShadow: isCompared
                                ? [
                                    BoxShadow(
                                      color: barColor.withValues(alpha: 0.28),
                                      blurRadius: 14,
                                    ),
                                  ]
                                : null,
                          ),
                          child: Center(
                            child: Text(
                              '$value',
                              style: Theme.of(context).textTheme.labelLarge
                                  ?.copyWith(color: Colors.white, fontSize: 18),
                            ),
                          ),
                        ),
                        const SizedBox(height: 7),
                        Text(
                          '[$index]',
                          style: Theme.of(
                            context,
                          ).textTheme.labelSmall?.copyWith(fontSize: 9),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: LinearProgressIndicator(
              value: _engine.isComplete
                  ? 1
                  : _engine.comparisonCount / _engine.totalPossibleComparisons,
              minHeight: 6,
              backgroundColor: AppColors.bgSurface,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.accentCyan,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDecisionPanel() {
    final left = _engine.leftValue;
    final right = _engine.rightValue;

    return Container(
      key: ValueKey(
        'decision-${_engine.comparisonCount}-${_engine.mistakeCount}',
      ),
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: _feedbackIsError
              ? AppColors.error.withValues(alpha: 0.55)
              : AppColors.divider,
        ),
      ),
      child: Column(
        children: [
          Text(
            _engine.awaitingAdvance
                ? 'Machine executed your instruction'
                : 'Is $left greater than $right?',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontSize: 16),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 7),
          Text(
            _engine.awaitingAdvance
                ? _feedback!
                : 'Choose exactly what the algorithm should do next.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: _feedbackIsError
                  ? AppColors.error
                  : AppColors.textSecondary,
              height: 1.4,
            ),
            textAlign: TextAlign.center,
          ),
          if (_feedbackIsError) ...[
            const SizedBox(height: 8),
            Text(
              'Mistakes: ${_engine.mistakeCount}  •  Try this pair again',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.error,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 18),
          if (_engine.awaitingAdvance)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _advance,
                icon: Icon(
                  _engine.comparisonIndex ==
                          _engine.values.length - _engine.sortedCount - 2
                      ? Icons.flag_rounded
                      : Icons.arrow_forward_rounded,
                ),
                label: Text(
                  _engine.comparisonIndex ==
                          _engine.values.length - _engine.sortedCount - 2
                      ? 'Finish Pass ${_engine.pass}'
                      : 'Next Comparison',
                ),
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: _decisionButton(
                    label: 'KEEP',
                    subtitle: 'Already ordered',
                    icon: Icons.arrow_forward_rounded,
                    color: AppColors.success,
                    onTap: () => _submit(BubbleDecision.keep),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _decisionButton(
                    label: 'SWAP',
                    subtitle: 'Move left → right',
                    icon: Icons.swap_horiz_rounded,
                    color: AppColors.warning,
                    onTap: () => _submit(BubbleDecision.swap),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _decisionButton({
    required String label,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.45)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 25),
              const SizedBox(height: 6),
              Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.labelMedium?.copyWith(color: color, fontSize: 14),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(fontSize: 9),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCompletionCard() {
    return FadeInUp(
      key: const ValueKey('complete'),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.success.withValues(alpha: 0.09),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.35)),
        ),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_rounded,
                color: Colors.white,
                size: 30,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Array Sorted!',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 5),
            Text(
              '${_engine.comparisonCount} comparisons • ${_engine.swapCount} swaps • $_accuracy% accuracy',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                3,
                (index) => Icon(
                  index < _stars
                      ? Icons.star_rounded
                      : Icons.star_outline_rounded,
                  color: index < _stars ? Colors.amber : AppColors.textMuted,
                  size: 30,
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _startNewRound,
                icon: const Icon(Icons.replay_rounded),
                label: const Text('Play New Array'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHowItWorks() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.accentPurple.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.accentPurple.withValues(alpha: 0.18),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.psychology_rounded,
                color: AppColors.accentPurple,
                size: 19,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'How the machine thinks',
                  style: Theme.of(
                    context,
                  ).textTheme.headlineSmall?.copyWith(fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _rule('1', 'Compare only array[i] and array[i + 1].'),
          _rule('2', 'If left > right, swap. Otherwise, keep them.'),
          _rule(
            '3',
            'After each pass, the largest value is locked on the right.',
          ),
        ],
      ),
    );
  }

  Widget _rule(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 21,
            height: 21,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.accentPurple.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              number,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: AppColors.accentPurple,
                fontSize: 10,
              ),
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              text,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
