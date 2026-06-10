/**
 * Local API test harness for Courier v2
 * Usage: npx tsx dev/test-api.ts
 */

import { register, login, setAuthToken, getProfile, updateProfile, lookupUser } from '../src/api';
import { SERVER_URL } from '../src/config';

async function test() {
  console.log('Server:', SERVER_URL);

  // --- Register ---
  const dispName = 'TestUser';
  const password = 'test1234';
  process.stdout.write(`\n[1] Registering as "${dispName}" ... `);
  const reg = await register(dispName, password);
  console.log('OK');
  console.log(`    username: ${reg.user.username}`);
  console.log(`    token:    ${reg.token.slice(0, 20)}...`);
  setAuthToken(reg.token);

  // --- Profile ---
  process.stdout.write(`\n[2] Getting profile ... `);
  const profile = await getProfile();
  console.log('OK');
  console.log(`    username:    ${profile.username}`);
  console.log(`    displayName: "${profile.displayName}"`);
  console.log(`    bio: "${profile.bio}"`);

  // --- Update profile ---
  process.stdout.write(`\n[3] Updating profile ... `);
  const updated = await updateProfile({ displayName: 'Altered Name', bio: 'Test biography' });
  console.log(`OK (displayName: ${updated.displayName}, bio: ${updated.bio})`);

  // --- Lookup user ---
  process.stdout.write(`\n[4] Looking up "${reg.user.username}" ... `);
  const found = await lookupUser(reg.user.username);
  console.log(`OK (exists: ${found.exists}, displayName: ${found.displayName})`);

  // --- Lookup nonexistent ---
  process.stdout.write(`\n[5] Looking up "nobody-here-xyz" ... `);
  const miss = await lookupUser('nobody-here-xyz');
  console.log(`OK (exists: ${miss.exists})`);

  // --- Login with correct password ---
  process.stdout.write(`\n[6] Logging in as "${reg.user.username}" ... `);
  const loginRes = await login(reg.user.username, password);
  console.log('OK');
  console.log(`    token matches: ${loginRes.token === reg.token ? 'yes' : 'no (expected, new token)'}`);

  // --- Login wrong password ---
  process.stdout.write(`\n[7] Login with wrong password ... `);
  try {
    await login(reg.user.username, 'wrong');
    console.log('FAIL — should have returned 401');
  } catch (err: any) {
    console.log(`OK (expected: ${err.message.slice(0, 60)})`);
  }

  // --- Login wrong username ---
  process.stdout.write(`\n[8] Login with wrong username ... `);
  try {
    await login('nonexistent-user-999', password);
    console.log('FAIL — should have returned 401');
  } catch (err: any) {
    console.log(`OK (expected: ${err.message.slice(0, 60)})`);
  }

  console.log('\n--- All tests passed ---');
}

test().catch(err => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
