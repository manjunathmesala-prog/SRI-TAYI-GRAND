const fs=require('fs');
let p='src/lib/auth.ts',s=fs.readFileSync(p,'utf8');
s=s.replace(/const AUTH_SECRET =[\s\S]*?;\r?\n/,"const AUTH_SECRET = process.env.ADMIN_JWT_SECRET || '';\n");
s=s.replace(/const MASTER_PASSWORD = .*;/,"const MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || '';");
s=s.replace(/process\.env\.(SUPER_ADMIN_PASSWORD|MANAGER_PASSWORD|STAFF_PASSWORD) \|\| '[^']+'/g,"process.env.$1 || ''");
s=s.replace('export function signSessionPayload(payload: object): string {',"export function signSessionPayload(payload: object): string {\n  if (AUTH_SECRET.length < 32) throw new Error('Staff authentication signing secret is not configured');");
s=s.replace('  if (!email || !password) {',"  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {");
s=s.replace('  // Check specific account credential or universal fallback',"  if (AUTH_SECRET.length < 32) return { success: false, error: 'Staff authentication is not configured' };\n\n  // Check explicitly configured account credentials");
s=s.replace('roleCred ? verifyPasswordMatch(password, roleCred.expectedPassword) : false',"roleCred?.expectedPassword ? verifyPasswordMatch(password, roleCred.expectedPassword) : false");
s=s.replace('const isMasterMatch = verifyPasswordMatch(password, MASTER_PASSWORD);',"const isMasterMatch = Boolean(MASTER_PASSWORD) && verifyPasswordMatch(password, MASTER_PASSWORD);");
s=s.replace('  if (!tokenString) return null;',"  if (!tokenString || AUTH_SECRET.length < 32) return null;");
s=s.replace('if (Date.now() > data.exp)',"if (typeof data.exp !== 'number' || !Number.isFinite(data.exp) || Date.now() >= data.exp)");
const fallbackStart=s.indexOf('    // Graceful backward-compatibility fallback');const fallbackEnd=s.indexOf('  } catch {',fallbackStart);s=s.slice(0,fallbackStart)+'    return null; // Unsigned legacy tokens are never authenticated.\n'+s.slice(fallbackEnd);
const roleStart=s.indexOf('  // Fallback: If no valid session');const roleEnd=s.indexOf('  if (!session) {\n    return { authorized: false',roleStart);
// Preserve line ending independence.
const match=s.slice(roleStart).match(/  if \(!session\) \{\r?\n    return \{ authorized: false/);if(!match)throw Error('role guard anchor missing');s=s.slice(0,roleStart)+s.slice(roleStart+match.index);
fs.writeFileSync(p,s);
p='src/app/admin/login/page.tsx';s=fs.readFileSync(p,'utf8');s=s.replace(/^    password: '[^']+',\r?\n/gm,'');s=s.replace(/const \[email, setEmail\] = useState\('[^']*'\);/,"const [email, setEmail] = useState('');");s=s.replace(/const \[password, setPassword\] = useState\('[^']*'\);/,"const [password, setPassword] = useState('');");s=s.replaceAll('setPassword(preset.password);',"setPassword('');");const start=s.indexOf('  const fastLoginAs =');const end=s.indexOf('  return (',start);s=s.slice(0,start)+s.slice(end);s=s.replace("const redirectPath = searchParams.get('redirect') || '/admin/dashboard';","const requestedRedirect = searchParams.get('redirect') || '';\n  const redirectPath = /^\\/admin(?:\\/[a-zA-Z0-9_-]+)*$/.test(requestedRedirect) && requestedRedirect !== '/admin/login'\n    ? requestedRedirect : '/admin/dashboard';");s=s.replace("{t('auth.fastRoleSelect', 'Select Role Profile (One-Tap Fast Login)')}","{isTelugu ? 'ఖాతాను ఎంచుకోండి' : 'Select Staff Account'}");s=s.replace("'3 Roles Verified'","'Password required'");s=s.replace('fastLoginAs(preset);','selectPreset(preset);');s=s.replace("{isTelugu ? 'తక్షణ ప్రవేశం →' : 'Instant Enter →'}","{isTelugu ? 'ఎంచుకోండి' : 'Select Account'}");fs.writeFileSync(p,s);
