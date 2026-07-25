import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:animate_do/animate_do.dart';
import '../models/challenge.dart';
import '../screens/result_screen.dart';
import '../utils/theme.dart';

class StockTradingGame extends StatefulWidget {
  final List<int> prices;
  final int expectedProfit;
  final String explanation;
  final Challenge challenge;

  const StockTradingGame({
    super.key,
    required this.prices,
    required this.expectedProfit,
    required this.explanation,
    required this.challenge,
  });

  @override
  State<StockTradingGame> createState() => _StockTradingGameState();
}

class _StockTradingGameState extends State<StockTradingGame>
    with TickerProviderStateMixin {
  int _currentDay = 0;
  bool _isHolding = false;
  int _buyPrice = 0;
  int _totalProfit = 0;
  int _moveCount = 0;
  bool _gameComplete = false;
  final List<_Transaction> _transactions = [];

  // Animation
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _onBuy() {
    if (_isHolding || _gameComplete) return;
    setState(() {
      _isHolding = true;
      _buyPrice = widget.prices[_currentDay];
      _transactions.add(_Transaction(
        day: _currentDay,
        price: _buyPrice,
        isBuy: true,
      ));
      _moveCount++;
      _advanceDay();
    });
  }

  void _onSell() {
    if (!_isHolding || _gameComplete) return;
    final sellPrice = widget.prices[_currentDay];
    final profit = sellPrice - _buyPrice;
    setState(() {
      _isHolding = false;
      _totalProfit += profit;
      _transactions.add(_Transaction(
        day: _currentDay,
        price: sellPrice,
        isBuy: false,
        profit: profit,
      ));
      _moveCount++;
      _advanceDay();
    });
  }

  void _onSkip() {
    if (_gameComplete) return;
    setState(() {
      _moveCount++;
      _advanceDay();
    });
  }

  void _advanceDay() {
    if (_currentDay >= widget.prices.length - 1) {
      // If still holding on last day, auto-sell
      if (_isHolding) {
        final sellPrice = widget.prices[_currentDay];
        final profit = sellPrice - _buyPrice;
        _totalProfit += profit;
        _isHolding = false;
        _transactions.add(_Transaction(
          day: _currentDay,
          price: sellPrice,
          isBuy: false,
          profit: profit,
        ));
      }
      _gameComplete = true;
    } else {
      _currentDay++;
    }
  }

  int get _optimalMoves {
    int moves = 0;
    for (int i = 1; i < widget.prices.length; i++) {
      if (widget.prices[i] > widget.prices[i - 1]) {
        moves += 2; // buy + sell
      }
    }
    return moves.clamp(1, widget.prices.length * 2);
  }

  void _navigateToResult() {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context1, anim1, anim2) => ResultScreen(
          challenge: widget.challenge,
          userResult: _totalProfit,
          expectedResult: widget.expectedProfit,
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
    final maxPrice = widget.prices.reduce((a, b) => a > b ? a : b);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Think like a computer hint
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
                      '🧠 You can only see today\'s price. Decide: Buy, Sell, or Skip!',
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
          const SizedBox(height: 20),

          // Stock chart
          FadeInUp(
            delay: const Duration(milliseconds: 100),
            child: Container(
              height: 220,
              padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
              decoration: BoxDecoration(
                gradient: AppColors.cardGradient,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.divider),
              ),
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceEvenly,
                  maxY: maxPrice.toDouble() * 1.2,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    show: true,
                    topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        getTitlesWidget: (v, _) => Text(
                          '${v.toInt()}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (v, _) {
                          final idx = v.toInt();
                          final isRevealed = idx <= _currentDay;
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              'D${idx + 1}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    fontSize: 10,
                                    color: idx == _currentDay
                                        ? AppColors.accentCyan
                                        : isRevealed
                                            ? AppColors.textMuted
                                            : Colors.transparent,
                                    fontWeight: idx == _currentDay
                                        ? FontWeight.w700
                                        : FontWeight.w400,
                                  ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawHorizontalLine: true,
                    drawVerticalLine: false,
                    horizontalInterval: maxPrice / 4,
                    getDrawingHorizontalLine: (_) => FlLine(
                      color: AppColors.divider.withValues(alpha: 0.5),
                      strokeWidth: 0.5,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: List.generate(widget.prices.length, (i) {
                    final isRevealed = i <= _currentDay;
                    final isCurrent = i == _currentDay;
                    final isBuyDay = _transactions.any(
                        (t) => t.day == i && t.isBuy);
                    final isSellDay = _transactions.any(
                        (t) => t.day == i && !t.isBuy);

                    Color barColor;
                    if (!isRevealed) {
                      barColor = AppColors.divider.withValues(alpha: 0.3);
                    } else if (isBuyDay) {
                      barColor = AppColors.buy;
                    } else if (isSellDay) {
                      barColor = AppColors.sell;
                    } else if (isCurrent) {
                      barColor = AppColors.accentCyan;
                    } else {
                      barColor = AppColors.accentBlue.withValues(alpha: 0.5);
                    }

                    return BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: isRevealed
                              ? widget.prices[i].toDouble()
                              : maxPrice * 0.3,
                          width: 20,
                          color: barColor,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(6),
                            topRight: Radius.circular(6),
                          ),
                        ),
                      ],
                    );
                  }),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Current state
          FadeInUp(
            delay: const Duration(milliseconds: 200),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppColors.cardGradient,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.divider),
              ),
              child: Row(
                children: [
                  _buildStateChip(
                    'Day',
                    '${_currentDay + 1}/${widget.prices.length}',
                    AppColors.accentCyan,
                  ),
                  const SizedBox(width: 12),
                  _buildStateChip(
                    'Price',
                    '\$${widget.prices[_currentDay]}',
                    AppColors.textPrimary,
                  ),
                  const SizedBox(width: 12),
                  _buildStateChip(
                    'Status',
                    _isHolding ? '📈 Holding' : '💰 Cash',
                    _isHolding ? AppColors.warning : AppColors.success,
                  ),
                  const SizedBox(width: 12),
                  _buildStateChip(
                    'Profit',
                    '\$$_totalProfit',
                    _totalProfit >= 0 ? AppColors.success : AppColors.error,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Action buttons
          if (!_gameComplete)
            FadeInUp(
              delay: const Duration(milliseconds: 300),
              child: Row(
                children: [
                  // Buy button
                  Expanded(
                    child: _buildActionButton(
                      label: 'Buy',
                      icon: Icons.shopping_cart_rounded,
                      color: AppColors.buy,
                      enabled: !_isHolding,
                      onTap: _onBuy,
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Sell button
                  Expanded(
                    child: _buildActionButton(
                      label: 'Sell',
                      icon: Icons.sell_rounded,
                      color: AppColors.sell,
                      enabled: _isHolding,
                      onTap: _onSell,
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Skip button
                  Expanded(
                    child: _buildActionButton(
                      label: 'Skip',
                      icon: Icons.skip_next_rounded,
                      color: AppColors.textMuted,
                      enabled: true,
                      onTap: _onSkip,
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
                  color: (_totalProfit == widget.expectedProfit
                          ? AppColors.success
                          : AppColors.warning)
                      .withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: (_totalProfit == widget.expectedProfit
                            ? AppColors.success
                            : AppColors.warning)
                        .withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      _totalProfit == widget.expectedProfit
                          ? '✅ Optimal! You got the maximum profit!'
                          : '⚠️ You got \$$_totalProfit, but the optimal was \$${widget.expectedProfit}',
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
          const SizedBox(height: 20),

          // Transaction log
          if (_transactions.isNotEmpty) ...[
            Text(
              'Transaction Log',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontSize: 14,
                  ),
            ),
            const SizedBox(height: 10),
            ..._transactions.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.bgSurface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          t.isBuy
                              ? Icons.arrow_upward_rounded
                              : Icons.arrow_downward_rounded,
                          color: t.isBuy ? AppColors.buy : AppColors.sell,
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${t.isBuy ? "Buy" : "Sell"} on Day ${t.day + 1} @ \$${t.price}',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.textPrimary,
                                  ),
                        ),
                        if (!t.isBuy) ...[
                          const Spacer(),
                          Text(
                            '${t.profit! >= 0 ? "+" : ""}\$${t.profit}',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: t.profit! >= 0
                                      ? AppColors.success
                                      : AppColors.error,
                                ),
                          ),
                        ],
                      ],
                    ),
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildStateChip(String label, String value, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontSize: 10,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: enabled
              ? color.withValues(alpha: 0.12)
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
              size: 24,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: enabled
                        ? color
                        : AppColors.textMuted.withValues(alpha: 0.5),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Transaction {
  final int day;
  final int price;
  final bool isBuy;
  final int? profit;

  _Transaction({
    required this.day,
    required this.price,
    required this.isBuy,
    this.profit,
  });
}
