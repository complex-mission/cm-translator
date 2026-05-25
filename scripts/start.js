const { execSync } = require('child_process');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: __dirname + '/..' });
}

async function main() {
  console.log('\n=== CM Translator Startup ===\n');

  console.log('[1/3] Syncing database schema...');
  run('npx prisma db push --skip-generate');

  console.log('\n[2/3] Seeding default accounts...');
  run('npx tsx prisma/seed.ts');

  console.log('\n[3/3] Starting server...');
  run('npx next start -H 127.0.0.1 -p 65108');
}

main();
