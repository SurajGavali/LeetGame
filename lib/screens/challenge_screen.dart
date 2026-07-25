import 'package:flutter/material.dart';
import '../models/challenge.dart';
import '../utils/theme.dart';
import '../widgets/stock_trading_game.dart';
import '../widgets/reverse_integer_game.dart';

class ChallengeScreen extends StatefulWidget {
  final Challenge challenge;

  const ChallengeScreen({super.key, required this.challenge});

  @override
  State<ChallengeScreen> createState() => _ChallengeScreenState();
}

class _ChallengeScreenState extends State<ChallengeScreen> {
  int _currentTestCaseIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          '#${widget.challenge.leetcodeNumber}  ${widget.challenge.title}',
          overflow: TextOverflow.ellipsis,
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: _buildTestCaseTabs(),
        ),
      ),
      body: _buildGameWidget(),
    );
  }

  Widget _buildTestCaseTabs() {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: List.generate(widget.challenge.testCases.length, (i) {
          final isActive = i == _currentTestCaseIndex;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _currentTestCaseIndex = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.accentBlue.withValues(alpha: 0.15)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isActive
                        ? AppColors.accentBlue
                        : AppColors.divider,
                    width: 1,
                  ),
                ),
                child: Text(
                  'Case ${i + 1}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: isActive ? AppColors.accentBlue : AppColors.textMuted,
                        fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildGameWidget() {
    final testCase = widget.challenge.testCases[_currentTestCaseIndex];

    switch (widget.challenge.id) {
      case 'stock_trading':
        return StockTradingGame(
          key: ValueKey('stock_$_currentTestCaseIndex'),
          prices: List<int>.from(testCase.input as List),
          expectedProfit: testCase.expectedOutput as int,
          explanation: testCase.explanation,
          challenge: widget.challenge,
        );
      case 'reverse_integer':
        return ReverseIntegerGame(
          key: ValueKey('reverse_$_currentTestCaseIndex'),
          inputNumber: testCase.input as int,
          expectedOutput: testCase.expectedOutput as int,
          explanation: testCase.explanation,
          challenge: widget.challenge,
        );
      default:
        return const Center(child: Text('Challenge not found'));
    }
  }
}
