export type StrengthLevel = 'weak' | 'fair' | 'strong';

export interface PassphraseStrength {
  level: StrengthLevel;
  label: string;
  color: string;
  /** 0–3 score for progress display */
  score: number;
}

export function evaluatePassphrase(passphrase: string): PassphraseStrength {
  if (!passphrase) return { level: 'weak', label: '', color: '#94a3b8', score: 0 };

  let score = 0;
  if (passphrase.length >= 10) score++;
  if (passphrase.length >= 16) score++;
  if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) score++;
  if (/\d/.test(passphrase) || /[^a-zA-Z0-9]/.test(passphrase)) score++;
  // Multi-word passphrases (3+ words) are strong by nature
  if (passphrase.trim().split(/\s+/).length >= 3 && passphrase.length >= 16) score++;

  // Cap at 3
  score = Math.min(score, 3);

  if (score <= 1) return { level: 'weak', label: 'Weak', color: '#ef4444', score };
  if (score === 2) return { level: 'fair', label: 'Fair', color: '#f59e0b', score };
  return { level: 'strong', label: 'Strong', color: '#22c55e', score };
}

export function isPassphraseAcceptable(passphrase: string): boolean {
  if (passphrase.length < 12) return false;
  const { score } = evaluatePassphrase(passphrase);
  return score >= 2; // at least "fair" strength
}
