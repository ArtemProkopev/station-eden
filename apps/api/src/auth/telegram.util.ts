import crypto from 'node:crypto';
export function verifyTelegramAuth(params: Record<string,string>, botToken: string): boolean {
  const authData = { ...params };
  const hash = authData.hash;
  delete authData.hash;
  const dataCheckString = Object.keys(authData)
    .sort()
    .map(k => `${k}=${authData[k]}`)
    .join('\\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === hash;
}
