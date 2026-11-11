const fs=require('fs');let p='src/components/admin/AdminHeader.tsx',s=fs.readFileSync(p,'utf8');s=s.replace(/  const \[switching, setSwitching\] = useState\(false\);\r?\n/,'');let a=s.indexOf('  const switchAccount ='),b=s.indexOf('  const handleLogout =',a);s=s.slice(0,a)+s.slice(b);a=s.indexOf('              {/* Fast Role Switching Section */}');b=s.indexOf('              {/* Sign Out Button */}',a);s=s.slice(0,a)+s.slice(b);fs.writeFileSync(p,s);
p='src/app/admin/analytics/page.tsx';s=fs.readFileSync(p,'utf8');s=s.replace('useState<Date>(new Date())','useState<Date | null>(null)');s=s.replace('{analytics?.kpis.totalRooms || 25}','{analytics?.kpis.totalRooms ?? \'—\'}').replace('{analytics?.kpis.availableRooms ?? 18}',"{analytics?.kpis.availableRooms ?? '—'}").replace('{analytics?.kpis.occupiedRooms ?? 5}',"{analytics?.kpis.occupiedRooms ?? '—'}").replace('{analytics?.kpis.maintenanceRooms ?? 2}',"{analytics?.kpis.maintenanceRooms ?? '—'}");s=s.replace("{lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}","{lastRefreshed?.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? 'Awaiting data'}");a=s.indexOf('              <div\n                style={{ width: \'58%\' }}');if(a<0)a=s.indexOf('              <div\r\n                style={{ width: \'58%\' }}');b=s.indexOf('            </div>',a);if(a<0||b<0)throw Error('chart anchor missing');s=s.slice(0,a)+`              {analytics?.channelBreakdown.map((channel, index) => (
                <div
                  key={channel.name}
                  style={{ width: \`\${Math.max(0, Math.min(100, channel.percentage))}%\` }}
                  className={['bg-[#43001F] h-full', 'bg-[#D8AD56] h-full', 'bg-[#786A5B] h-full'][index % 3]}
                  title={\`\${channel.name} (\${channel.percentage}%)\`}
                />
              ))}
`+s.slice(b);fs.writeFileSync(p,s);
