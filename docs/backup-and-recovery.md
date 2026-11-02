# Backup & Recovery (spec section 80)

Ei document-er `[FILL]` gulo apnake thik korte hobe: ami apnar Supabase plan/region/contract jani na.

## 1. Ki ki backup hoy
| Jinish | Kothay ache | Backup kibhabe |
|---|---|---|
| Database (shob table) | Supabase Postgres | Supabase backup (plan-er upor nirbhor, dekhun Dashboard > Database > Backups) + nijer `pg_dump` (nicher command) |
| Uploaded file | Ei project-e file nijer storage-e rakhe na, shudhu document link (URL) rakhe | Link-er file jekhane ache (Drive/SharePoint), shekhaner backup policy |
| Code | Git | Git remote (GitHub) |
| Secrets (`.env`) | Host-er environment variables | Password manager-e alada copy. Git-e kokhono na |

[FILL] Apnar Supabase plan-e daily backup/PITR (point-in-time recovery) ache kina: Supabase dashboard-e Backups page-e dekhun. Free plan-e downloadable backup na-o thakte pare, tai nijer `pg_dump` neya joruri.

## 2. Nijer backup neya (kono plan-e-i kaj kore)
`DIRECT_URL` hocche Supabase-er direct connection string (pooler na).

```powershell
# PostgreSQL client tools install thakte hobe (pg_dump)
$ts = Get-Date -Format "yyyyMMdd-HHmm"
pg_dump "$env:DIRECT_URL" --format=custom --no-owner --no-privileges --file "backup-$ts.dump"
```
- File ta project folder-er baire, encrypted jaygay rakhun (`.dump`-e user data thake).
- Proti raat auto korte chaile GitHub Actions scheduled workflow ba host-er cron use korun, secret hishebe `DIRECT_URL`.

## 3. Restore test (mashe ekbar, spec bole "Restore testing")
Kokhono production DB-te restore test korben na.
1. Supabase-e notun ekta khali project banan (ba local Postgres).
2. `pg_restore --no-owner --no-privileges --dbname "<new-db-direct-url>" backup-XXXX.dump`
3. Check: `SELECT count(*) FROM "Order";` `SELECT count(*) FROM "StockTransaction";` production-er shathe milan.
4. Notun DB-r URL diye local app chalan, login korun, ekta order khule dekhun.
5. Test-er tarikh, kon backup file, koto minute legeche: nicher table-e likhun.

| Tarikh | Backup file | Restore-e shomoy | Result | Kon kore |
|---|---|---|---|---|
| [FILL] | | | | |

## 4. RPO / RTO / Retention (apnake thik korte hobe)
| Mane | Proposed | Apnar shiddhanto |
|---|---|---|
| RPO: koto shomoyer data hariye gele cholbe | 24 ghonta (daily backup) ba 5 min (PITR thakle) | [FILL] |
| RTO: koto shomoy-e abar chalu hote hobe | 4 ghonta | [FILL] |
| Retention: backup koto din rakhbo | 30 din daily + 12 mash-er proti mash-er ekta | [FILL] |

## 5. Disaster hole ki korben (checklist)
1. Ki hariyeche bujhun: shudhu app down, na DB data nosto?
2. App down hole host-er last good deploy-e rollback korun. `/api/health` check korun.
3. DB data nosto hole: notun DB banan, sorboshesh bhalo backup restore korun (section 3-er moto).
4. App-er `DATABASE_URL` / `DIRECT_URL` notun DB-te bodlan, redeploy.
5. `npx prisma migrate status` chalan: migration history DB-r shathe milche kina dekhun.
6. Shob user-er password/secret leak-er shondeho thakle: `AUTH_SECRET` rotate korun (shobai logout hobe) ar DB password bodlan.
7. Ki hoyechilo, kokhon, ki kora holo: likhe rakhun.

## 6. Secret rotate korar talika (leak hole)
- DB password (Supabase) ar `DATABASE_URL`/`DIRECT_URL`
- `AUTH_SECRET` (rotate korle MFA secret decrypt hobe na: tai rotate korle `UserMfa` table khali kore shobai-ke MFA abar set korte hobe)
- Je kono email/SMTP key, API key
