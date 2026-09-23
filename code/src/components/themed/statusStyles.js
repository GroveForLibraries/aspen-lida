/**
 * Fixed colors for each alert/toast status. 'default' and 'muted' are not included here; they are
 * resolved from the live theme instead (see resolveAlertColors).
 */
export const ALERT_STATUS_COLORS = {
  error: { bg: '#fecaca', icon: '#dc2625', text: '#000000' },
  warning: { bg: '#ffd7aa', icon: '#ea580b', text: '#000000' },
  success: { bg: '#bbf7d0', icon: '#17a34a', text: '#000000' },
  info: { bg: '#bae6fe', icon: '#0084c7', text: '#000000' },
  none: { bg: '#e6e7ea', icon: '#4f5562', text: '#000000' },
};

/**
 * Normalizes an action/status string to one of ALERT_STATUS_COLORS' keys: 'danger' becomes
 * 'error'; any falsy value becomes 'default'.
 * @param action
 * @returns {string}
 */
export function normalizeStatusAction(action) {
  if (action === 'danger') return 'error';
  return action || 'default';
}

/**
 * Resolves the background/border/icon/text colors for an alert or toast given its action.
 * error/warning/success/info/none use ALERT_STATUS_COLORS; 'muted' uses `neutrals`; any other
 * action (the default) uses the brand primary color.
 * @param action
 * @param brand
 * @param neutrals
 * @returns {{bg: string, border: string, icon: string, text: string}}
 */
export function resolveAlertColors(action, brand, neutrals) {
  const normalizedAction = normalizeStatusAction(action);
  const statusColors = ALERT_STATUS_COLORS[normalizedAction];
  if (statusColors) {
    return { bg: statusColors.bg, border: statusColors.bg, icon: statusColors.icon, text: statusColors.text };
  }
  if (normalizedAction === 'muted') {
    return { bg: neutrals.surface, border: neutrals.border, icon: neutrals.textSecondary, text: neutrals.textSecondary };
  }
  return {
    bg: brand.primary[500],
    border: brand.primary[500],
    icon: brand.primary['500-text'],
    text: brand.primary['500-text'],
  };
}
