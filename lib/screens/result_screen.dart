import 'package:flutter/material.dart';
import 'package:confetti/confetti.dart';
import 'package:animate_do/animate_do.dart';
import 'package:provider/provider.dart';
import '../models/challenge.dart';
import '../models/game_state.dart';
import '../utils/theme.dart';

class ResultScreen extends StatefulWidget {
  final Challenge challenge;
  final int userResult;
  final int expectedResult;
  final int moveCount;
  final int optimalMoves;

  const ResultScreen({
    super.key,
    required this.challenge,
    required this.userResult,
    required this.expectedResult,
    required this.moveCount,
    required this.optimalMoves,
  });

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  late ConfettiController _confettiController;
  late int _stars;
  late bool _isCorrect;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 3));
    _isCorrect = widget.userResult == widget.expectedResult;
    _stars = _calculateStars();

    if (_isCorrect) {
      _confettiController.play();
      // Persist progress
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.read<GameState>().completeChallenge(
              widget.challenge.id,
              _stars,
              widget.challenge.xpReward,
            );
      });
    }
  }

  int _calculateStars() {
    if (!_isCorrect) return 0;
    if (widget.optimalMoves <= 0) return 3;

    final ratio = widget.moveCount / widget.optimalMoves;
    if (ratio <= 1.0) return 3;
    if (ratio <= 1.3) return 2;
    if (ratio <= 2.0) return 1;
    return 1;
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Column(
                children: [
                  const SizedBox(height: 24),
                  // Result icon
                  FadeInDown(
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: _isCorrect
                            ? const LinearGradient(
                                colors: [AppColors.success, Color(0xFF059669)],
                              )
                            : const LinearGradient(
                                colors: [AppColors.error, Color(0xFFDC2626)],
                              ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isCorrect ? AppColors.success : AppColors.error)
                                .withValues(alpha: 0.4),
                            blurRadius: 30,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Icon(
                        _isCorrect
                            ? Icons.check_rounded
                            : Icons.close_rounded,
                        color: Colors.white,
                        size: 48,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title
                  FadeInUp(
                    delay: const Duration(milliseconds: 200),
                    child: Text(
                      _isCorrect ? 'Challenge Solved!' : 'Not Quite...',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                  ),
                  const SizedBox(height: 8),
                  FadeInUp(
                    delay: const Duration(milliseconds: 300),
                    child: Text(
                      _isCorrect
                          ? 'You thought like a computer! 🧠'
                          : 'The expected answer was ${widget.expectedResult}',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Stars
                  if (_isCorrect)
                    FadeInUp(
                      delay: const Duration(milliseconds: 400),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(3, (i) {
                          final earned = i < _stars;
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: ZoomIn(
                              delay: Duration(milliseconds: 600 + i * 200),
                              child: Icon(
                                earned
                                    ? Icons.star_rounded
                                    : Icons.star_outline_rounded,
                                size: 48,
                                color: earned
                                    ? Colors.amber
                                    : AppColors.textMuted,
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                  const SizedBox(height: 32),

                  // Stats card
                  FadeInUp(
                    delay: const Duration(milliseconds: 500),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: AppColors.cardGradient,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child: Column(
                        children: [
                          _buildStatRow(
                            'Your Result',
                            '${widget.userResult}',
                            _isCorrect ? AppColors.success : AppColors.error,
                          ),
                          const Divider(color: AppColors.divider, height: 24),
                          _buildStatRow(
                            'Expected',
                            '${widget.expectedResult}',
                            AppColors.accentCyan,
                          ),
                          const Divider(color: AppColors.divider, height: 24),
                          _buildStatRow(
                            'Your Moves',
                            '${widget.moveCount}',
                            AppColors.textPrimary,
                          ),
                          if (widget.optimalMoves > 0) ...[
                            const Divider(color: AppColors.divider, height: 24),
                            _buildStatRow(
                              'Optimal Moves',
                              '${widget.optimalMoves}',
                              AppColors.accentBlue,
                            ),
                          ],
                          if (_isCorrect) ...[
                            const Divider(color: AppColors.divider, height: 24),
                            _buildStatRow(
                              'XP Earned',
                              '+${widget.challenge.xpReward}',
                              Colors.amber,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Algorithm insight
                  FadeInUp(
                    delay: const Duration(milliseconds: 600),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: AppColors.accentBlue.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: AppColors.accentBlue.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.lightbulb_rounded,
                                  color: AppColors.warning, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                'Algorithm Insight',
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(fontSize: 14),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            widget.challenge.algorithmHint,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Buttons
                  FadeInUp(
                    delay: const Duration(milliseconds: 700),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.divider),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Text(
                              'Try Again',
                              style: TextStyle(color: AppColors.textPrimary),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: AppColors.accentGradient,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.popUntil(context, (r) => r.isFirst);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              child: const Text('Home'),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // Confetti
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                AppColors.accentBlue,
                AppColors.accentCyan,
                AppColors.accentPurple,
                Colors.amber,
                AppColors.success,
              ],
              numberOfParticles: 30,
              gravity: 0.15,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: valueColor,
              ),
        ),
      ],
    );
  }
}
