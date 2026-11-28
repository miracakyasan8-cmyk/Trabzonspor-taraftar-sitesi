/**
 * Maç içi reyting hesabı — yalnızca ESPN'in resmi maç verisinden.
 * Şeffaf formül: 6.0 + gol 1.0 + asist 0.8 + kurtarış 0.15 (maks 3) + sakat/temiz vuruş 0.2
 * + kart cezaları (sarı -0.5, kırmızı -1.5). 1.0 ile 10.0 arasında, tek ondalık basamak.
 * Bu resmî bir federasyon reytingi değildir; şeffafçe hesaplanan bir göstergedir.
 */

export interface MatchPlayerStats {
  appearances?: number;
  foulsCommitted?: number;
  foulsSuffered?: number;
  ownGoals?: number;
  redCards?: number;
  yellowCards?: number;
  goalsConceded?: number;
  saves?: number;
  shotsFaced?: number;
  goalAssists?: number;
  shotsOnTarget?: number;
  totalGoals?: number;
  totalShots?: number;
  offsides?: number;
  /** Kaleciye özel: gol yemeden */
  cleanSheet?: number;
}

export function computeMatchRating(s: MatchPlayerStats, isGK: boolean): number {
  let r = 6.0;
  const g = s.totalGoals ?? 0;
  const a = s.goalAssists ?? 0;
  const saves = s.saves ?? 0;
  const onTarget = s.shotsOnTarget ?? 0;
  const cleanSheet = s.cleanSheet ?? 0;
  const y = s.yellowCards ?? 0;
  const red = s.redCards ?? 0;

  r += g * 1.0;
  r += a * 0.8;
  r += onTarget * 0.2;
  if (isGK) {
    r += Math.min(3, saves * 0.15);
    if (cleanSheet) r += 1.0;
    if (g === 0) r += 0.3; // kaleci gol yemezse ekstra
  }
  r -= y * 0.5;
  r -= red * 1.5;
  return Math.max(1.0, Math.min(10.0, Math.round(r * 10) / 10));
}
