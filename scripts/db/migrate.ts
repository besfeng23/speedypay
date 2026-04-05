import { ensureDatabaseInitialized } from '../../src/lib/db/postgres';

async function main() {
  await ensureDatabaseInitialized();
  console.log('Database migrations and bootstrap completed successfully.');
}

main().catch((error) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
