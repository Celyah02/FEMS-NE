/**
 * Seed script — populates demo data for the Fire Extinguisher Management System.
 *
 * Safe to re-run: uses upserts keyed on natural keys (email / serial_number).
 * Demo passwords are hashed with bcrypt.
 *
 * Demo accounts (password for all = "Password123!"):
 *   admin@tzw.com      → admin
 *   inspector@tzw.com  → inspector
 *   user@tzw.com       → user
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

function connectionConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'fems',
    password: process.env.PGPASSWORD || 'fems_password',
    database: process.env.PGDATABASE || 'fems',
  };
}

const DEMO_PASSWORD = 'Celia2024'; // Change this to something else if you want a different demo password

async function main() {
  const client = new Client(connectionConfig());
  await client.connect();
  console.log('• Seeding database…');

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---- Users -------------------------------------------------------------
  const users = [
    ['Celia', 'Admin', 'admin@tzw.com', 'admin'],
    ['Furaha', 'Inspector', 'inspector@tzw.com', 'inspector'],
    ['keza', 'User', 'user@tzw.com', 'user'],
    ['Rukundo', 'Inspector', 'nina@tzw.com', 'inspector'],
  ];
  const userIds = {};
  for (const [first, last, email, role] of users) {
    const { rows } = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name  = EXCLUDED.last_name,
             role       = EXCLUDED.role
       RETURNING id`,
      [first, last, email, hash, role]
    );
    userIds[email] = rows[0].id;
  }
  console.log(`  ✓ ${users.length} users`);

  const adminId = userIds['admin@tzw.com'];
  const inspectorId = userIds['inspector@tzw.com'];
  const userId = userIds['user@tzw.com'];

  // ---- Fire extinguishers ------------------------------------------------
  const exts = [
    ['FE-1001', 'Building A — Lobby',        'co2',          '5lb',   '2023-01-15', '2028-01-15', 'active'],
    ['FE-1002', 'Building A — Kitchen',      'foam',         '9lb',   '2022-06-01', '2025-06-01', 'active'],
    ['FE-1003', 'Building B — Server Room',  'co2',          '12lb',  '2021-03-10', '2024-03-10', 'expired'],
    ['FE-1004', 'Building B — Floor 2',      'dry_chemical', '5lb',   '2023-09-20', '2026-09-20', 'active'],
    ['FE-1005', 'Warehouse — Bay 1',         'water',        '9lb',   '2020-11-05', '2025-11-05', 'maintenance'],
    ['FE-1006', 'Warehouse — Bay 2',         'dry_chemical', '12lb',  '2024-02-01', '2027-02-01', 'active'],
    ['FE-1007', 'Building C — Reception',    'co2',          '2.5lb', '2023-07-12', '2026-07-12', 'active'],
    ['FE-1008', 'Building C — Parking',      'foam',         '5lb',   '2019-05-30', '2024-05-30', 'expired'],
  ];
  const extIds = {};
  for (const [serial, location, type, size, install, expiry, status] of exts) {
    const { rows } = await client.query(
      `INSERT INTO fire_extinguishers
         (serial_number, location, type, size, installation_date, expiry_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (serial_number) DO UPDATE
         SET location = EXCLUDED.location,
             status   = EXCLUDED.status
       RETURNING id`,
      [serial, location, type, size, install, expiry, status, adminId]
    );
    extIds[serial] = rows[0].id;
  }
  console.log(`  ✓ ${exts.length} fire extinguishers`);

  // ---- Inspections (idempotent: clear + reinsert demo set) ---------------
  await client.query('DELETE FROM inspections');
  const inspections = [
    ['FE-1001', '2026-05-20', '09:00', 'completed', 'pass'],
    ['FE-1002', '2026-06-10', '10:30', 'pending',   null],
    ['FE-1003', '2026-04-01', '14:00', 'overdue',   null],
    ['FE-1004', '2026-06-15', '11:00', 'pending',   null],
    ['FE-1005', '2026-05-28', '08:30', 'completed', 'needs_maintenance'],
  ];
  const inspIds = {};
  for (const [serial, date, time, status, result] of inspections) {
    const { rows } = await client.query(
      `INSERT INTO inspections
         (extinguisher_id, scheduled_date, scheduled_time, status, result,
          assigned_to, scheduled_by, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        extIds[serial], date, time, status, result,
        inspectorId, userId,
        status === 'completed' ? `${date} ${time}` : null,
      ]
    );
    inspIds[serial] = rows[0].id;
  }
  console.log(`  ✓ ${inspections.length} inspections`);

  // ---- Maintenance logs --------------------------------------------------
  await client.query('DELETE FROM maintenance_logs');
  const maint = [
    ['FE-1005', 'Recharged cylinder', '2026-05-29', 'Low pressure detected', 'Pressure restored to normal', 'Schedule re-check in 6 months'],
    ['FE-1003', 'Flagged for replacement', '2026-04-02', 'Unit expired', 'Removed from service', 'Replace with new CO2 unit'],
  ];
  for (const [serial, action, date, issues, notes, recs] of maint) {
    await client.query(
      `INSERT INTO maintenance_logs
         (extinguisher_id, inspection_id, action_taken, maintenance_date,
          issues_identified, notes, recommendations, performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [extIds[serial], inspIds[serial] || null, action, date, issues, notes, recs, inspectorId]
    );
  }
  console.log(`  ✓ ${maint.length} maintenance logs`);

  // ---- Notifications -----------------------------------------------------
  await client.query('DELETE FROM notifications');
  await client.query(
    `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
     VALUES
       ($1, 'compliance', 'Extinguisher expired', 'FE-1003 has passed its expiry date.', 'extinguisher', $2),
       ($3, 'inspection', 'Inspection assigned', 'You have a pending inspection for FE-1002.', 'inspection', $4)`,
    [adminId, extIds['FE-1003'], inspectorId, inspIds['FE-1002']]
  );
  console.log('  ✓ notifications');

  console.log('• Seed complete. Demo login: admin@tzw.com / Password123!');
  await client.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
