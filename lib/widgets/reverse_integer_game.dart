import 'package:flutter/material.dart';
import 'package:animate_do/animate_do.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/challenge.dart';
import '../screens/result_screen.dart';
import '../utils/theme.dart';

class ReverseIntegerGame extends StatefulWidget {
  final int inputNumber;
  final int expectedOutput;
  final String explanation;
  final Challenge challenge;

  const ReverseIntegerGame({
    super.key,
    required this.inputNumber,
    required this.expectedOutput,
    required this.explanation,
    required this.challenge,
  });

  @override
  State<ReverseIntegerGame> createState() => _ReverseIntegerGameState();
}

class _ReverseIntegerGameState extends State<ReverseIntegerGame>
    with TickerProviderStateMixin {
  late int _currentNumber;
  int _result = 0;
  int _extractedDigit = 0;
  int _moveCount = 0;
  bool _gameComplete = false;
  late bool _isNegative;
  final List<_Step> _steps = [];
  String? _errorMessage;

  // For animation
  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  static const int _int32Max = 2147483647;
  static const int _int32Min = -2147483648;

  @override
  void initState() {
    super.initState();
    _isNegative = widget.inputNumber < 0;
    _currentNumber = widget.inputNumber.abs();

    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 8).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticIn),
    );
  }

  @override
  void dispose() {
    _shakeController.dispose();
    super.dispose();
  }

  void _extractDigit() {
    if (_gameComplete || _currentNumber == 0) return;

    setState(() {
      _extractedDigit = _currentNumber % 10;
      _steps.add(_Step(
        operation: '$_currentNumber % 10 = $_extractedDigit',
        description: 'Extract last digit using modulo',
        currentNumber: _currentNumber,
        result: _result,
        digit: _extractedDigit,
      ));
      _moveCount++;
      _errorMessage = null;
    });
  }

  void _removeLastDigit() {
    if (_gameComplete || _extractedDigit == 0 && _currentNumber == 0) return;

    if (_steps.isEmpty || !_steps.last.operation.contains('%')) {
      _showError('Extract a digit first using % 10');
      return;
    }

    setState(() {
      final prevNumber = _currentNumber;
      _currentNumber = _currentNumber ~/ 10;
      _steps.add(_Step(
        operation: '$prevNumber ÷ 10 = $_currentNumber',
        description: 'Remove last digit using integer division',
        currentNumber: _currentNumber,
        result: _result,
        digit: _extractedDigit,
      ));
      _moveCount++;
      _errorMessage = null;
    });
  }

  void _buildResult() {
    if (_gameComplete) return;

    if (_steps.isEmpty || !_steps.last.operation.contains('÷')) {
      _showError('Remove the digit first using ÷ 10');
      return;
    }

    setState(() {
      final prevResult = _result;
      _result = _result * 10 + _extractedDigit;

      // Check overflow
      if (_result > _int32Max || (_isNegative && -_result < _int32Min)) {
        _steps.add(_Step(
          operation: '$prevResult × 10 + $_extractedDigit = OVERFLOW!',
          description: '⚠️ Overflow detected! Result exceeds 32-bit range',
          currentNumber: _currentNumber,
          result: 0,
          digit: _extractedDigit,
          isOverflow: true,
        ));
        _result = 0;
        _gameComplete = true;
      } else {
        _steps.add(_Step(
          operation: '$prevResult × 10 + $_extractedDigit = $_result',
          description: 'Build result: result × 10 + digit',
          currentNumber: _currentNumber,
          result: _result,
          digit: _extractedDigit,
        ));
      }

      _moveCount++;
      _errorMessage = null;

      // Check if done
      if (_currentNumber == 0 && !_gameComplete) {
        _gameComplete = true;
        if (_isNegative) _result = -_result;
      }
    });
  }

  void _showError(String msg) {
    setState(() => _errorMessage = msg);
    _shakeController.forward(from: 0);
  }

  int get _optimalMoves {
    // 3 moves per digit (extract, remove, build)
    final digits = widget.inputNumber.abs().toString().length;
    return digits * 3;
  }

  void _navigateToResult() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context1, anim1, anim2) => ResultScreen(
          challenge: widget.challenge,
          userResult: _result,
          expectedResult: widget.expectedOutput,
          moveCount: _moveCount,
          optimalMoves: _optimalMoves,
        ),
        transitionsBuilder: (context2, animation, anim3, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hint
          FadeInDown(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.accentPurple.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.accentPurple.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.psychology_rounded,
                      color: AppColors.accentPurple, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '🧠 Extract digits one by one using math operations — no string flipping!',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.accentPurple,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Number display
          FadeInUp(
            delay: const Duration(milliseconds: 100),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: AppColors.cardGradient,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.divider),
              ),
              child: Column(
                children: [
                  // Input number with digit boxes
                  _buildNumberSection(
                    'Input Number',
                    widget.inputNumber,
                    AppColors.textMuted,
                    fadedOut: true,
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: AppColors.divider),
                  const SizedBox(height: 20),
                  // Current number
                  _buildNumberSection(
                    'Current Number',
                    _isNegative && _currentNumber != 0
                        ? -_currentNumber
                        : _currentNumber,
                    AppColors.accentCyan,
                  ),
                  const SizedBox(height: 20),
                  // Extracted digit
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Extracted Digit: ',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _extractedDigit > 0
                              ? AppColors.warning.withValues(alpha: 0.15)
                              : AppColors.bgSurface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _extractedDigit > 0
                                ? AppColors.warning
                                : AppColors.divider,
                            width: 1.5,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            '$_extractedDigit',
                            style: GoogleFonts.jetBrainsMono(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: _extractedDigit > 0
                                  ? AppColors.warning
                                  : AppColors.textMuted,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: AppColors.divider),
                  const SizedBox(height: 20),
                  // Result being built
                  _buildNumberSection(
                    'Result',
                    _result,
                    AppColors.success,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Error message
          if (_errorMessage != null)
            AnimatedBuilder(
              animation: _shakeAnimation,
              builder: (_, child) {
                return Transform.translate(
                  offset: Offset(_shakeAnimation.value, 0),
                  child: child,
                );
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: AppColors.error.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _errorMessage!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          const SizedBox(height: 16),

          // Operation buttons
          if (!_gameComplete)
            FadeInUp(
              delay: const Duration(milliseconds: 200),
              child: Row(
                children: [
                  Expanded(
                    child: _buildOpButton(
                      label: '% 10',
                      subtitle: 'Extract digit',
                      color: AppColors.accentCyan,
                      icon: Icons.content_cut_rounded,
                      onTap: _currentNumber > 0 ? _extractDigit : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildOpButton(
                      label: '÷ 10',
                      subtitle: 'Remove digit',
                      color: AppColors.accentBlue,
                      icon: Icons.remove_circle_outline_rounded,
                      onTap: _currentNumber > 0 ? _removeLastDigit : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildOpButton(
                      label: '×10 + d',
                      subtitle: 'Build result',
                      color: AppColors.success,
                      icon: Icons.add_circle_outline_rounded,
                      onTap: _buildResult,
                    ),
                  ),
                ],
              ),
            ),

          // Game complete
          if (_gameComplete) ...[
            const SizedBox(height: 8),
            FadeInUp(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: (_result == widget.expectedOutput
                          ? AppColors.success
                          : AppColors.warning)
                      .withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: (_result == widget.expectedOutput
                            ? AppColors.success
                            : AppColors.warning)
                        .withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      _result == widget.expectedOutput
                          ? '✅ Correct! You reversed it like a CPU!'
                          : '⚠️ Got $_result, expected ${widget.expectedOutput}',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: AppColors.accentGradient,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: ElevatedButton(
                          onPressed: _navigateToResult,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text('View Results'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),

          // Step history
          if (_steps.isNotEmpty) ...[
            Text(
              'Step History',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontSize: 14,
                  ),
            ),
            const SizedBox(height: 10),
            ..._steps.asMap().entries.map((entry) {
              final i = entry.key;
              final step = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: step.isOverflow
                        ? AppColors.error.withValues(alpha: 0.08)
                        : AppColors.bgSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: step.isOverflow
                        ? Border.all(
                            color: AppColors.error.withValues(alpha: 0.3))
                        : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: AppColors.accentBlue.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Center(
                              child: Text(
                                '${i + 1}',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: AppColors.accentBlue,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 11,
                                    ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              step.operation,
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: step.isOverflow
                                    ? AppColors.error
                                    : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Padding(
                        padding: const EdgeInsets.only(left: 34),
                        child: Text(
                          step.description,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    fontSize: 11,
                                  ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _buildNumberSection(String label, int number, Color color,
      {bool fadedOut = false}) {
    final digits = number.abs().toString().split('');
    final showSign = number < 0;

    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 6,
          children: [
            if (showSign)
              _buildDigitBox('-', color, fadedOut: fadedOut),
            if (number == 0)
              _buildDigitBox('0', color, fadedOut: fadedOut),
            ...digits.map((d) => _buildDigitBox(d, color, fadedOut: fadedOut)),
          ],
        ),
      ],
    );
  }

  Widget _buildDigitBox(String digit, Color color, {bool fadedOut = false}) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: 42,
      height: 50,
      decoration: BoxDecoration(
        color: fadedOut
            ? AppColors.bgSurface
            : color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: fadedOut
              ? AppColors.divider
              : color.withValues(alpha: 0.5),
          width: 1.5,
        ),
      ),
      child: Center(
        child: Text(
          digit,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: fadedOut ? AppColors.textMuted : color,
          ),
        ),
      ),
    );
  }

  Widget _buildOpButton({
    required String label,
    required String subtitle,
    required Color color,
    required IconData icon,
    VoidCallback? onTap,
  }) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: enabled
              ? color.withValues(alpha: 0.1)
              : AppColors.bgSurface.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: enabled ? color.withValues(alpha: 0.4) : AppColors.divider,
            width: 1.5,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: enabled ? color : AppColors.textMuted.withValues(alpha: 0.5),
              size: 22,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.jetBrainsMono(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: enabled ? color : AppColors.textMuted.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontSize: 9,
                    color: enabled ? color.withValues(alpha: 0.7) : AppColors.textMuted,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Step {
  final String operation;
  final String description;
  final int currentNumber;
  final int result;
  final int digit;
  final bool isOverflow;

  _Step({
    required this.operation,
    required this.description,
    required this.currentNumber,
    required this.result,
    required this.digit,
    this.isOverflow = false,
  });
}
