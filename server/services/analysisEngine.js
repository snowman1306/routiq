/**
 * Advanced Habits Analysis Engine
 * Calculates scientific habit metrics, Pearson stress correlations, catalytic habits, and burnout predictions.
 */
class AnalysisEngine {
  /**
   * Calculate Pearson Correlation Coefficient (r) between stress_level and completion_percentage.
   * r ranges from -1 (strongly negative correlation) to +1 (strongly positive correlation).
   */
  static calculateStressCorrelation(logs) {
    const validLogs = logs.filter(l => l.stress_level !== null && l.stress_level !== undefined && l.completion_percentage !== null);
    if (validLogs.length < 3) return null;

    const n = validLogs.length;
    let sumX = 0; // Stress level
    let sumY = 0; // Completion level (0-3)
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    validLogs.forEach(l => {
      const x = Number(l.stress_level);
      const y = Number(l.completion_percentage);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(2));
  }

  /**
   * Calculates the Catalyst Habit Effect (conditional probabilities):
   * P(Habit A | Habit B) - P(Habit A | NOT Habit B)
   * This identifies high-leverage keystone habits that trigger other positive routines.
   */
  static getCatalystHabits(logs, habits) {
    if (habits.length < 2 || logs.length < 5) return [];

    const dates = [...new Set(logs.map(l => l.log_date))];
    const habitIds = habits.map(h => h.id);
    const catalystRelations = [];

    for (const hA of habitIds) {
      for (const hB of habitIds) {
        if (hA === hB) continue;

        let bCompletedCount = 0;
        let bCompletedAndACompleted = 0;
        let bNotCompletedCount = 0;
        let bNotCompletedAndACompleted = 0;

        dates.forEach(date => {
          const logA = logs.find(l => l.habit_id === hA && l.log_date === date);
          const logB = logs.find(l => l.habit_id === hB && l.log_date === date);

          const completedA = logA && Number(logA.completion_percentage) > 0;
          const completedB = logB && Number(logB.completion_percentage) > 0;

          if (completedB) {
            bCompletedCount++;
            if (completedA) bCompletedAndACompleted++;
          } else {
            bNotCompletedCount++;
            if (completedA) bNotCompletedAndACompleted++;
          }
        });

        const probAWithB = bCompletedCount > 0 ? bCompletedAndACompleted / bCompletedCount : 0;
        const probAWithoutB = bNotCompletedCount > 0 ? bNotCompletedAndACompleted / bNotCompletedCount : 0;
        const lift = probAWithB - probAWithoutB;

        if (lift > 0.1 && bCompletedCount > 0) {
          const nameA = habits.find(h => h.id === hA).name;
          const nameB = habits.find(h => h.id === hB).name;
          catalystRelations.push({
            catalyst: nameB,
            target: nameA,
            liftPercent: Math.round(lift * 100)
          });
        }
      }
    }

    return catalystRelations.sort((a, b) => b.liftPercent - a.liftPercent);
  }

  /**
   * Identifies day-of-week performance and willpower dips.
   */
  static getDayOfWeekWillpowerDips(logs) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completions = [0, 0, 0, 0, 0, 0, 0];
    const totals = [0, 0, 0, 0, 0, 0, 0];

    logs.forEach(l => {
      const day = new Date(l.log_date).getDay();
      totals[day]++;
      if (Number(l.completion_percentage) > 0) {
        completions[day]++;
      }
    });

    const results = dayNames.map((name, i) => ({
      day: name,
      rate: totals[i] > 0 ? Math.round((completions[i] / totals[i]) * 100) : 100
    }));

    // Filter to find days where completion rate is under 60%
    return results.filter(r => r.rate < 60).sort((a, b) => a.rate - b.rate);
  }

  /**
   * Evaluates if a user is approaching high stress/burnout.
   * Based on standard deviations and averages of rolling stress levels.
   */
  static detectPreBurnoutSignal(logs) {
    const stressLevels = logs.filter(l => l.stress_level).map(l => l.stress_level);
    if (stressLevels.length < 4) return { preBurnout: false, score: 0 };

    const avgStress = stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length;
    
    // Check if the latest logs show consistently rising stress
    const recentStress = stressLevels.slice(0, 3);
    const risingStress = recentStress.every((s, idx) => idx === 0 || s >= recentStress[idx - 1]);
    
    const preBurnout = avgStress >= 3.8 || (avgStress >= 3.2 && risingStress);
    return {
      preBurnout,
      score: Number(avgStress.toFixed(1))
    };
  }
}

module.exports = AnalysisEngine;
