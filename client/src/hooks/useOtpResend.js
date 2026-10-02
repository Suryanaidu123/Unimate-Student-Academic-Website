import { useEffect, useState } from 'react';

/**
 * Simple cooldown timer for OTP resend buttons.
 * @param {number} seconds - Initial cooldown duration.
 */
export function useOtpResend(seconds = 30) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function start() {
    setCooldown(seconds);
  }

  return { cooldown, start, isCoolingDown: cooldown > 0 };
}