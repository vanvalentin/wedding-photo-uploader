export function getAdminSecret(): string | null {
  return process.env.ADMIN_SECRET ?? null;
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminSecret());
}

export function extractAdminSecret(
  headers: Record<string, string | string[] | undefined>
): string | null {
  const headerSecret = headers['x-admin-secret'];
  if (typeof headerSecret === 'string' && headerSecret.trim()) {
    return headerSecret.trim();
  }

  const authorization = headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

export function verifyAdminSecret(
  headers: Record<string, string | string[] | undefined>
): boolean {
  const configuredSecret = getAdminSecret();
  if (!configuredSecret) return false;

  const providedSecret = extractAdminSecret(headers);
  return providedSecret === configuredSecret;
}
