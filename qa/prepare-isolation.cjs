const fs=require('fs');
const names=[...fs.readFileSync('src/lib/db/supabase-sync.ts','utf8').matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
let content="import { vi } from 'vitest';\n";
content+="vi.mock('@/lib/db/supabase-sync', () => ({\n"+names.map(n=>n+": vi.fn("+(n==='getSupabasePgPool'?'() => null':n.startsWith('load')?'async () => []':'async () => undefined')+")").join(',\n')+"\n}));\n";
content+="vi.mock('@/lib/db/supabase-rfid', () => ({syncCardToSupabase:vi.fn(async()=>{}),syncEventToSupabase:vi.fn(async()=>{}),deleteCardFromSupabase:vi.fn(async()=>{})}));\n";
content+="vi.mock('@/lib/db/card-storage', () => { let cards:any[]=[]; let events:any[]=[]; return {loadPersistedCards:()=>structuredClone(cards),savePersistedCards:(v:any[])=>{cards=structuredClone(v)},loadPersistedEvents:()=>structuredClone(events),savePersistedEvents:(v:any[])=>{events=structuredClone(v)}};});\n";
fs.writeFileSync('qa/isolated-setup.ts',content);
