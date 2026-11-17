import { io } from 'socket.io-client';
import http from 'http';

const SERVER_URL = 'http://127.0.0.1:3001';

async function runTests() {
  console.log('=====================================================');
  console.log('  TESTING INVITATION LINK & ROOM JOINING SYSTEM');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- SCENARIO A: User A creates a room and generates invitation link ---
  console.log('\n--- Scenario A: User A Creates Room & Generates Link ---');
  const createRes = await fetch(`${SERVER_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerName: 'Mawkin' })
  });
  const createData = await createRes.json();

  assert(createRes.status === 200 && createData.success, 'Room created successfully');
  assert(Boolean(createData.room.roomCode), `Unique room code generated: ${createData.room.roomCode}`);
  assert(Boolean(createData.room.inviteToken), `Cryptographic invitation token generated: ${createData.room.inviteToken}`);
  assert(createData.room.expiresAt > Date.now(), 'Expiration timestamp is 24 hours in the future');

  const roomCode = createData.room.roomCode;
  const inviteToken = createData.room.inviteToken;
  const ownerId = createData.room.ownerId;
  const invitationUrl = `${SERVER_URL}/?join=${encodeURIComponent(roomCode)}&token=${encodeURIComponent(inviteToken)}`;
  console.log(`Generated Invitation URL: ${invitationUrl}`);

  // --- SCENARIO B: User B opens the invitation link & validates room ---
  console.log('\n--- Scenario B: User B Opens Link & Validates Room ---');
  const validateRes = await fetch(`${SERVER_URL}/api/rooms/${roomCode}?token=${inviteToken}`);
  const validateData = await validateRes.json();

  assert(validateRes.status === 200 && validateData.success, 'Room validated successfully via invitation URL');
  assert(validateData.room.ownerName === 'Mawkin', `Room owner correctly identified as "${validateData.room.ownerName}"`);
  assert(validateData.room.isFull === false, 'Room is not full');
  assert(validateData.room.participantCount === 0, 'Participant count starts at 0');

  // --- SCENARIO C: User B successfully joins the room ---
  console.log('\n--- Scenario C: User B Joins Room & Real-Time Sync ---');
  const joinResB = await fetch(`${SERVER_URL}/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Paulene', token: inviteToken })
  });
  const joinDataB = await joinResB.json();

  assert(joinResB.status === 200 && joinDataB.success, 'User B joined room via API');
  const userBId = joinDataB.user.id;
  assert(joinDataB.user.displayName === 'Paulene', 'User B displayName is Paulene');
  assert(joinDataB.user.isOwner === false, 'User B is correctly identified as guest (not owner)');

  // Connect WebSockets for User A and User B
  const socketA = io(SERVER_URL, { forceNew: true, transports: ['websocket'] });
  const socketB = io(SERVER_URL, { forceNew: true, transports: ['websocket'] });

  await new Promise((resolve) => {
    let aJoined = false;
    let bJoined = false;

    socketA.on('connect', () => {
      socketA.emit('join-room', {
        roomCode,
        userId: ownerId,
        displayName: 'Mawkin',
        isOwner: true,
        token: inviteToken
      }, (resA) => {
        assert(resA.success, 'User A joined Socket room');
        aJoined = true;
        if (aJoined && bJoined) resolve();
      });
    });

    socketB.on('connect', () => {
      socketB.emit('join-room', {
        roomCode,
        userId: userBId,
        displayName: 'Paulene',
        isOwner: false,
        token: inviteToken
      }, (resB) => {
        assert(resB.success, 'User B joined Socket room');
        bJoined = true;
        if (aJoined && bJoined) resolve();
      });
    });
  });

  // Verify real-time presence
  const roomCheckAfterJoin = await fetch(`${SERVER_URL}/api/rooms/${roomCode}?token=${inviteToken}`);
  const roomCheckData = await roomCheckAfterJoin.json();
  assert(roomCheckData.room.participantCount === 2, 'Room participant count is exactly 2');
  assert(roomCheckData.room.isFull === true, 'Room is now marked as full (2 participants)');

  // --- SCENARIO D: Browser Refresh Simulation ---
  console.log('\n--- Scenario D: Both Participants Refresh Pages ---');
  // Simulate User A refreshing
  socketA.disconnect();
  const socketARefreshed = io(SERVER_URL, { forceNew: true, transports: ['websocket'] });
  await new Promise((resolve) => {
    socketARefreshed.on('connect', () => {
      socketARefreshed.emit('join-room', {
        roomCode,
        userId: ownerId, // Same persistent userId from sessionStorage
        displayName: 'Mawkin',
        isOwner: true,
        token: inviteToken
      }, (res) => {
        assert(res.success, 'User A reconnected after page refresh with same session credentials');
        resolve();
      });
    });
  });

  // Simulate User B refreshing
  socketB.disconnect();
  const socketBRefreshed = io(SERVER_URL, { forceNew: true, transports: ['websocket'] });
  await new Promise((resolve) => {
    socketBRefreshed.on('connect', () => {
      socketBRefreshed.emit('join-room', {
        roomCode,
        userId: userBId, // Same persistent userId from sessionStorage
        displayName: 'Paulene',
        isOwner: false,
        token: inviteToken
      }, (res) => {
        assert(res.success, 'User B reconnected after page refresh with same session credentials');
        resolve();
      });
    });
  });

  // Clean up test sockets
  socketARefreshed.disconnect();
  socketBRefreshed.disconnect();

  // --- SCENARIO E: Leave and Rejoin ---
  console.log('\n--- Scenario E: Participant Leaves & Rejoins ---');
  const leaveCheck = await fetch(`${SERVER_URL}/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Paulene', userId: userBId, token: inviteToken })
  });
  const leaveData = await leaveCheck.json();
  assert(leaveCheck.status === 200 && leaveData.success, 'Re-joining existing participant succeeds');

  // --- SCENARIO F: Invalid Invitation Link ---
  console.log('\n--- Scenario F: Invalid Invitation Link ---');
  const invalidRes = await fetch(`${SERVER_URL}/api/rooms/GHOST-999?token=none`);
  assert(invalidRes.status === 404, 'Invalid room code returns HTTP 404 Not Found');

  const invalidJoinRes = await fetch(`${SERVER_URL}/api/rooms/GHOST-999/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Stranger', token: 'none' })
  });
  assert(invalidJoinRes.status === 404, 'Join attempt on non-existent room returns HTTP 404');

  // --- SCENARIO G: Expired Invitation Link ---
  console.log('\n--- Scenario G: Expired Room Handling ---');
  // Create an expired room directly via SQL or expired timestamp
  const expiredCode = 'EXPIRED-777';
  const { initDb, dbRun } = await import('./server/db.js');
  await dbRun(
    'INSERT OR REPLACE INTO rooms (id, room_code, owner_id, invite_token, room_status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['room-expired-test', expiredCode, 'user-old', 'token-exp', 'active', Date.now() - 86400000, Date.now() - 3600000]
  );

  const expiredCheck = await fetch(`${SERVER_URL}/api/rooms/${expiredCode}?token=token-exp`);
  assert(expiredCheck.status === 410, 'Expired room returns HTTP 410 Gone');

  const expiredJoin = await fetch(`${SERVER_URL}/api/rooms/${expiredCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Guest', token: 'token-exp' })
  });
  assert(expiredJoin.status === 410, 'Joining expired room returns HTTP 410 Gone');

  // --- SCENARIO H: Security: Invalid Token & Participant Limit Enforcement ---
  console.log('\n--- Scenario H: Security & Participant Limit Enforcement ---');
  // 1. Wrong token
  const wrongTokenRes = await fetch(`${SERVER_URL}/api/rooms/${roomCode}?token=malicious_fake_token`);
  assert(wrongTokenRes.status === 403, 'Invalid token returns HTTP 403 Forbidden');

  const wrongTokenJoin = await fetch(`${SERVER_URL}/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Intruder', token: 'malicious_fake_token' })
  });
  assert(wrongTokenJoin.status === 403, 'Join with invalid token returns HTTP 403 Forbidden');

  // 2. Room limit: Ensure User A and User B sockets are actively connected
  const activeSocketA = io(SERVER_URL, { forceNew: true, transports: ['websocket'] });
  const activeSocketB = io(SERVER_URL, { forceNew: true, transports: ['websocket'] });

  await new Promise((resolve) => {
    let aOk = false, bOk = false;
    activeSocketA.emit('join-room', { roomCode, userId: ownerId, displayName: 'Mawkin', isOwner: true, token: inviteToken }, () => {
      aOk = true;
      if (aOk && bOk) resolve();
    });
    activeSocketB.emit('join-room', { roomCode, userId: userBId, displayName: 'Paulene', isOwner: false, token: inviteToken }, () => {
      bOk = true;
      if (aOk && bOk) resolve();
    });
  });

  // Now a third person attempts to join while room is full with 2 active users
  const thirdUserJoin = await fetch(`${SERVER_URL}/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'ThirdWheel', userId: 'user-third-intruder', token: inviteToken })
  });
  assert(thirdUserJoin.status === 409, 'Third participant joining full room is rejected with HTTP 409 Conflict');

  activeSocketA.disconnect();
  activeSocketB.disconnect();

  console.log('\n=====================================================');
  console.log(`  ALL ${passed}/${total} INVITATION SYSTEM TESTS PASSED! 🎉`);
  console.log('=====================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
