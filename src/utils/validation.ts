/**
 * Indian Mobile Number & Payout Validation Utilities
 *
 * In India's National Numbering Plan:
 * - 0: STD trunk prefix for inter-city access
 * - 1: Reserved for emergency & special service shortcodes (100, 101, 108, 112, etc.)
 * - 2-5: Reserved for fixed-line / landline telecom circles
 * - 6, 7, 8, 9: The only digits allocated for public mobile telephone services.
 */

/**
 * Extracts digits and slices the last 10 digits if a country code like +91 or trunk 0 is present.
 */
export function extract10DigitNumber(input?: string): string {
  if (!input || typeof input !== 'string') return '';
  const digits = input.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Returns true if the given number is a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.
 */
export function isValidIndianMobile(input?: string): boolean {
  const digits = extract10DigitNumber(input);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Provides live contextual helper / validation feedback for input fields.
 */
export function getIndianMobileLiveStatus(input: string): {
  isValid: boolean;
  isError: boolean;
  message: string;
} {
  const cleaned = input.replace(/\D/g, '');

  if (!cleaned) {
    return {
      isValid: false,
      isError: false,
      message: 'Enter 10-digit mobile number starting with 6, 7, 8, or 9',
    };
  }

  // Check initial digit
  const firstDigit = cleaned[0];
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      isValid: false,
      isError: true,
      message: `⚠️ Indian mobile numbers cannot start with '${firstDigit}'. Must start with 6, 7, 8, or 9`,
    };
  }

  if (cleaned.length < 10) {
    const remaining = 10 - cleaned.length;
    return {
      isValid: false,
      isError: false,
      message: `Enter ${remaining} more digit${remaining > 1 ? 's' : ''} (10 digits required)`,
    };
  }

  if (cleaned.length === 10) {
    return {
      isValid: true,
      isError: false,
      message: '✓ Valid 10-digit Indian mobile number',
    };
  }

  // If > 10 digits entered somehow
  const last10 = cleaned.slice(-10);
  if (/^[6-9]\d{9}$/.test(last10)) {
    return {
      isValid: true,
      isError: false,
      message: '✓ Valid 10-digit Indian mobile number',
    };
  }

  return {
    isValid: false,
    isError: true,
    message: '⚠️ Invalid mobile number. Must start with 6, 7, 8, or 9',
  };
}
