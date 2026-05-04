const roomsEl = document.querySelector('#rooms');
const form = document.querySelector('#createRoomForm');
const formMessage = document.querySelector('#formMessage');
const refreshBtn = document.querySelector('#refreshBtn');
const searchInput = document.querySelector('#searchInput');
const joinDialog = document.querySelector('#joinDialog');
const dialogTitle = document.querySelector('#dialogTitle');
const dialogInfo = document.querySelector('#dialogInfo');
const joinPassword = document.querySelector('#joinPassword');
const confirmJoin = document.querySelector('#confirmJoin');
const revealBox = document.querySelector('#revealBox');

let allRooms = [];
let selectedRoom = null;

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'An error occurred.');
  return data;
}

function roomCard(room) {
  const lock = room.isLocked ? '🔒 Locked' : 'Open';
  return `
    <article class="room-card">
      <div class="room-top">
        <h3>${escapeHtml(room.title)}</h3>
        <span class="badge">${lock}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(room.serverRegion)}</span>
        <span>${escapeHtml(room.activity)}</span>
        <span>${room.currentPlayers}/${room.maxPlayers} players</span>
      </div>
      <p class="note">${escapeHtml(room.note || 'No note')}</p>
      <button class="primary" onclick="openJoin('${room.code}')">Join Room</button>
    </article>
  `;
}

function renderRooms() {
  const q = searchInput.value.toLowerCase().trim();
  const filtered = allRooms.filter(room =>
    [room.title, room.hostName, room.serverRegion, room.activity, room.note]
      .join(' ')
      .toLowerCase()
      .includes(q)
  );

  roomsEl.innerHTML = filtered.length
    ? filtered.map(roomCard).join('')
    : '<p class="note">Одоогоор active room алга. Эхний room-оо үүсгээрэй.</p>';
}

async function loadRooms() {
  try {
    allRooms = await api('/api/rooms');
    renderRooms();
  } catch (error) {
    roomsEl.innerHTML = `<p class="note">${escapeHtml(error.message)}</p>`;
  }
}

window.openJoin = function(code) {
  selectedRoom = allRooms.find(room => room.code === code);
  if (!selectedRoom) return;
  revealBox.classList.add('hidden');
  revealBox.innerHTML = '';
  joinPassword.value = '';
  dialogTitle.textContent = selectedRoom.title;
  dialogInfo.textContent = `${selectedRoom.serverRegion} • ${selectedRoom.activity} • ${selectedRoom.currentPlayers}/${selectedRoom.maxPlayers}`;
  joinDialog.showModal();
};

confirmJoin.addEventListener('click', async () => {
  if (!selectedRoom) return;
  try {
    const room = await api(`/api/rooms/${selectedRoom.code}/join`, {
      method: 'POST',
      body: JSON.stringify({ password: joinPassword.value })
    });
    revealBox.classList.remove('hidden');
    revealBox.innerHTML = `
      <strong>Host NTE ID:</strong><br>
      <span id="hostId">${escapeHtml(room.hostNteId)}</span>
      <button class="ghost copy" type="button" onclick="copyHostId()">Copy ID</button>
    `;
    await loadRooms();
  } catch (error) {
    revealBox.classList.remove('hidden');
    revealBox.textContent = error.message;
  }
});

window.copyHostId = async function() {
  const id = document.querySelector('#hostId')?.textContent;
  if (!id) return;
  await navigator.clipboard.writeText(id);
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const room = await api('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    form.reset();
    formMessage.textContent = `Room created. Code: ${room.code}`;
    await loadRooms();
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

refreshBtn.addEventListener('click', loadRooms);
searchInput.addEventListener('input', renderRooms);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

loadRooms();
