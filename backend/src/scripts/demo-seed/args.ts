export const DRY_RUN_ENV = 'HMS_DEMO_SEED_DRY_RUN'

function isTruthy(value: string | undefined): boolean {
  return value === 'true' || value === '1'
}

export function isDryRunRequested(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
): boolean {
  if (argv.includes('--dry-run')) {
    return true
  }
  if (isTruthy(env[DRY_RUN_ENV])) {
    return true
  }
  // npm treats `--dry-run` as its own flag and does not forward it to the script.
  return isTruthy(env.npm_config_dry_run)
}
