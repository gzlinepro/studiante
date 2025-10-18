/**
 * script.js — Plantilla de arranque (sin lógica del reproductor)
 * - Aquí puedes pegar tu código JS completamente distinto.
 * - Incluye utilidades: carga dinámica de scripts/estilos, bus simple y helpers SW.
 */

/* ========== UTILIDADES ========== */

// Namespace global para acceder desde consola
window._app = window._app || {};
const APP = window._app;

// Cargar script dinámicamente (útil para módulos grandes)
APP.loadScript = function(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    if (opts.module) s.type = 'module';
    if (opts.defer) s.defer = true;
    s.async = !!opts.async;
    s.onload = () => resolve(s);
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });
};

// Cargar CSS dinámicamente
APP.loadCSS = function(url) {
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = url;
    l.onload = () => resolve(l);
    l.onerror = (e) => reject(e);
    document.head.appendChild(l);
  });
};

// Bus simple de eventos para desacoplar módulos
APP.bus = (function() {
  const map = new Map();
  return {
    on: (ev, fn) => { (map.get(ev) || map.set(ev,[])).get ? null : null; (map.get(ev) || map.set(ev,[])); map.get(ev).push(fn); },
    off: (ev, fn) => { const arr = map.get(ev) || []; map.set(ev, arr.filter(x=>x!==fn)); },
    emit: (ev, data) => { (map.get(ev) || []).slice().forEach(fn => { try{ fn(data); }catch(e){ console.warn('bus handler', e); } }); }
  };
})();

/* ========== SERVICE WORKER HELPERS ========== */

APP.sendToSW = async function(msg) {
  if(!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return null;
  return new Promise((resolve) => {
    const msgChan = new MessageChannel();
    msgChan.port1.onmessage = (ev) => resolve(ev.data);
    navigator.serviceWorker.controller.postMessage(msg, [msgChan.port2]);
  });
};

// Ejemplos:
// APP.sendToSW({type:'CACHE_URLS', payload:['/ruta1','/ruta2']});
// APP.sendToSW({type:'CLEAR_CACHES'});

/* ========== STORAGE SIMPLE ==========
   Útil para guardar configuración/localState de tu otro código.
*/
APP.storage = {
  get: (k, fallback=null) => {
    try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : fallback; } catch(e){ return fallback; }
  },
  set: (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn('storage set', e); }
  },
  remove: (k) => { localStorage.removeItem(k); }
};


    /***********************
     * Firebase config
     ***********************/
    const firebaseConfig = {
      apiKey: "AIzaSyCFcicNpYx_-zV9ZqhsmcofZKiN1UW-foc",
      authDomain: "data-client-2-d26da.firebaseapp.com",
      databaseURL: "https://data-client-2-d26da-default-rtdb.firebaseio.com",
      projectId: "data-client-2-d26da",
      storageBucket: "data-client-2-d26da.firebasestorage.app",
      messagingSenderId: "843725202694",
      appId: "1:843725202694:web:c98730835078b0e21a6a87",
      measurementId: "G-L5VJ6TY5KE"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();

/***********************
 * Listener safety helpers
 * - safeListen(ref, event, handler): attach handler ensuring previous handler for same ref/event is removed
 * - safeUnlisten(ref, event): remove stored handler (or off() fallback)
 *
 * Usage: safeListen(db.ref('path'), 'value', handler);
 *        safeUnlisten(db.ref('path'), 'value');
 ***********************/
const _attachedHandlers = new WeakMap();

function safeListen(ref, event, handler) {
  try {
    if (!ref) return;
    const prev = _attachedHandlers.get(ref);
    if (prev && typeof prev === 'object' && prev[event]) {
      try { ref.off(event, prev[event]); } catch(e){}
    }
    // attach new handler
    ref.on(event, handler);
    // store it
    let stored = _attachedHandlers.get(ref) || {};
    stored[event] = handler;
    _attachedHandlers.set(ref, stored);
  } catch (e) {
    console.warn('safeListen error', e);
    try { ref.on(event, handler); } catch(e) {}
  }
}

function safeUnlisten(ref, event) {
  try {
    if (!ref) return;
    const stored = _attachedHandlers.get(ref);
    if (stored && stored[event]) {
      try { ref.off(event, stored[event]); } catch(e){}
      delete stored[event];
      // if stored empty, delete map entry
      if (!Object.keys(stored).length) _attachedHandlers.delete(ref);
      else _attachedHandlers.set(ref, stored);
      return;
    }
    // fallback: remove all handlers for the ref/event
    try { ref.off(event); } catch(e){}
  } catch(e) {
    console.warn('safeUnlisten error', e);
    try { ref.off(event); } catch(e){}
  }
}


/* ---------------------------
   Helpers: modales dinámicos
   --------------------------- */

/**
 * showConfirmModal({title, message, confirmText, cancelText}) -> Promise<boolean>
 * Uso: const ok = await showConfirmModal({message: '¿Estás seguro?'});
 */
function showConfirmModal({ title = 'Confirmar', message = '', confirmText = 'Sí', cancelText = 'Cancelar' } = {}) {
  return new Promise((resolve) => {
    // overlay
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    // modal
    const modal = document.createElement('div');
    modal.className = 'cc-modal';
    modal.style.width = 'min(560px,92%)';
    modal.style.background = '#fff';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
    modal.style.padding = '18px';
    modal.style.fontFamily = 'system-ui,Segoe UI,Roboto,Arial';

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="font-weight:800;font-size:16px">${title}</div>
        <button class="cc-close" aria-label="Cerrar" style="background:none;border:none;font-size:20px;cursor:pointer">×</button>
      </div>
      <div style="margin-top:12px;color:#333">${message}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px">
        <button class="cc-cancel" style="padding:8px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer">${cancelText}</button>
        <button class="cc-confirm" style="padding:8px 12px;border-radius:8px;border:none;background:linear-gradient(90deg,#58CC02,#FFD400);color:#000;font-weight:700;cursor:pointer">${confirmText}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // focus
    const confirmBtn = modal.querySelector('.cc-confirm');
    const cancelBtn = modal.querySelector('.cc-cancel');
    const closeBtn = modal.querySelector('.cc-close');
    confirmBtn.focus();

    function cleanup(result) {
      try { overlay.remove(); } catch(e){ overlay.style.display='none'; }
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }

    function onKey(e) {
      if (e.key === 'Escape') { cleanup(false); }
      if (e.key === 'Enter') { cleanup(true); }
    }
    document.addEventListener('keydown', onKey);

    confirmBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    closeBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cleanup(false); });
  });
}

/**
 * showAlertModal(title, message) -> muestra modal informativo con "Aceptar"
 */
function showAlertModal(title = 'Aviso', message = '') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 9999;

    const modal = document.createElement('div');
    modal.className = 'cc-modal';
    modal.style.width = 'min(560px,92%)';
    modal.style.background = '#fff';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
    modal.style.padding = '18px';
    modal.style.fontFamily = 'system-ui,Segoe UI,Roboto,Arial';

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="font-weight:800;font-size:16px">${title}</div>
        <button class="cc-close" aria-label="Cerrar" style="background:none;border:none;font-size:20px;cursor:pointer">×</button>
      </div>
      <div style="margin-top:12px;color:#333">${message}</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px">
        <button class="cc-ok" style="padding:8px 12px;border-radius:8px;border:none;background:linear-gradient(90deg,#58CC02,#FFD400);color:#000;font-weight:700;cursor:pointer">Aceptar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const okBtn = modal.querySelector('.cc-ok');
    const closeBtn = modal.querySelector('.cc-close');

    function cleanup() {
      try { overlay.remove(); } catch(e){ overlay.style.display='none'; }
      document.removeEventListener('keydown', onKey);
      resolve();
    }

    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') cleanup(); }
    document.addEventListener('keydown', onKey);

    okBtn.addEventListener('click', cleanup);
    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cleanup(); });
  });
}




/* =========================
   Módulo OnlineUsers mejorado: incluye buscador por nombre/apellidos
   - Guarda la lista completa en memoria (lastResults)
   - Filtra client-side por nombre / fullName / lastName
   - Debounce en input de búsqueda
   - Delegación de eventos idempotente (igual que antes)
   ========================= */
const OnlineUsers = (function(){
  let ref = null;
  let handler = null;

  // secuencia para ignorar snapshots fuera de orden
  let renderSeq = 0;
  let lastRenderedSeq = 0;
  let pendingTimer = null;

  // lista completa en memoria: [{ merged, relation }, ...] en el orden actual
  let lastResults = [];

  // texto de búsqueda actual
  let currentQuery = '';

  // referencia a elementos del DOM (cached)
  function getListEl() { return document.getElementById('onlineList'); }
  function getSearchInput() { return document.getElementById('onlineSearchInput'); }
  function getClearBtn() { return document.getElementById('onlineSearchClear'); }

  // small debounce util
  function debounce(fn, wait=180) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Renderiza la lista filtrada usando renderOnlineItem() si está disponible
  function renderFiltered(query='') {
    const list = getListEl();
    if (!list) return;
    // normalize query
    const q = (query || '').trim().toLowerCase();
    // build fragment
    const frag = document.createDocumentFragment();

    const items = lastResults.filter(it => {
      // si q vacío, pasa todo
      if (!q) return true;
      const u = it.merged || {};
      const name = (u.name || u.fullName || '').toString().toLowerCase();
      // intentar dividir nombre en palabras (para apellido)
      const parts = name.split(/\s+/);
      return name.indexOf(q) !== -1 || parts.some(p => p.indexOf(q) !== -1);
    });

    if (!items.length) {
      const p = document.createElement('p');
      p.style.color = 'var(--muted)';
      p.textContent = q ? 'No se encontraron usuarios para: ' + query : 'Nadie en línea.';
      list.innerHTML = '';
      list.appendChild(p);
      return;
    }

    for (const it of items) {
      const itemHtml = (typeof renderOnlineItem === 'function')
        ? renderOnlineItem(it.merged, it.relation)
        : `<div class="online-item" data-uid="${it.merged.uid}">${it.merged.name || 'Anónimo'}</div>`;

      const wrapper = document.createElement('div');
      // parse safe-ish HTML single-root expected
      wrapper.innerHTML = itemHtml.trim();
      while (wrapper.firstElementChild) frag.appendChild(wrapper.firstElementChild);
    }

    list.innerHTML = '';
    list.appendChild(frag);
    attachDelegation(); // idempotente
  }

  // Manejo real del snapshot: construye lastResults y llama renderFiltered
  async function handleSnapshotNow(snapshot) {
    const list = getListEl();
    if (!list) return;
    try {
      const users = snapshot.val();
      if (!users) {
        lastResults = [];
        renderFiltered(currentQuery);
        return;
      }

      const arr = Object.entries(users).map(([uid,u]) => ({ uid, ...u }));
      // ordenar: online primero por diseño original
      arr.sort((a,b) => {
        if (a.online === b.online) return (b.lastSeen || 0) - (a.lastSeen || 0);
        return a.online ? -1 : 1;
      });

      // fetch perfiles en paralelo (manteniendo orden)
      const fetches = arr.map(async u => {
        try {
          const userSnap = await db.ref('users/' + u.uid).once('value');
          const uProfile = userSnap.val() || {};
          const merged = { uid: u.uid, online: !!u.online, lastSeen: u.lastSeen || uProfile.lastSeen, ...uProfile };
          const relation = (typeof getRelationWith === 'function') ? await getRelationWith(u.uid) : 'not_friends';
          return { merged, relation };
        } catch (err) {
          console.warn('OnlineUsers fetch profile error', err);
          return { merged: { uid: u.uid, name: u.name || 'Anónimo', online: !!u.online, lastSeen: u.lastSeen }, relation: 'not_friends' };
        }
      });

      const results = await Promise.all(fetches);
      lastResults = results; // guardar copia completa
      renderFiltered(currentQuery);
    } catch (e) {
      console.error('OnlineUsers handler error', e);
      const list = getListEl();
      if (list) list.innerHTML = '<p style="color:#ef4444">Error cargando usuarios.</p>';
      lastResults = [];
    }
  }

  // handler con debounce + secuencia
  function snapshotHandler(snapshot) {
    const seq = ++renderSeq;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (seq < lastRenderedSeq) return;
      lastRenderedSeq = seq;
      handleSnapshotNow(snapshot);
    }, 40);
  }

  // attach delegations (idéntico al original, idempotente)
  function attachDelegation() {
    const list = getListEl();
    if (!list) return;
    if (list.dataset.onlineDelegationAttached === '1') return;
    list.dataset.onlineDelegationAttached = '1';

    list.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;

      // cancelar solicitud saliente
      if (btn.classList.contains('cancel-outgoing-req')) {
        ev.preventDefault();
        const toUid = btn.dataset.to; if (!toUid) return;
        const item = btn.closest('.online-item'); const controlsEl = item ? item.querySelector('.controls') : null;
        if (controlsEl) { controlsEl.dataset._previous = controlsEl.innerHTML || ''; controlsEl.innerHTML = `<div class="controls"><button class="btn small adding" disabled>Cancelando...</button></div>`; }
        try { await cancelOutgoingFriendRequest(toUid); if (controlsEl) controlsEl.innerHTML = `<div class="controls"><button class="btn small add-friend-btn" data-uid="${toUid}">Agregar</button></div>`; showToast('Solicitud cancelada','success'); }
        catch (err) { console.error(err); if (controlsEl && controlsEl.dataset._previous) { controlsEl.innerHTML = controlsEl.dataset._previous; delete controlsEl.dataset._previous; } await showAlertModal('Error','No se pudo cancelar la solicitud.'); }
        return;
      }

      // agregar amigo
      if (btn.classList.contains('add-friend-btn')) {
        ev.preventDefault();
        const toUid = btn.dataset.uid;
        if (!toUid) return;
        const item = btn.closest('.online-item');
        const controlsEl = item ? item.querySelector('.controls') : null;
        if (controlsEl) {
          controlsEl.dataset._previous = controlsEl.innerHTML || '';
          controlsEl.innerHTML = `<div class="controls"><button class="btn small" disabled>Enviando...</button></div>`;
        }
        try {
          const res = await sendFriendRequestSimple(toUid);
          if (res && res.ok) {
            if (controlsEl) {
              controlsEl.innerHTML = `<div class="controls" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
                                         <button class="btn small cancel-outgoing-req" data-to="${toUid}">Cancelar solicitud</button>
                                       </div>`;
            }
            showToast('Solicitud enviada', 'success');
          } else {
            if (res && res.reason === 'already_friends') {
              if (controlsEl && controlsEl.dataset._previous) controlsEl.innerHTML = controlsEl.dataset._previous;
              showToast('Ya es tu amigo', 'info');
            } else {
              if (controlsEl && controlsEl.dataset._previous) controlsEl.innerHTML = controlsEl.dataset._previous;
              const msg = (res && res.error && res.error.message) ? res.error.message : 'Error al enviar solicitud';
              showToast(msg, 'error');
            }
          }
        } catch (err) {
          console.error('Error enviando solicitud (delegado)', err);
          if (controlsEl && controlsEl.dataset._previous) controlsEl.innerHTML = controlsEl.dataset._previous;
          showToast('Error al enviar solicitud', 'error');
        }
        return;
      }

      // aceptar/rechazar
      if (btn.classList.contains('accept-online-req')) {
        ev.preventDefault();
        const fromUid = btn.dataset.from; if (!fromUid) return;
        try { await acceptFriendRequestFrom(fromUid); } catch(e){ console.error('accept error', e); await showAlertModal('Error','No se pudo aceptar la solicitud.'); }
        return;
      }
      if (btn.classList.contains('decline-online-req')) {
        ev.preventDefault();
        const fromUid = btn.dataset.from; if (!fromUid) return;
        try { await declineFriendRequestFrom(fromUid); } catch(e){ console.error('decline error', e); await showAlertModal('Error','No se pudo rechazar la solicitud.'); }
        return;
      }

      // mensaje
      if (btn.classList.contains('msg-friend-btn')) {
        ev.preventDefault();
        const toUid = btn.dataset.uid; if (!toUid) return;
        const uSnap = await db.ref('users/' + toUid).once('value'); const u = uSnap.val() || {};
        openChatWithUser(toUid, u.name || (u.fullName || 'Anónimo'), u.avatarData || (u.avatarDefault ? ('data:image/svg+xml;utf8,' + encodeURIComponent((defaultAvatars.find(a=>a.id===u.avatarDefault)||{}).svg||'')) : null));
        return;
      }

      // eliminar amistad
      if (btn.classList.contains('remove-friend-btn')) {
        ev.preventDefault();
        const toUid = btn.dataset.uid; if (!toUid) return;
        const ok = await showConfirmModal({ title: 'Confirmar', message: '¿Deseas cancelar la amistad con este usuario?', confirmText: 'Sí, eliminar', cancelText: 'No' });
        if (!ok) return;
        try {
          await removeFriend(toUid);
          showToast('Amistad eliminada', 'info');
          const item = btn.closest('.online-item');
          const controlsEl = item ? item.querySelector('.controls') : null;
          if (controlsEl) {
            controlsEl.innerHTML = `<div class="controls"><button class="btn small add-friend-btn" data-uid="${toUid}">Agregar</button></div>`;
          }
        } catch (err) {
          console.error('removeFriend error (delegado)', err);
          await showAlertModal('Error eliminando amistad', `No se pudo eliminar la amistad. ${err && err.message ? err.message : ''}`);
        }
        return;
      }

    });
  }

  // attach listeners for the search input (idempotente)
  function ensureSearchHandlers() {
    const input = getSearchInput();
    const clearBtn = getClearBtn();
    if (!input) return;
    if (input.dataset.handlersAttached === '1') return;
    input.dataset.handlersAttached = '1';

    const onInput = debounce((ev) => {
      currentQuery = (ev.target.value || '').trim();
      renderFiltered(currentQuery);
    }, 200);

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; currentQuery = ''; renderFiltered(''); input.blur(); } });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        currentQuery = '';
        input.focus();
        renderFiltered('');
      });
    }
  }

  function start() {
    const list = getListEl();
    if (!list) return;
    // Detener cualquier listener previo (muy defensivo)
    try { if (ref && handler) ref.off('value', handler); } catch(e){}
    ref = db.ref('online');
    handler = snapshotHandler;
    // mostrar indicador breve
    list.innerHTML = '<p style="color:var(--muted)">Cargando lista...</p>';
safeListen(ref, 'value', handler);

    // asegurar search handlers (si el modal existe)
    ensureSearchHandlers();
  }

  function stop() {
    try {
      if (ref && handler) {
        ref.off('value', handler);
      }
    } catch (e) {
      console.warn('OnlineUsers stop error', e);
    } finally {
      ref = null;
      handler = null;
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      renderSeq = 0; lastRenderedSeq = 0;
      lastResults = [];
      currentQuery = '';
    }
  }

  return {
    start,
    stop,
    ensureShown: function(){ start(); attachDelegation(); ensureSearchHandlers(); }
  };
})();


/* Wrappers para compatibilidad con el resto del código */
function attachOnlineUsersListener(){ OnlineUsers.start(); }
function stopOnlineUsersListener(){ OnlineUsers.stop(); }
function ensureOnlineListDelegation(){ OnlineUsers.ensureShown(); }
function ensureOnlineUsersShown(){ OnlineUsers.ensureShown(); }
function loadOnlineUsers(){ OnlineUsers.start(); }








// ---------- Notificaciones / unread messages helpers ----------
let _notifRef = null;
let _notifHandler = null;

// unread messages (global count) listener
let _unreadRef = null;
let _unreadHandler = null;

function startUnreadCountListener() {
  if (!currentUser) return;
  if (_unreadRef && _unreadHandler) return; // idempotente

  _unreadRef = db.ref(`users/${currentUser.uid}/unreadMessagesCount`);
  _unreadHandler = (snap) => {
    const v = snap.val() || 0;
    const msgBadge = document.getElementById('msgBadge');
    if (msgBadge) {
      if (v > 0) {
        msgBadge.style.display = 'flex';
        msgBadge.textContent = String(v);
      } else {
        msgBadge.style.display = 'none';
        msgBadge.textContent = '0';
      }
      if (typeof updateMsgBadgeVisual === 'function') updateMsgBadgeVisual();
    }
  };
safeListen(_unreadRef, 'value', _unreadHandler);


}


function stopUnreadCountListener() {

try { safeUnlisten(_unreadRef, 'value'); } catch(e){}
_unreadRef = null;
_unreadHandler = null;


}


/* Wrapper compatible con tu código previo (reemplaza antiguas loadOnlineUsers) */
function loadOnlineUsers() {
  attachOnlineUsersListener();
}

/* ===== Notifications listener seguro ===== */
function listenForNotifications() {
  if (!currentUser) return;
  // si ya habíamos adjuntado, evita duplicar
  if (_notifRef && _notifHandler) return;

  _notifRef = db.ref(`notifications/${currentUser.uid}`);

  _notifHandler = (snap) => {
    const n = snap.val();
    if (!n) return;
    // mostrar globo de notificación (usa la función que ya tenías)
    showNotifBalloon && showNotifBalloon(n, snap.key);

    // actualizar badge
    try {
      const msgBadge = document.getElementById('msgBadge');
      if (msgBadge) {
        let count = parseInt(msgBadge.textContent || '0', 10) || 0;
        count = count + 1;
        msgBadge.textContent = String(count);
        msgBadge.style.display = 'flex';
      }
    } catch(e){}

    const isMessagesOpen = document.getElementById('messagesModal') && document.getElementById('messagesModal').style.display === 'flex';
    if (isMessagesOpen) loadMessages();
  };

safeListen(_notifRef, 'child_added', _notifHandler);

safeListen(_notifRef, 'child_removed', () => {
  const isMessagesOpen = document.getElementById('messagesModal') && document.getElementById('messagesModal').style.display === 'flex';
  if (isMessagesOpen) loadMessages();
});

}

function stopNotificationsListener() {
try {
  if (_notifRef) {
    safeUnlisten(_notifRef, 'child_added');
    safeUnlisten(_notifRef, 'child_removed');
  }
} catch(e){}
_notifRef = null;
_notifHandler = null;


  
}

function stopFriendsPresenceListeners() {
  try {
    for (const uid in _friendsPresenceRefs) {
      const r = _friendsPresenceRefs[uid];
      if (r) {
        safeUnlisten(r, 'value');
        try { r.off(); } catch(e){} // fallback
      }
    }
  } catch (e) { console.warn('stopFriendsPresenceListeners error', e); }
  _friendsPresenceRefs = {};
}


async function cancelOutgoingFriendRequest(toUid) {
  if (!currentUser) throw new Error('No autenticado');
  const meUid = currentUser.uid;
  let success = false;

  // 1) Borrar friendRequests/<toUid>/<meUid>
  try {
    const reqRef = db.ref(`friendRequests/${toUid}/${meUid}`);
    const snap = await reqRef.once('value');
    if (snap.exists()) {
      await reqRef.remove();
      success = true;
    }
  } catch (e) {
    console.warn('No se pudo borrar friendRequests path (puede no existir):', e);
  }

  // 2) Borrar notificaciones enviadas (intentamos primero la clave determinista, luego limpieza por from)
  try {
    // clave determinista usada al enviar solicitud
    const notifKey = `${meUid}_friend_request_${toUid}`;
    await db.ref(`notifications/${toUid}/${notifKey}`).remove().catch(()=>{});
    // por seguridad también borramos notifs con from === meUid (compat)
    const notifRef = db.ref(`notifications/${toUid}`);
    const notifSnap = await notifRef.orderByChild('from').equalTo(meUid).once('value');
    if (notifSnap.exists()) {
      const keys = Object.keys(notifSnap.val());
      for (const k of keys) {
        await notifRef.child(k).remove();
      }
      success = true;
    }
  } catch (e) {
    console.warn('Error al limpiar notificaciones del receptor:', e);
  }

  // 3) Borrar registro local de outgoing si existe
  try {
    await db.ref(`users/${meUid}/outgoingFriendRequests/${toUid}`).remove();
    success = true;
  } catch(e) { /* ignore if not used */ }

  return success;
}


async function acceptFriendRequestFrom(fromUid, notifKey = null) {
  if (!currentUser) return;
  try {
    const updates = {};
    updates[`friends/${currentUser.uid}/${fromUid}`] = true;
    updates[`friends/${fromUid}/${currentUser.uid}`] = true;
    updates[`friendRequests/${currentUser.uid}/${fromUid}`] = null;
    await db.ref().update(updates);

    // borrar notificación push (por key si se dio)
    if (notifKey) {
      await db.ref(`notifications/${currentUser.uid}/${notifKey}`).remove().catch(()=>{});
    } else {
      // si no hay key, buscamos notifs con .from === fromUid y las borramos
      try {
        const notifSnap = await db.ref(`notifications/${currentUser.uid}`).orderByChild('from').equalTo(fromUid).once('value');
        if (notifSnap.exists()) {
          const keys = Object.keys(notifSnap.val());
          for (const k of keys) { await db.ref(`notifications/${currentUser.uid}/${k}`).remove(); }
        }
      } catch(e){ console.warn('No se pudo borrar notificaciones por from:', e); }
    }

    showToast('Solicitud aceptada', 'success');
    // refrescar vistas
    loadMessages();
    if (typeof renderConversationList === 'function') renderConversationList();
    try { loadFriends(); } catch(e){}

  } catch (err) {
    console.error('acceptFriendRequestFrom', err);
    showToast('Error aceptando solicitud', 'error');
  }
}

async function declineFriendRequestFrom(fromUid, notifKey = null) {
  if (!currentUser) return;
  try {
    await db.ref(`friendRequests/${currentUser.uid}/${fromUid}`).remove();
    if (notifKey) await db.ref(`notifications/${currentUser.uid}/${notifKey}`).remove().catch(()=>{});
    else {
      // borrar notificaciones con from === fromUid si las hay
      try {
        const notifSnap = await db.ref(`notifications/${currentUser.uid}`).orderByChild('from').equalTo(fromUid).once('value');
        if (notifSnap.exists()) {
          const keys = Object.keys(notifSnap.val());
          for (const k of keys) { await db.ref(`notifications/${currentUser.uid}/${k}`).remove(); }
        }
      } catch(e){ console.warn('No se pudo borrar notificaciones por from:', e); }
    }
    showToast('Solicitud rechazada', 'info');
    loadMessages();
  } catch (err) {
    console.error('declineFriendRequestFrom', err);
    showToast('Error rechazando solicitud', 'error');
  }
}


/**
 * removeFriend(toUid)
 * - Elimina la amistad entre currentUser.uid y toUid (ambos lados).
 * - Limpia referencias de friendRequests y conversations (no borra mensajes históricos).
 * - Retorna true si se completa, lanza error si falla.
 * - NOTA: NO muestra toasts. La UI debe mostrar la notificación visible.
 */
async function removeFriend(toUid) {
  if (!currentUser) throw new Error('No autenticado');
  if (!toUid) throw new Error('UID inválido');

  const me = currentUser.uid;
  const convId = createConversationId(me, toUid);

  try {
    // 1) Preparar actualizaciones atómicas para eliminar la relación de amistad
    const updates = {};
    updates[`friends/${me}/${toUid}`] = null;
    updates[`friends/${toUid}/${me}`] = null;

    // 2) Opcional: eliminar referencias en 'conversations' para ambas partes
    updates[`conversations/${me}/${convId}`] = null;
    updates[`conversations/${toUid}/${convId}`] = null;

    // Ejecutar update atómico
    await db.ref().update(updates);

    // 3) Limpiar friendRequests si existieran (no es crítico, solo intento silencioso)
    try { await db.ref(`friendRequests/${me}/${toUid}`).remove(); } catch(e){ /* ignore */ }
    try { await db.ref(`friendRequests/${toUid}/${me}`).remove(); } catch(e){ /* ignore */ }

    // 4) (Opcional) podrías borrar notificaciones relacionadas, si lo deseas:
    // try { const notifs = await db.ref(`notifications/${me}`).orderByChild('from').equalTo(toUid).once('value'); if (notifs.exists()) { Object.keys(notifs.val()).forEach(k => db.ref(`notifications/${me}/${k}`).remove()); } } catch(e){}

    // 5) Actualizar UI local (llamadas a funciones que refrescan vistas)
    try { if (typeof loadFriends === 'function') loadFriends(); } catch(e){}
    try { if (typeof loadOnlineUsers === 'function') loadOnlineUsers(); } catch(e){}
    try { if (typeof renderConversationList === 'function') renderConversationList(); } catch(e){}
    try { if (typeof loadMessages === 'function') loadMessages(); } catch(e){}

    // 6) RETORNAR éxito (NO mostrar toast aquí)
    return true;
  } catch (err) {
    console.error('removeFriend error', err);
    // delegar la UI: mostrar modal de error si existe showAlertModal, si no solo relanzar
    const message = (err && err.message) ? err.message : 'Error eliminando amistad';
    try {
      if (typeof showAlertModal === 'function') {
        await showAlertModal('Error eliminando amistad', message);
      }
    } catch(e){ console.error('Error mostrando modal de error', e); }
    throw err; // relanzar para que el caller lo maneje y muestre toast si corresponde
  }
}


/* ===== onAuthStateChanged consolidado (UNA sola definición) ===== */
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Evitar re-inicializar si es el mismo usuario ya autenticado
    if (currentUser && currentUser.uid === user.uid) {
      currentUser = user;
      return;
    }

    currentUser = user;
    hideAuthScreen && hideAuthScreen();

    // Cargar perfil y arrancar subscripciones en orden seguro
    try { await loadUserProfile(); } catch(e){ console.warn('loadUserProfile err', e); }

    // Inicializar presencia, lista online, mensajes y notificaciones (usa wrappers seguros)
    try {
      updateUserOnline && updateUserOnline();
      loadOnlineUsers();            // attachOnlineUsersListener internally prevents duplicates
      listenForNotifications();     // prevents duplicate listeners
      loadMessages && loadMessages();



      renderConversationList && renderConversationList();
      updateMiniUI && updateMiniUI();
      startUnreadCountListener();


// Start local simulacro checker + pre-load scheduled simulacros
try {
  startLocalReminderChecker();          // arranca el polling local para notificaciones de simulacros
  loadScheduledSimulacros().catch(()=>{}); // precarga lista (no bloqueante)
} catch(e) {
  console.warn('Error starting simulacro checker or loading scheduled simulacros', e);
}





    } catch (e) {
      console.warn('init messaging/presence error', e);
    }
  } else {
    // cleanup al cerrar sesión
    currentUser = null;
    // stop local checker al hacer logout
try { stopLocalReminderChecker(); } catch(e){}

    stopOnlineUsersListener();
    stopNotificationsListener();
    stopUnreadCountListener();

    // opcional: ocultar UI y mostrar login
    if (typeof showAuthScreen === 'function') showAuthScreen();
    else {
      const el = document.getElementById('authScreen');
      if (el) { el.style.display = 'flex'; document.body.classList.add('auth-active'); }
    }
  }
});

/* Opcional: función pública para inicializar todo manualmente si la necesitas */
function initMessagingPresence() {
  if (!currentUser) return;
  updateUserOnline && updateUserOnline();
  loadOnlineUsers();
  loadMessages && loadMessages();
  renderConversationList && renderConversationList();
  listenForNotifications();
}



/********** AUTH UI + logic (REEMPLAZAR AQUÍ: quitar registro, agregar cambiar contraseña) **********/
let currentUser = null; // ya lo usabas

// mostrar/ocultar pantalla de autenticación
const authScreen = document.getElementById('authScreen');
function showAuthScreen() {
  document.body.classList.add('auth-active');
  if (authScreen) authScreen.style.display = 'flex';
}
function hideAuthScreen() {
  document.body.classList.remove('auth-active');
  if (authScreen) authScreen.style.display = 'none';
}

/* --- Form elements --- */
const loginForm = document.getElementById('loginForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');

// ---------- Toggle Mostrar/Ocultar contraseña (ACCESIBLE y compatible) ----------
const togglePassBtn = document.getElementById('togglePass');
const passwordInput = document.getElementById('authPassword');

// SVGs (eye / eye-off) usados para reemplazar el contenido del botón
const eyeSvg = `<svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
  <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></circle>
</svg>`;

const eyeOffSvg = `<svg class="eye-icon eye-off" width="20" height="20" viewBox="0 0 24 24" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6 0-10-7-10-7a19.19 19.19 0 0 1 5.3-5.44" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
  <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

// Helper: actualiza el icono y atributos accesibles
function setToggleIcon(isVisible) {
  if (!togglePassBtn) return;
  togglePassBtn.setAttribute('aria-pressed', String(isVisible));
  togglePassBtn.classList.toggle('active', isVisible);
  togglePassBtn.setAttribute('title', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  togglePassBtn.setAttribute('aria-label', isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  togglePassBtn.innerHTML = isVisible ? eyeOffSvg : eyeSvg;
}

// Inicializa estado al cargar (si el input existe)
if (passwordInput && togglePassBtn) {
  // Si el input no es password, sincronizamos el icono
  const initiallyVisible = passwordInput.type === 'text';
  setToggleIcon(initiallyVisible);

  // Click: toggle
  togglePassBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isNowVisible = passwordInput.type === 'password';
    passwordInput.type = isNowVisible ? 'text' : 'password';
    setToggleIcon(isNowVisible);

    // mantener foco en el input para mejor UX y accesibilidad
    try { passwordInput.focus(); } catch(e){}
  });

  // Keydown: permitir activar con Enter / Space por accesibilidad si el botón tiene focus
  togglePassBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePassBtn.click();
    }
  });
}


const changePasswordBtn = document.getElementById('changePasswordBtn');
const resetForm = document.getElementById('resetForm');
const resetEmail = document.getElementById('resetEmail');
const sendResetBtn = document.getElementById('sendResetBtn');
const cancelResetBtn = document.getElementById('cancelResetBtn');
const forgotLink = document.getElementById('forgotPasswordLink');

/* Toggle UI for reset */
function openResetUI(prefillEmail = '') {
  if (loginForm) loginForm.style.display = 'none';
  if (resetForm) { resetForm.style.display = 'block'; resetEmail.value = prefillEmail; }
}
function closeResetUI() {
  if (resetForm) resetForm.style.display = 'none';
  if (loginForm) loginForm.style.display = 'block';
}

/* Event bindings */
// Submit login
// --------- Inicio: Reemplaza tu listener de login por este bloque ----------
loginForm && loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (authEmail.value || '').trim();
  const password = authPassword.value || '';
  if (!email || !password) return showToast('Completa email y contraseña', 'error');

  // helper: mapea errores de Firebase a mensajes amigables
  function friendlyAuthMessage(err) {
    if (!err) return 'Error al iniciar sesión';
    const code = (err.code || '').toString();
    // Casos específicos que queremos mostrar como "Estudiante no registrado"
    const mapToEstudianteNoRegistrado = new Set([
      'auth/user-not-found',
      'auth/invalid-credential',
      'auth/user-disabled',
    ]);
    if (mapToEstudianteNoRegistrado.has(code)) return 'Estudiante no registrado';

    // Otros códigos comunes
    if (code === 'auth/wrong-password') return 'Contraseña incorrecta';
    if (code === 'auth/invalid-email') return 'Correo inválido';
    if (code === 'auth/too-many-requests') return 'Demasiados intentos. Intenta más tarde';
    if (code === 'auth/network-request-failed') return 'Error de red. Revisa tu conexión';

    // Fallback: si no hay código, pero viene message (menos técnico)
    if (err.message && typeof err.message === 'string') {
      // evita mostrar el mensaje técnico de Firebase (código), preferimos más limpio
      return err.message.replace(/\(auth\/[^\)]+\)/, '').trim() || 'Error al iniciar sesión';
    }
    return 'Error al iniciar sesión';
  }

  try {
    const res = await auth.signInWithEmailAndPassword(email, password);
    currentUser = res.user;
    hideAuthScreen();
    showToast('Bienvenido', 'success');
    // carga estado y presencia luego de login
    loadUserProfile();
    loadMessages();
    loadOnlineUsers();
    loadRanking();
    updateUserOnline();
    updateMiniUI();
  } catch (err) {
    console.error('Login error:', err);
    // Usamos el mapper para mostrar un mensaje amigable
    const friendly = friendlyAuthMessage(err);
    showToast(friendly, 'error', 4000);
  }
});
// --------- Fin: Reemplaza tu listener de login por este bloque ----------


// "Cambiar contraseña" button
changePasswordBtn && changePasswordBtn.addEventListener('click', (e) => {
  // prefill con el email que pudo haber escrito el usuario
  const pre = (authEmail && authEmail.value) ? authEmail.value.trim() : '';
  openResetUI(pre);
});

// "Olvidaste la contraseña?" link
forgotLink && forgotLink.addEventListener('click', (e) => {
  e.preventDefault();
  const pre = (authEmail && authEmail.value) ? authEmail.value.trim() : '';
  openResetUI(pre);
});

// Cancel reset
cancelResetBtn && cancelResetBtn.addEventListener('click', ()=> {
  closeResetUI();
});

// Send reset (usa Firebase sendPasswordResetEmail por la opcion 1)
sendResetBtn && sendResetBtn.addEventListener('click', async () => {
  const email = (resetEmail.value || '').trim();
  if (!email) return showToast('Ingresa tu correo', 'error');
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('Enviado: revisa tu correo para cambiar la contraseña', 'success');
    closeResetUI();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error al enviar enlace', 'error');
  }
});

/********** FIN AUTH UI + logic **********/


/* ===== Helper mejorado: ocultar todas las secciones principales excepto la indicada ===== */
function hideAllMainSectionsExcept(exceptId) {
  // Lista explícita de secciones que manejamos en main-content
  const ids = [
    'homeCard',
    'achievementsPanel',
    'rankingCard',
    'friendsCard',
    'quizContainer',
    'professorsCard',
    'miniAchievements',
    'sectionTitle',
    'subscriptionsCard',
    'simulacroCard'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // Mostrar SOLO si coincide con exceptId
    if (id === exceptId) {
      // Algunos elementos necesitan display diferentes
      if (id === 'quizContainer') el.style.display = 'flex';
      else if (id === 'miniAchievements') el.style.display = 'flex';
      else if (id === 'achievementsPanel') { el.style.display = 'block'; el.classList.add('active'); }
      else el.style.display = 'block';
    } else {
      // Ocultar todo lo demás
      if (id === 'achievementsPanel') { el.style.display = 'none'; el.classList.remove('active'); }
      else el.style.display = 'none';
    }
  });

  // Asegurarnos de cerrar drawer/overlay cuando cambiamos secciones
  try { if (drawer) drawer.classList.remove('open'); } catch(e){}
  try { if (overlay) overlay.classList.remove('active'); } catch(e){}
}




    /***********************
     * DOM references
     ***********************/
    const menuToggle = document.getElementById('menuToggle');
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const navItems = document.querySelectorAll('.nav-item');
    const sectionTitle = document.getElementById('sectionTitle');
    const quizContainer = document.getElementById('quizContainer');
    const achievementsPanel = document.getElementById('achievementsPanel');
    const rankingCard = document.getElementById('rankingCard');
    const rankingList = document.getElementById('rankingList');
    const profileModal = document.getElementById('profileModal');
    const toastWrap = document.getElementById('toastWrap');

    /***********************
     * Drawer open/close + close when touch outside
     ***********************/
    menuToggle.addEventListener('click', (e) => {
      drawer.classList.add('open');
      overlay.classList.add('active');
    });
    overlay.addEventListener('click', () => {
      drawer.classList.remove('open');
      overlay.classList.remove('active');
    });

    // Close drawer when tapping/clicking outside (works for touch devices)
    document.addEventListener('pointerdown', (ev) => {
      if (!drawer.classList.contains('open')) return;
      const insideDrawer = ev.target.closest('#drawer') !== null;
      const isToggle = ev.target.closest('#menuToggle') !== null;
      if (!insideDrawer && !isToggle) {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
      }
    });

/***********************
 * Nav items behavior (reemplazado para evitar acumulación de secciones)
 ***********************/
navItems.forEach(item => {
  item.addEventListener('click', () => {
    // reset visual activo
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const section = item.getAttribute('data-section');
    // Actualiza el título si existe
    if (section && document.getElementById('sectionTitle')) document.getElementById('sectionTitle').textContent = section;

    // Mostrar solo la sección correspondiente
    if (section === 'Prueba') {
      // Abrir quiz a pantalla completa
      openQuizFullScreen();
      return;
    }

    if (section === 'Docentes') {
      hideAllMainSectionsExcept('professorsCard');
      const profCard = document.getElementById('professorsCard');
      if (profCard) profCard.style.display = 'block';
      loadProfessors();
      return;
    }

    if (section === 'Materiales') {
      hideAllMainSectionsExcept('homeCard');
      const home = document.getElementById('homeCard'); if (home) home.style.display = 'block';
      const mini = document.getElementById('miniAchievements'); if (mini) mini.style.display = 'flex';
      return;
    }

    if (section === 'Simulacro') {
      hideAllMainSectionsExcept('simulacroCard');
      const sc = document.getElementById('simulacroCard'); if (sc) sc.style.display = 'block';
      // precargar datos del usuario si aplica
      if (currentUser && simEmail) simEmail.value = currentUser.email || '';
      loadScheduledSimulacros();
      return;
    }

    if (section === 'Amigos') {
      hideAllMainSectionsExcept('friendsCard');
      const fc = document.getElementById('friendsCard'); if (fc) fc.style.display = 'block';
      loadFriends && loadFriends();
      return;
    }

    if (section === 'Ranking') {
      hideAllMainSectionsExcept('rankingCard');
      const rc = document.getElementById('rankingCard'); if (rc) rc.style.display = 'block';
      loadRanking && loadRanking();
      return;
    }

    if (section === 'Tarjetas de estudio' || section === 'Tarjetas') {
      // Si implementas una sección de tarjetas, oculta todo y muestra su card (añade id si existe)
      hideAllMainSectionsExcept('homeCard');
      return;
    }

    // fallback: mostrar Home
    hideAllMainSectionsExcept('homeCard');
    const homeFallback = document.getElementById('homeCard'); if (homeFallback) homeFallback.style.display = 'block';
  });
});

    /***********************
     * Modals openers
     ***********************/
    function openModal(id) {
      document.getElementById(id).style.display = 'flex';
      overlay.classList.add('active');
    }
    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
      overlay.classList.remove('active');
    }
    document.querySelectorAll('.close').forEach(el => {
      el.addEventListener('click', () => {
        el.closest('.modal').style.display = 'none';
        overlay.classList.remove('active');
      });
    });

    // Buttons that open modals/panels
    document.getElementById('profileIcon').addEventListener('click', () => openModal('profileModal'));
    document.getElementById('drawerProfile').addEventListener('click', () => openModal('profileModal'));
    document.getElementById('messagesIcon').addEventListener('click', () => openModal('messagesModal'));
    document.getElementById('drawerSettings').addEventListener('click', () => openModal('settingsModal'));


document.getElementById('onlineUsersIcon').addEventListener('click', () => {
  openModal('onlineUsersModal');
  // iniciar lista y delegación de forma segura e idempotente
  if (typeof ensureOnlineUsersShown === 'function') ensureOnlineUsersShown();
  else if (typeof loadOnlineUsers === 'function') loadOnlineUsers();
});



    // Drawer menu handlers
    document.getElementById('drawerAchievements').addEventListener('click', () => {
      achievementsPanel.classList.add('active');
      rankingCard.style.display = 'none';
      sectionTitle.textContent = 'Logros';
      drawer.classList.remove('open'); overlay.classList.remove('active');
      loadAchievementsInline();
    });
    document.getElementById('drawerRanking').addEventListener('click', () => {
      achievementsPanel.classList.remove('active');
      rankingCard.style.display = 'block';
      sectionTitle.textContent = 'Ranking';
      drawer.classList.remove('open'); overlay.classList.remove('active');
      loadRanking(); // refresh
    });

    /***********************
     * Toast notifications
     ***********************/
    function showToast(message, type='info', timeout=2600) {
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.textContent = message;
      toastWrap.appendChild(t);
      // show
      requestAnimationFrame(()=> t.classList.add('show'));
      setTimeout(()=> {
        t.classList.remove('show');
        setTimeout(()=> t.remove(), 300);
      }, timeout);
    }


// Helper: formatea/ajusta visual del badge cuando actualiza el contador
function updateMsgBadgeVisual() {
  const b = document.getElementById('msgBadge');
  if (!b) return;
  const v = parseInt(b.textContent || '0', 10) || 0;
  // usar clase small si es un solo dígito y no cero
  if (v > 0 && v < 10) b.classList.add('small');
  else b.classList.remove('small');
  // si el badge está vacío o 0, lo ocultamos (tu listener ya hace esto, esto es por seguridad)
  if (v <= 0) { b.style.display = 'none'; b.textContent = '0'; }
  else { b.style.display = 'flex'; b.textContent = String(v); }
}

// Llama a updateMsgBadgeVisual() justo después de cualquier cambio directo que hagas en #msgBadge.
// Por ejemplo, si usas startUnreadCountListener() que setea msgBadge.textContent y display,
// añade `updateMsgBadgeVisual()` justo después de esas asignaciones.


    /***********************
     * Avatars (animated SVGs)
     ***********************/
    const defaultAvatarsEl = document.getElementById('defaultAvatars');
    const defaultAvatars = [
      { id: 'a1', label: 'Hoja', svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#b1ff83"></stop><stop offset="1" stop-color="#58CC02"></stop></linearGradient></defs><rect width="80" height="80" rx="16" fill="url(#g1)"></rect><g transform="translate(8 12)"><path d="M8 38c12-18 38-28 54-14 0 0-15 22-30 30S8 46 8 38z" fill="#fff" opacity="0.9"><animate attributeName="d" dur="6s" repeatCount="indefinite" values="M8 38c12-18 38-28 54-14 0 0-15 22-30 30S8 46 8 38z; M8 36c11-16 36-24 52-12 0 0-14 18-28 26S8 44 8 36z; M8 38c12-18 38-28 54-14 0 0-15 22-30 30S8 46 8 38z"></animate></path></g></svg>` },
      { id: 'a2', label: 'Búho', svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" rx="16" fill="#fff5d6"></rect><g transform="translate(10 10)"><circle cx="25" cy="22" r="10" fill="#2fa200"><animate attributeName="r" values="10;12;10" dur="2.8s" repeatCount="indefinite"></animate></circle><circle cx="50" cy="22" r="10" fill="#b1ff83"></circle></g></svg>` },
      { id: 'a3', label: 'Sol', svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" rx="16" fill="#fff9e6"></rect><g><circle cx="40" cy="36" r="14" fill="#FFD400"><animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 40 36" to="360 40 36" dur="8s" repeatCount="indefinite"></animateTransform></circle><g opacity="0.2"><circle cx="40" cy="36" r="24" fill="#FFD400"><animate attributeName="opacity" values="0.12;0.22;0.12" dur="3s" repeatCount="indefinite"></animate></circle></g></g></svg>` },
      { id: 'a4', label: 'Libro', svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" rx="16" fill="#e8fff5"></rect><g transform="translate(8 16)"><rect x="8" y="8" width="52" height="36" rx="3" fill="#fff" stroke="#bfeec8"></rect><path d="M12 16c12 6 28 6 44 0" stroke="#cfead0" fill="none"><animate attributeName="d" dur="5s" repeatCount="indefinite" values="M12 16c12 6 28 6 44 0; M12 18c12 4 28 4 44 0; M12 16c12 6 28 6 44 0"></animate></path></g></svg>` }
    ];


    // =======================
// ROL: Profesores autorizados
// EDITA esta lista con los correos que quieras autorizar como profesores
const PROFESSOR_EMAILS = [
  'sysaccessvip@gmail.com',
  'orlandocordova1601@gmail.com'
];

function isEmailProfessor(email) {
  if (!email) return false;
  try {
    const e = String(email).trim().toLowerCase();
    return PROFESSOR_EMAILS.map(x => x.toLowerCase()).includes(e);
  } catch (err) {
    return false;
  }
}


    let selectedDefaultAvatarId = null;
    let avatarRemoved = false; // nueva: marca si el usuario decidió eliminar su avatar
const avatarPreviewEl = document.getElementById('avatarPreview');
const removeAvatarBtn = document.getElementById('removeAvatarBtn');

function renderDefaultAvatars() {
  if (!defaultAvatarsEl) return;
  defaultAvatarsEl.innerHTML = '';
  defaultAvatars.forEach(av => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '64px'; wrapper.style.height = '64px'; wrapper.style.borderRadius='10px';
    wrapper.style.cursor='pointer'; wrapper.style.display='flex'; wrapper.style.alignItems='center'; wrapper.style.justifyContent='center';
    wrapper.style.border='2px solid transparent';
    wrapper.style.overflow='hidden';
    wrapper.style.background = '#fff';
    wrapper.innerHTML = av.svg;
    wrapper.title = av.label;
    wrapper.dataset.id = av.id;
    wrapper.addEventListener('click', () => {
      // limpiar otras selecciones
      document.querySelectorAll('#defaultAvatars > div').forEach(d=>d.style.border='2px solid transparent');
      wrapper.style.border = '2px solid rgba(47,162,0,0.9)';
      selectedDefaultAvatarId = av.id;
      avatarRemoved = false; // porque eligió uno por defecto
      // limpiar file input temporal
      const input = document.getElementById('avatarFileInput');
      if (input) { input.value = ''; delete input.dataset.tempData; }
      // actualizar preview modal
      if (avatarPreviewEl) avatarPreviewEl.innerHTML = av.svg;
      // actualizar mini-preview texto
      const previewName = document.getElementById('profilePreviewName');
      if (previewName) previewName.textContent = (document.getElementById('editFirstName').value || '') + ' ' + (document.getElementById('editLastName').value || '');
    });
    defaultAvatarsEl.appendChild(wrapper);
  });
}

    renderDefaultAvatars();

    // file input handling: compress and save as DataURL to DB under users/<uid>/avatarData
    const avatarFileInput = document.getElementById('avatarFileInput');



    

if (avatarFileInput) {
  avatarFileInput.addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(f, 300, 300, 0.75);
      // Actualiza preview del modal
      if (avatarPreviewEl) avatarPreviewEl.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
      // Oculta placeholder global del header y actualiza profileImg si existe
      const profilePlaceholder = document.getElementById('profilePlaceholder');
      const profileImg = document.getElementById('profileImg');
      if (profilePlaceholder) profilePlaceholder.style.display = 'none';
      if (profileImg) { profileImg.src = dataUrl; profileImg.style.display = 'block'; }
      selectedDefaultAvatarId = null; // anulamos selección por defecto
      avatarRemoved = false; // ya hay una nueva imagen
      avatarFileInput.dataset.tempData = dataUrl;
    } catch(e) {
      console.error(e);
      showToast('Error al procesar la imagen', 'error');
    }
  });
}


if (removeAvatarBtn) {
  removeAvatarBtn.addEventListener('click', () => {
    // marca como eliminado y borra preview temporal
    avatarRemoved = true;
    selectedDefaultAvatarId = null;
    if (avatarFileInput) { avatarFileInput.value = ''; delete avatarFileInput.dataset.tempData; }
    // actualizar preview a placeholder
    if (avatarPreviewEl) {
      avatarPreviewEl.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#7b7b7b">?</div>`;
    }
    // también puedes actualizar perfil pequeño en modal
    const previewName = document.getElementById('profilePreviewName');
    if (previewName) previewName.textContent = (document.getElementById('editFirstName').value || '') + ' ' + (document.getElementById('editLastName').value || '');
    showToast('Avatar marcado para eliminación — guarda para confirmar', 'info', 2200);
  });
}


// Fallback robusto: abrir file picker desde el botón "Subir desde galería"
const uploadGalleryBtn = document.getElementById('uploadGalleryBtn');


if (uploadGalleryBtn && avatarFileInput) {
  uploadGalleryBtn.addEventListener('click', (e) => {
    e.preventDefault(); // prevenir comportamiento por defecto (seguridad)
    // disparar el selector de archivos — esto es una acción iniciada por el usuario, así que no la bloquean los navegadores
    avatarFileInput.click();
  });
}



// Function to toggle UI for professor vs student
function toggleProfessorFields(show) {
  const profFieldsEl = document.getElementById('profFields');
  const studentFields = document.getElementById('studentFields');
  const avatarPreviewWrapper = document.getElementById('avatarPreviewWrapper');
  const avatarPreview = document.getElementById('avatarPreview');

  if (show) {
    if (profFieldsEl) profFieldsEl.style.display = 'block';
    if (studentFields) studentFields.style.display = 'none';
    if (avatarPreviewWrapper) {
      avatarPreviewWrapper.classList.remove('avatar-preview-normal');
      avatarPreviewWrapper.classList.add('prof-avatar-frame');
      if (avatarPreview) avatarPreview.classList.add('prof-avatar-inner');
    }
  } else {
    if (profFieldsEl) profFieldsEl.style.display = 'none';
    if (studentFields) studentFields.style.display = 'block';
    if (avatarPreviewWrapper) {
      avatarPreviewWrapper.classList.add('avatar-preview-normal');
      avatarPreviewWrapper.classList.remove('prof-avatar-frame');
      if (avatarPreview) avatarPreview.classList.remove('prof-avatar-inner');
    }
  }
}

// attach change handler to checkbox (idempotente)
(function attachProfToggle() {
  const isProfEl = document.getElementById('editIsProfessor');
  if (!isProfEl) return;
  isProfEl.addEventListener('change', (ev) => {
    const allowed = isEmailProfessor((currentUser && currentUser.email) ? currentUser.email : null);
    if (isProfEl.checked && !allowed) {
      // si no está autorizado, desmarcar y avisar
      isProfEl.checked = false;
      showToast('Tu correo no está autorizado como profesor', 'error');
      return;
    }
    toggleProfessorFields(!!isProfEl.checked);
  });
})();


    // compress image using canvas, returns dataURL
    function fileToCompressedDataUrl(file, maxW=300, maxH=300, quality=0.8) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
            let w = img.width, h = img.height;
            const ratio = Math.min(maxW / w, maxH / h, 1);
            w = Math.round(w * ratio); h = Math.round(h * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

// Save profile (mejorado para profesor)
const saveProfileBtn = document.getElementById('saveProfile');
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
    // campos comunes
    const firstName = (document.getElementById('editFirstName') ? document.getElementById('editFirstName').value : '').trim();
    const lastName  = (document.getElementById('editLastName') ? document.getElementById('editLastName').value : '').trim();
    const career    = (document.getElementById('editCareer') ? document.getElementById('editCareer').value : '').trim();
    const level     = (document.getElementById('editLevel') ? document.getElementById('editLevel').value : '').trim();

    if (!currentUser) return showToast('Espere autenticación...', 'error');

    // Si es STUDENT: requiere nombre/apellidos (comportamiento previo)
    const isProfEl = document.getElementById('editIsProfessor');
    const userEmail = (currentUser && currentUser.email) ? currentUser.email : null;
    const allowed = isEmailProfessor(userEmail);

    // preparar updates
    const userRef = db.ref('users/' + currentUser.uid);
    const updates = {};

    // Si es profesor y está autorizado -> guardamos datos de profesor
    if (isProfEl && isProfEl.checked) {
      if (!allowed) return showToast('Tu correo no está autorizado como profesor', 'error');

      const profName = (document.getElementById('editProfessorName') ? document.getElementById('editProfessorName').value : '').trim();
      const specialty = (document.getElementById('editSpecialty') ? document.getElementById('editSpecialty').value : '').trim();
      const department = (document.getElementById('editDepartment') ? document.getElementById('editDepartment').value : '').trim();
      const officeHours = (document.getElementById('editOfficeHours') ? document.getElementById('editOfficeHours').value : '').trim();
      const bio = (document.getElementById('editBio') ? document.getElementById('editBio').value : '').trim();

      // Nombre principal que mostraremos en la UI
      if (!profName) return showToast('Ingresa tu nombre profesional (mostrar)', 'error');

      // Guardar como profesor: guardamos role y un objeto professor
      updates.role = 'professor';
      updates.name = profName;
      updates.fullName = profName;
      updates.lastName = ''; // opcional: vacío porque usamos name profesional
      updates.professor = {
        displayName: profName,
        specialty: specialty || '',
        department: department || '',
        officeHours: officeHours || '',
        bio: bio || ''
      };

      // Podríamos opcionalmente mantener career/level, pero por defecto los dejamos
      if (career) updates.career = career;
      if (level) updates.level = level;
    } else {
      // Guardar como student (comportamiento previo)
      if (!firstName || !lastName) return showToast('Por favor ingresa tus nombres y apellidos', 'error');
      updates.fullName = firstName;
      updates.lastName = lastName;
      updates.name = `${firstName} ${lastName}`;
      updates.career = career || 'Sin carrera';
      updates.level = level || '';
      updates.role = 'student';
      // remover posible objeto professor (opcional: si dejó de ser profesor)
      updates.professor = null;
    }

    // AVATAR (misma lógica anterior)
    const avatarFileInput = document.getElementById('avatarFileInput');
    const dataUrlTemp = avatarFileInput ? avatarFileInput.dataset.tempData : null;
    if (dataUrlTemp) {
      updates.avatarData = dataUrlTemp;
      updates.avatarDefault = null;
    } else if (typeof avatarRemoved !== 'undefined' && avatarRemoved) {
      updates.avatarData = null;
      updates.avatarDefault = null;
    } else if (typeof selectedDefaultAvatarId !== 'undefined' && selectedDefaultAvatarId) {
      updates.avatarDefault = selectedDefaultAvatarId;
      updates.avatarData = null;
    }

    try {
      await userRef.update(updates);
      // limpiar temp
      if (avatarFileInput) { avatarFileInput.value = ''; delete avatarFileInput.dataset.tempData; }
      selectedDefaultAvatarId = null;
      avatarRemoved = false;
      closeModal('profileModal');
      await loadUserProfile(); // recargar UI con nuevos datos
      updateUserOnline();
      showToast('Perfil guardado', 'success');
    } catch (err) {
      console.error('Error guardar perfil:', err);
      showToast('Error al guardar perfil', 'error');
    }
  });
}


    const cancelProfileBtn = document.getElementById('cancelProfile');
    if (cancelProfileBtn) {
      cancelProfileBtn.addEventListener('click', () => {
        if (avatarFileInput) { avatarFileInput.value = ''; delete avatarFileInput.dataset.tempData; }
        selectedDefaultAvatarId = null;
        closeModal('profileModal');
      });
    }

// loadUserProfile mejorada: sincroniza campos de profesor si corresponde
async function loadUserProfile() {
  if (!currentUser) return;
  const snap = await db.ref('users/' + currentUser.uid).once('value');
  const data = snap.val() || {};

  // Nombre y apellidos (compatibilidad)
  const firstName = data.fullName || '';
  const lastName = data.lastName || '';
  const combinedName = data.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Anónimo');

  const drawerNameEl = document.getElementById('drawerName');
  const drawerCareerEl = document.getElementById('drawerCareer');

  if (drawerNameEl) drawerNameEl.textContent = combinedName;
  if (drawerCareerEl) {
    const careerText = data.career ? data.career : 'Sin carrera';
    const levelText = data.level ? ` • ${data.level}` : '';
    drawerCareerEl.textContent = `${careerText}${levelText}`;
  }

  // preview modal
  const previewName = document.getElementById('profilePreviewName');
  const previewSub = document.getElementById('profilePreviewSub');
  if (previewName) previewName.textContent = combinedName;
  if (previewSub) previewSub.textContent = `${data.career || 'Sin carrera'}${data.level ? ' • ' + data.level : ''}${data.role === 'professor' ? ' • PROFESOR' : ''}`;

  // Rellenar inputs del modal (student)
  const editFirstEl = document.getElementById('editFirstName');
  const editLastEl = document.getElementById('editLastName');
  const editCareerEl = document.getElementById('editCareer');
  const editLevelEl = document.getElementById('editLevel');

  if (editFirstEl) editFirstEl.value = firstName || (data.name ? data.name.split(' ')[0] : '');
  if (editLastEl) editLastEl.value = lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : '');
  if (editCareerEl) editCareerEl.value = data.career || '';
  if (editLevelEl) editLevelEl.value = data.level || '';

  // Profesor: sincronizar checkbox y campos
  const isProfEl = document.getElementById('editIsProfessor');
  const profNoteEl = document.getElementById('profNote');
  const userEmail = (currentUser && currentUser.email) ? currentUser.email : (data.email || '');
  const allowed = isEmailProfessor(userEmail);

  if (isProfEl) {
    const isProfFromData = (data.role && data.role === 'professor');
    isProfEl.checked = !!isProfFromData;
    isProfEl.disabled = !allowed;
    if (!allowed && profNoteEl) {
      profNoteEl.textContent = 'Tu correo no está autorizado para marcarte como profesor.';
      profNoteEl.style.color = 'var(--muted)';
    } else if (allowed && profNoteEl) {
      profNoteEl.textContent = 'Marca si eres profesor (verificado por tu correo).';
      profNoteEl.style.color = 'var(--muted)';
    }
  }

  // Llenar campos de profesor si existe
  const profFieldsEl = document.getElementById('profFields');
  const profNameEl = document.getElementById('editProfessorName');
  const profSpecEl = document.getElementById('editSpecialty');
  const profDeptEl = document.getElementById('editDepartment');
  const profOfficeEl = document.getElementById('editOfficeHours');
  const profBioEl = document.getElementById('editBio');

  if (data.professor) {
    if (profNameEl) profNameEl.value = data.professor.displayName || data.name || '';
    if (profSpecEl) profSpecEl.value = data.professor.specialty || '';
    if (profDeptEl) profDeptEl.value = data.professor.department || '';
    if (profOfficeEl) profOfficeEl.value = data.professor.officeHours || '';
    if (profBioEl) profBioEl.value = data.professor.bio || '';
  } else {
    if (profNameEl) profNameEl.value = '';
    if (profSpecEl) profSpecEl.value = '';
    if (profDeptEl) profDeptEl.value = '';
    if (profOfficeEl) profOfficeEl.value = '';
    if (profBioEl) profBioEl.value = '';
  }

  // Avatar: preview y marco de profesor si aplica
  const avatarImgEl = document.getElementById('drawerAvatarImg');
  const profileImg = document.getElementById('profileImg');
  const profilePlaceholder = document.getElementById('profilePlaceholder');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarPreviewWrapper = document.getElementById('avatarPreviewWrapper');

  if (data.avatarData) {
    if (avatarImgEl){ avatarImgEl.src = data.avatarData; avatarImgEl.style.display='block'; }
    if (profileImg){ profileImg.src = data.avatarData; profileImg.style.display='block'; }
    if (avatarPreview) avatarPreview.innerHTML = `<img src="${data.avatarData}" style="width:100%;height:100%;object-fit:cover">`;
    if (profilePlaceholder) profilePlaceholder.style.display='none';
    selectedDefaultAvatarId = null;
    avatarRemoved = false;
  } else if (data.avatarDefault) {
    const av = defaultAvatars.find(a => a.id === data.avatarDefault);
    if (av) {
      const svgData = 'data:image/svg+xml;utf8,' + encodeURIComponent(av.svg);
      if (avatarImgEl){ avatarImgEl.src = svgData; avatarImgEl.style.display='block'; }
      if (profileImg){ profileImg.src = svgData; profileImg.style.display='block'; }
      if (avatarPreview) avatarPreview.innerHTML = av.svg;
      if (profilePlaceholder) profilePlaceholder.style.display='none';
      selectedDefaultAvatarId = data.avatarDefault;
      avatarRemoved = false;
    }
  } else {
    if (avatarImgEl) avatarImgEl.style.display='none';
    if (profileImg) profileImg.style.display='none';
    if (avatarPreview) avatarPreview.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#7b7b7b">?</div>`;
    if (profilePlaceholder) profilePlaceholder.style.display='block';
    selectedDefaultAvatarId = null;
    avatarRemoved = false;
  }

  // Mostrar/ocultar campos profesor segun role
  if (profFieldsEl) {
    if (data.role === 'professor') {
      profFieldsEl.style.display = 'block';
      // activar marco animado en wrapper
      if (avatarPreviewWrapper) {
        avatarPreviewWrapper.classList.remove('avatar-preview-normal');
        avatarPreviewWrapper.classList.add('prof-avatar-frame');
        // poner el contenido dentro del contenedor inner con clase
        avatarPreview.classList.add('prof-avatar-inner');
      }
    } else {
      profFieldsEl.style.display = 'none';
      if (avatarPreviewWrapper) {
        avatarPreviewWrapper.classList.remove('prof-avatar-frame');
        avatarPreviewWrapper.classList.add('avatar-preview-normal');
        avatarPreview.classList.remove('prof-avatar-inner');
      }
    }
  }



  // Mostrar u ocultar menú de Suscripciones según rol (solo profesores)
  const drawerSubscriptionsEl = document.getElementById('drawerSubscriptions');
  if (drawerSubscriptionsEl) {
    if (data.role === 'professor') {
      drawerSubscriptionsEl.style.display = 'block';
    } else {
      drawerSubscriptionsEl.style.display = 'none';
    }
  }




  updateMiniUI();
}



    function updateMiniUI() {
      if (!currentUser) return;
      const today = new Date().toISOString().split('T')[0];
      db.ref('userProgress/' + currentUser.uid + '/' + today).once('value').then(snap => {
        const v = snap.val() || 0;
        const miniProgress = document.getElementById('miniProgress');
        const miniScore = document.getElementById('miniScore');
        if (miniProgress) miniProgress.textContent = `${v} preguntas hoy`;
        if (miniScore) miniScore.textContent = `Puntos: (ver ranking)`;
      });
    }

    /***********************
     * Update online presence
     ***********************/
/* ========== C: Presencia y lista ajustada (reemplazar versiones antiguas) ========== */

function updateUserOnline() {
  if (!currentUser) return;
  const userRef = db.ref('online/' + currentUser.uid);
  db.ref('users/' + currentUser.uid).once('value').then(snap => {
    const data = snap.val() || {};
    const name = data.name || (data.fullName || 'Anónimo');
    let avatar = null;
    if (data.avatarData) avatar = data.avatarData;
    else if (data.avatarDefault) {
      const av = defaultAvatars.find(a => a.id === data.avatarDefault);
      if (av) avatar = 'data:image/svg+xml;utf8,' + encodeURIComponent(av.svg);
    }

userRef.set({
  name,
  avatar: avatar || null,
  online: true,
  lastSeen: firebase.database.ServerValue.TIMESTAMP,
  role: (data && data.role) ? data.role : null
})

    
    
    
    .then(() => {
      try {
        // onDisconnect para entornos que soportan it (recomendado)
        userRef.onDisconnect().update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
      } catch(e){ console.warn('onDisconnect no disponible:', e); }
    }).catch(e => console.warn('Error set presence:', e));
  }).catch(e => console.warn('Error reading profile for presence:', e));
}



// ---------- Reemplazar loadOnlineUsers() por esta versión mejorada ----------
async function getRelationWith(uid) {
  // devuelve: 'self' | 'friends' | 'incoming_request' | 'outgoing_request' | 'not_friends'
  if (!currentUser) return 'not_friends';
  if (uid === currentUser.uid) return 'self';
  try {
    // friend existencia
    const [friendSnap, incomingSnap, outgoingSnap] = await Promise.all([
      db.ref(`friends/${currentUser.uid}/${uid}`).once('value'),
      // incoming: user (uid) -> me (currentUser.uid) => friendRequests/<myUid>/<uid>
      db.ref(`friendRequests/${currentUser.uid}/${uid}`).once('value'),
      // outgoing: me -> user => friendRequests/<uid>/<myUid>
      db.ref(`friendRequests/${uid}/${currentUser.uid}`).once('value'),
    ]);
    if (friendSnap.exists()) return 'friends';
    if (incomingSnap.exists()) return 'incoming_request';
    if (outgoingSnap.exists()) return 'outgoing_request';
    return 'not_friends';
  } catch (e) {
    console.warn('getRelationWith error', e);
    return 'not_friends';
  }
}

function formatLastSeen(ts) {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString();
  } catch(e) { return '-'; }
}

// Formatea timestamp (ms o valor numérico) a "DD/MM/YYYY HH:MM"
function formatTimestamp(ts) {
  if (!ts) return '-';
  try {
    // Firebase suele guardar timestamps como número (ms)
    const t = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(t.getDate());
    const month = pad(t.getMonth() + 1);
    const year = t.getFullYear();
    const hours = pad(t.getHours());
    const minutes = pad(t.getMinutes());
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return '-';
  }
}



function createAvatarHtml(u) {
  if (!u) return `<div class="avatar" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f6fff6,#e6ffe6)"></div>`;
  if (u.avatarData) return `<img class="avatar" src="${u.avatarData}" alt="${u.name||'avatar'}" style="width:46px;height:46px;border-radius:50%;object-fit:cover">`;
  if (u.avatarDefault) {
    const av = defaultAvatars.find(a=>a.id === u.avatarDefault);
    if (av) return `<img class="avatar" src="data:image/svg+xml;utf8,${encodeURIComponent(av.svg)}" alt="${u.name||'avatar'}" style="width:46px;height:46px;border-radius:50%;object-fit:cover">`;
  }
  return `<div class="avatar" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f6fff6,#e6ffe6)"></div>`;
}

function buildControlsForRelation(relation, uid) {
  // devuelve HTML string de controles (botones). Algunos botones tendrán data-uid para listeners.
  if (relation === 'self') return `<div></div>`; // sin controles para yo mismo

  if (relation === 'friends') {
    // Ya son amigos: NO mostrar botón "Mensaje" en la vista de USUARIOS EN LÍNEA.
    // Mostramos un badge "Amigos" y el botón "Cancelar amistad".
    return `
      <div class="controls" style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <div class="friend-badge" style="font-weight:700;color:var(--muted);padding:6px 8px;border-radius:8px;background:transparent">Amigos</div>
        <button class="btn small secondary remove-friend-btn" data-uid="${uid}">Cancelar amistad</button>
      </div>
    `;
  }

  if (relation === 'incoming_request') {
    return `<div class="controls" style="display:flex;flex-direction:column;gap:6px">
              <button class="btn small accept-online-req" data-from="${uid}">Aceptar</button>
              <button class="btn small secondary decline-online-req" data-from="${uid}">Rechazar</button>
            </div>`;
  }

  if (relation === 'outgoing_request') {
    // en vez de un botón deshabilitado "Pendiente", mostramos "Cancelar solicitud"
    return `<div class="controls" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <button class="btn small cancel-outgoing-req" data-to="${uid}">Cancelar solicitud</button>
            </div>`;
  }

  // not_friends -> mostrar "Agregar"
  return `<div class="controls"><button class="btn small add-friend-btn" data-uid="${uid}">Agregar</button></div>`;
}


function renderOnlineItem(uData, relation) {
  const name = uData.name || (uData.fullName || 'Anónimo');
  const last = uData.lastSeen ? formatLastSeen(uData.lastSeen) : (uData.online ? 'Conectado' : '-');
  const avatarHtml = createAvatarHtml(uData);
  const controlsHtml = buildControlsForRelation(relation, uData.uid);

  // badge PROFESOR si aplica
  const profBadgeHtml = (uData.role === 'professor') ? `<div style="font-size:11px;font-weight:800;background:#FFD400;color:#000;padding:4px 6px;border-radius:8px;margin-left:8px">PROF.</div>` : '';

  return `
    <div class="online-item" data-uid="${uData.uid}" style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:12px;background:#fff;border:1px solid rgba(0,0,0,0.04);margin-bottom:10px">
      <div class="left" style="display:flex;align-items:center;gap:10px;min-width:0">
        ${avatarHtml}
        <div class="meta" style="min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="name" style="font-weight:700">${name}</div>
            ${profBadgeHtml}
          </div>
          <div class="status" style="font-size:12px;color:#666">${uData.online ? 'Conectado' : 'Desconectado • ' + last}</div>
        </div>
      </div>
      ${controlsHtml}
    </div>
  `;
}



/* ---------- sendFriendRequestSimple (lógica pura, sin toasts) ---------- */
async function sendFriendRequestSimple(toUid) {
  if (!currentUser) throw new Error('No autenticado');
  if (toUid === currentUser.uid) throw new Error('No puedes enviarte solicitud a ti mismo');

  try {
    // evitar duplicados de amistad
    const already = await db.ref(`friends/${currentUser.uid}/${toUid}`).once('value');
    if (already.exists()) return { ok: false, reason: 'already_friends' };

    // mi perfil
    const meSnap = await db.ref('users/' + currentUser.uid).once('value');
    const me = meSnap.val() || {};
    const payload = {
      from: currentUser.uid,
      name: me.name || (me.fullName || 'Anónimo'),
      avatar: me.avatarData || (me.avatarDefault ? ('data:image/svg+xml;utf8,' + encodeURIComponent((defaultAvatars.find(a=>a.id===me.avatarDefault)||{}).svg||'')) : null),
      ts: firebase.database.ServerValue.TIMESTAMP,
      type: 'friend_request'
    };

    // 1) Guardar la solicitud en friendRequests/<toUid>/<fromUid>
    await db.ref(`friendRequests/${toUid}/${currentUser.uid}`).set(payload);

    // 2) NOTIFICACIÓN: escribir con clave determinista para evitar duplicados
    const notifKey = `${currentUser.uid}_friend_request_${toUid}`;
    await db.ref(`notifications/${toUid}/${notifKey}`).set(payload);

    // 3) (Opcional) registrar outgoing en mi nodo para UI local
    await db.ref(`users/${currentUser.uid}/outgoingFriendRequests/${toUid}`).set({
      to: toUid, ts: firebase.database.ServerValue.TIMESTAMP
    });

    // No mostramos toasts aquí: RESPONSABILIDAD del caller (UI)
    return { ok: true };
  } catch (err) {
    console.error('sendFriendRequestSimple', err);
    // devolver error para que el caller lo maneje y muestre un toast/modal
    return { ok: false, error: err };
  }
}



/* Mostrar globo superior con aceptar/rechazar */
function showNotifBalloon(n, notifKey) {
  const balloon = document.getElementById('notifBalloon');
  const textEl = document.getElementById('notifText');
  const actionsEl = document.getElementById('notifActions');
  textEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
    ${n.avatar ? `<img src="${n.avatar}" style="width:44px;height:44px;border-radius:50%">` : `<div style="width:44px;height:44px;border-radius:50%;background:#f0f0f0"></div>`}
    <div><strong>${n.name}</strong><div style="font-size:13px;color:#666">Te ha enviado una solicitud</div></div>
  </div>`;
  actionsEl.innerHTML = `
    <button class="btn small" id="acceptNotif">Aceptar</button>
    <button class="btn small secondary" id="declineNotif">Rechazar</button>
  `;
  balloon.classList.add('notif-visible');
  // handlers
  document.getElementById('acceptNotif').onclick = async () => {
    await acceptFriendRequestFrom(n.from, notifKey);
    balloon.classList.remove('notif-visible');
  };
  document.getElementById('declineNotif').onclick = async () => {
    await declineFriendRequestFrom(n.from, notifKey);
    balloon.classList.remove('notif-visible');
  };
  // auto-hide después de 12s
  setTimeout(()=> balloon.classList.remove('notif-visible'), 12000);
}


async function sendPrivateMessage(toUid, text) {
  if (!currentUser) return showToast('Inicia sesión', 'error');
  if (!text) return;
  // comprobar amistad
  const isFriendSnap = await db.ref(`friends/${currentUser.uid}/${toUid}`).once('value');
  if (!isFriendSnap.exists()) return showToast('Solo puedes enviar mensajes a amigos', 'error');

  const convId = createConversationId(currentUser.uid, toUid);
  const msg = { from: currentUser.uid, to: toUid, text, ts: firebase.database.ServerValue.TIMESTAMP };
  try {
    // push del mensaje
    const pushRef = await db.ref(`privateMessages/${convId}`).push(msg);
    const shortText = text.length > 80 ? text.slice(0,80) + '…' : text;

    // preparar updates atómicas: conversations para ambos y marca "unread" para el receptor
    const updates = {};
    updates[`conversations/${currentUser.uid}/${convId}`] = { convId, otherUid: toUid, lastText: shortText, lastTs: firebase.database.ServerValue.TIMESTAMP };
    updates[`conversations/${toUid}/${convId}`] = { convId, otherUid: currentUser.uid, lastText: shortText, lastTs: firebase.database.ServerValue.TIMESTAMP, unread: true };

    await db.ref().update(updates);

    // Incrementar contador global de unread del receptor (transacción segura)
    try {
      await db.ref(`users/${toUid}/unreadMessagesCount`).transaction(current => {
        return (current || 0) + 1;
      });
    } catch(e) {
      console.warn('No se pudo incrementar unreadMessagesCount:', e);
    }

    // Append optimista (con key del push) para mostrar inmediatamente
    if (openConversationId === convId) appendMessageToOpenChat({ from: currentUser.uid, to: toUid, text, ts: Date.now(), key: pushRef.key });

    return { ok: true, key: pushRef.key };
  } catch (err) {
    console.error('sendPrivateMessage', err);
    showToast('Error enviando mensaje', 'error');
    return { ok: false, error: err };
  }
}



    /***********************
     * Ranking (improved)
     ***********************/
    async function loadRanking() {
      const today = new Date().toISOString().split('T')[0];
      const rankingRef = db.ref('dailyScores/' + today);
      const snap = await rankingRef.orderByValue().limitToLast(20).once('value');
      const scores = snap.val();
      const rows = [];
      if (scores) {
        Object.entries(scores).forEach(([uid, score]) => rows.push({ uid, score }));
        rows.sort((a,b)=>b.score - a.score);
      }
      if (rankingList) rankingList.innerHTML = '';
      if (!rows.length) {
        if (rankingList) rankingList.innerHTML = '<p style="color:var(--muted)">Sin puntuaciones aún.</p>';
      } else {
        rows.forEach((r, idx) => {
          const rowEl = document.createElement('div');
          rowEl.className = 'rank-row mt-8';
          rowEl.innerHTML = `
            <div class="pos" style="background:${idx===0? 'linear-gradient(180deg,#FFEB99,#FFD400)': idx===1? '#e6ffe6': idx===2? '#f0f0f0':'transparent'}">
              ${idx+1}
            </div>
            <div class="info">
              <div id="avatar-${r.uid}" style="width:44px;height:44px;border-radius:50%;overflow:hidden;background:#f0f0f0"></div>
              <div style="flex:1">
                <div id="name-${r.uid}" style="font-weight:700">Cargando...</div>
                <div style="font-size:13px;color:var(--muted)">${r.score} pts</div>
              </div>
              <div style="width:36px">${trophySvgForPos(idx)}</div>
            </div>
          `;
          rankingList.appendChild(rowEl);
          db.ref('users/' + r.uid).once('value').then(snapU => {
            const data = snapU.val() || {};
            const name = data.name || 'Anónimo';
            const avatarEl = document.getElementById(`avatar-${r.uid}`);
            const nameEl = document.getElementById(`name-${r.uid}`);
            if (nameEl) nameEl.textContent = name;
            if (avatarEl) {
              if (data.avatarData) {
                avatarEl.innerHTML = `<img src="${data.avatarData}" class="avatar" style="width:44px;height:44px;border-radius:50%">`;
              } else if (data.avatarDefault) {
                const av = defaultAvatars.find(a=>a.id===data.avatarDefault);
                if (av) avatarEl.innerHTML = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(av.svg)}" class="avatar" style="width:44px;height:44px;border-radius:50%">`;
              } else {
                avatarEl.innerHTML = `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#f6fff6,#e6ffe6)"></div>`;
              }
            }
          });
        });
      }

      const modalList = document.getElementById('rankingListModal');
      if (modalList) {
        if (!rows.length) modalList.innerHTML = '<p style="color:var(--muted)">Sin puntuaciones aún.</p>';
        else modalList.innerHTML = '<ol>' + rows.map(r => `<li>${r.score} pts - ${r.uid}</li>`).join('') + '</ol>';
      }
    }



// Helper simple para escapar contenido que viene de DB
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(str) { return escapeHtml(str); }

// Cargar y renderizar lista de profesores (versión que garantiza vista exclusiva)
async function loadProfessors() {
  const container = document.getElementById('professorsCard');
  const listEl = document.getElementById('professorsList');
  if (!listEl || !container) return;

  // Oculta todo y muestra sólo profesores
  hideAllMainSectionsExcept('professorsCard');
  container.style.display = 'block';
  if (document.getElementById('sectionTitle')) document.getElementById('sectionTitle').textContent = 'Docentes';

  listEl.innerHTML = '<p style="color:var(--muted)">Cargando docentes...</p>';

  try {
    const snap = await db.ref('users').orderByChild('role').equalTo('professor').once('value');
    const data = snap.val();
    if (!data) {
      listEl.innerHTML = '<p style="color:var(--muted)">No hay docentes registrados.</p>';
      return;
    }

    const arr = Object.entries(data).map(([uid, u]) => ({ uid, ...u }));
    arr.sort((a,b) => ((a.name||'').toLowerCase() > (b.name||'').toLowerCase()) ? 1 : -1);



    // ... después de obtener 'arr' y ordenar
    listEl.innerHTML = '';

    // Pre-cargar suscripciones del currentUser para performance
    let mySubs = {};
    if (currentUser) {
      try {
        const sSnap = await db.ref(`users/${currentUser.uid}/subscriptions`).once('value');
        mySubs = sSnap.val() || {};
      } catch(e) { mySubs = {}; }
    }

    for (const p of arr) {
      // marcar si el usuario actual está suscrito y aún vigente
      if (currentUser) {
        const sub = mySubs[p.uid];
        if (sub && sub.expiryTs && (parseInt(sub.expiryTs,10) > Date.now())) {
          p._isSubscribed = true;
        } else {
          p._isSubscribed = false;
        }
      } else {
        p._isSubscribed = false;
      }

      const card = document.createElement('div');
      card.className = 'prof-card';

      // avatar logic (igual que antes)
      let avatarHtml = `<div class="prof-avatar">${p.avatarData ? `<img src="${p.avatarData}" style="width:100%;height:100%;object-fit:cover">` : (p.avatarDefault ? `<img src="data:image/svg+xml;utf8,${encodeURIComponent((defaultAvatars.find(a=>a.id===p.avatarDefault)||{}).svg||'')}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#7b7b7b">${(p.name||'')[0]||'?'}</div>`)}</div>`;
      avatarHtml = `<div class="prof-avatar-animated">${avatarHtml}</div>`;

      const specialty = p.professor && p.professor.specialty ? p.professor.specialty : (p.specialty || '');
      const department = p.professor && p.professor.department ? p.professor.department : (p.department || '');
      const officeHours = p.professor && p.professor.officeHours ? p.professor.officeHours : (p.officeHours || '');
      const bio = p.professor && p.professor.bio ? p.professor.bio : (p.bio || '');
      const name = p.professor && p.professor.displayName ? p.professor.displayName : (p.name || p.fullName || 'Profesor');

      const mainLine = `<div style="display:flex;flex-direction:column;min-width:0">
                          <div class="prof-name">${escapeHtml(name)}</div>
                          <div class="prof-meta">${escapeHtml(specialty || department || '')}</div>
                        </div>`;

      card.innerHTML = `
        <div class="prof-top">
          ${avatarHtml}
          ${mainLine}
        </div>

        <div class="prof-body">
          <div class="prof-row">
            ${ specialty ? `<div class="prof-chip">${escapeHtml(specialty)}</div>` : '' }
            ${ department ? `<div class="prof-chip">${escapeHtml(department)}</div>` : '' }
            ${ officeHours ? `<div style="font-size:13px;color:var(--muted)">Horario: ${escapeHtml(officeHours)}</div>` : '' }
          </div>

          <div class="prof-row">
            <div style="flex:1;color:#444">${escapeHtml(bio ? (bio.length>220 ? bio.slice(0,220)+'…' : bio) : 'Sin descripción')}</div>
          </div>

          <div class="prof-actions">
            ${ (currentUser && (currentUser.uid !== p.uid)) ? `<button class="btn small subscribe-btn" data-uid="${p.uid}">${p._isSubscribed ? 'INICIAR PRUEBA' : 'SUSCRIBIRSE'}</button>` : '' }
          </div>
        </div>
      `;

      listEl.appendChild(card);
    }

    // después de renderizar todas las cards, attach handlers para botones SUSCRIBIRSE / INICIAR PRUEBA
    listEl.querySelectorAll('.subscribe-btn').forEach(b => {
      b.addEventListener('click', async (ev) => {
        const toUid = ev.currentTarget.dataset.uid;
        // si el estudiante ya está suscrito: abrir prueba; si no -> abrir modal suscripción
        if (!currentUser) return showToast('Inicia sesión', 'error');
        try {
          // recalc subscription quickly
          const sSnap = await db.ref(`users/${currentUser.uid}/subscriptions/${toUid}`).once('value');
          const sub = sSnap.val();
          const valid = sub && sub.expiryTs && (parseInt(sub.expiryTs,10) > Date.now());
          if (valid) {
            // abrir prueba asociada
            openQuizForProfessor(toUid);
          } else {
            // abrir modal de suscripción
            const profSnap = await db.ref('users/' + toUid).once('value');
            const prof = profSnap.val() || {};
            openSubscribeModalFor(toUid, prof.name || prof.fullName || 'Docente');
          }
        } catch (err) {
          console.error('subscribe-btn handler err', err);
          showToast('Error. Intenta de nuevo.', 'error');
        }
      });
    });



  } catch (err) {
    console.error('loadProfessors error', err);
    listEl.innerHTML = `<p style="color:#ef4444">Error cargando docentes.</p>`;
  }
}

    
/* ---------- Suscripciones: flujo SUSCRIBIRSE -> QR -> confirmar pago -> registrar suscripción 1 semana ---------- */

// generar URL de QR usando Google Chart API (simple y sin librerías). 
// El texto del QR será instrucciones para Yape (puede incluir phone o referencia).
function generateYapeQrUrl(prof, amountText = 'S/5.00') {
  // intenta usar el número Yape del profesor si existe
  const yapePhone = (prof && prof.professor && prof.professor.yape) || prof.yapePhone || '';
  const name = prof && (prof.professor && prof.professor.displayName) ? prof.professor.displayName : (prof.name || prof.fullName || 'Docente');
  const ref = `Suscripción a ${name}`; // referencia visible
  // texto libre que la persona verá al escanear el QR (puede adaptarse a formato que tu profesor espere)
  const payload = `Pagar a: ${yapePhone || '[NÚMERO YAPE DEL DOCENTE]'}%0AMonto: ${amountText}%0AConcepto: ${ref}%0ANota: Después de pagar pulsa "He pagado" en la app.`;
  // Google Chart QR endpoint — genera un PNG con el texto codificado
  const base = 'https://chart.googleapis.com/chart';
  const params = `?cht=qr&chs=350x350&chl=${encodeURIComponent(payload)}`;
  return base + params;
}

// abrir modal de suscripción con QR y acciones
async function openSubscribeModalFor(profUid, profName) {
  if (!currentUser) return showToast('Inicia sesión para suscribirte', 'error');
  try {
    // obtener perfil del profesor
    const snap = await db.ref('users/' + profUid).once('value');
    const prof = snap.val() || {};
    // generar QR
    const qrUrl = generateYapeQrUrl(prof, prof.professor && prof.professor.subscriptionAmount ? prof.professor.subscriptionAmount : 'S/5.00');

    // construir modal simple (reutilizamos notifBalloon o creamos modal dinámico)
    // Vamos a crear un overlay/modal temporal y reutilizable
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 10000;

    const modal = document.createElement('div');
    modal.style.width = 'min(560px,94%)';
    modal.style.background = '#fff';
    modal.style.borderRadius = '12px';
    modal.style.padding = '18px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
    modal.style.fontFamily = 'system-ui,Segoe UI,Roboto,Arial';
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="font-weight:800;font-size:16px">Suscribirse a ${escapeHtml(profName)}</div>
        <button class="cc-close" aria-label="Cerrar" style="background:none;border:none;font-size:20px;cursor:pointer">×</button>
      </div>
      <div style="margin-top:12px;color:#333">
        <div style="display:flex;gap:12px;flex-direction:column;align-items:center">
          <img id="subscribeQrImg" src="${qrUrl}" alt="QR Yape" style="width:260px;height:260px;border-radius:8px;border:1px solid #eee;"/>
          <div style="font-size:13px;color:var(--muted);text-align:center">Escanea con Yape (o app bancaria que soporte QR). Paga el monto indicado y luego confirma "He pagado".</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <a id="downloadQrBtn" class="btn small" href="${qrUrl}" download="yape_qr_${profUid}.png">Descargar QR</a>
        <button id="paidConfirmBtn" class="btn">He pagado</button>
        <button id="cancelSubBtn" class="btn small secondary">Cancelar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // handlers
    modal.querySelector('.cc-close').addEventListener('click', () => overlay.remove());
    modal.querySelector('#cancelSubBtn').addEventListener('click', () => overlay.remove());

    // permitir descarga directa (ya hemos puesto href al GoogleCharts)
    const downloadBtn = modal.querySelector('#downloadQrBtn');
    // Forzar descarga en algunos navegadores: abrir en nueva pestaña (fallback)
    downloadBtn.addEventListener('click', (e) => {
      // dejar que el enlace funcione naturalmente; su comportamiento depende del navegador
      setTimeout(() => {}, 200);
    });

    modal.querySelector('#paidConfirmBtn').addEventListener('click', async () => {
      // Confirmar pago manual: crear suscripción en Firebase con expiry = ahora + 7 días
      try {
        const nowMs = Date.now();
        const expiryMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 días en ms
        const updates = {};
        const subPath = `subscriptions/${profUid}/${currentUser.uid}`;
        const userSubPath = `users/${currentUser.uid}/subscriptions/${profUid}`;
        updates[subPath] = {
          studentUid: currentUser.uid,
          professorUid: profUid,
          startTs: firebase.database.ServerValue.TIMESTAMP,
          expiryTs: expiryMs
        };
        updates[userSubPath] = {
          professorUid: profUid,
          startTs: firebase.database.ServerValue.TIMESTAMP,
          expiryTs: expiryMs
        };
        await db.ref().update(updates);
        showToast('Suscripción creada por 7 días. ¡Disfruta la prueba!', 'success', 4000);
        overlay.remove();
        // refrescar lista de profesores para actualizar botón a INICIAR PRUEBA
        loadProfessors && loadProfessors();
      } catch (err) {
        console.error('Error creando suscripción', err);
        showToast('No se pudo confirmar la suscripción. Intenta de nuevo.', 'error');
      }
    });

  } catch (err) {
    console.error('openSubscribeModalFor error', err);
    showToast('No se pudo generar QR. Intenta más tarde.', 'error');
  }
}

// comprobar si el usuario actual está suscrito a profUid y aún vigente
async function checkSubscriptionValid(profUid) {
  if (!currentUser) return false;
  try {
    const snap = await db.ref(`subscriptions/${profUid}/${currentUser.uid}`).once('value');
    const v = snap.val();
    if (!v) return false;
    const now = Date.now();
    // si expiryTs es menor o igual ahora -> inválida
    if (!v.expiryTs) return false;
    return (parseInt(v.expiryTs, 10) > now);
  } catch (e) {
    console.warn('checkSubscriptionValid error', e);
    return false;
  }
}

// abrir quiz pero marcado con profesor (guardamos temporalmente currentQuizProfessor)
let currentQuizProfessor = null;
async function openQuizForProfessor(profUid) {
  if (!currentUser) return showToast('Inicia sesión para tomar la prueba', 'error');
  // validar suscripción
  const ok = await checkSubscriptionValid(profUid);
  if (!ok) {
    return showConfirmModal({
      title: 'Suscripción requerida',
      message: 'Tu suscripción expiró o no estás suscrito. ¿Deseas suscribirte ahora?',
      confirmText: 'Suscribirme',
      cancelText: 'Cancelar'
    }).then(async (answer) => {
      if (answer) {
        // abrir modal de suscripción
        const profSnap = await db.ref('users/' + profUid).once('value');
        const prof = profSnap.val() || {};
        await openSubscribeModalFor(profUid, prof.name || prof.fullName || 'Docente');
      }
    });
  }
  // si está ok, setear variable y abrir quiz normal
  currentQuizProfessor = profUid;
  openQuizFullScreen(); // tu función existente
}

// cuando finaliza el quiz, guardamos intento asociado al profesor (si aplica)
const _orig_endQuiz = typeof endQuiz === 'function' ? endQuiz : null;
function endQuiz() {
  // si ya tienes una implementación, seguimos la tuya y añadir la parte de guardar intento
  // llamamos a la versión original (si existe) para mostrar pantalla
  if (_orig_endQuiz) _orig_endQuiz();
  // además guardamos el intento si currentQuizProfessor está definido
  try {
    if (currentQuizProfessor && currentUser) {
      const profUid = currentQuizProfessor;
      const scoreToSave = (typeof score !== 'undefined') ? score : 0;
      const payload = {
        studentUid: currentUser.uid,
        score: scoreToSave,
        ts: firebase.database.ServerValue.TIMESTAMP
      };
      // Guardar bajo professorAttempts/<profUid>/<studentUid>/<pushKey>
      db.ref(`professorAttempts/${profUid}/${currentUser.uid}`).push(payload).catch(e => console.warn('save attempt err', e));
      // limpiar marca
      currentQuizProfessor = null;
    }
  } catch (e) { console.warn('endQuiz save err', e); currentQuizProfessor = null; }
}



    function trophySvgForPos(i) {
      if (i === 0) {
        return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M7 3h10v3a5 5 0 0 1-4 4v2h-2v-2a5 5 0 0 1-4-4V3z" fill="#FFD400"></path></svg>`;
      } else if (i === 1) {
        return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M7 3h10v3a5 5 0 0 1-4 4v2h-2v-2a5 5 0 0 1-4-4V3z" fill="#cfcfcf"></path></svg>`;
      } else if (i === 2) {
        return `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M7 3h10v3a5 5 0 0 1-4 4v2h-2v-2a5 5 0 0 1-4-4V3z" fill="#e6b77a"></path></svg>`;
      } else {
        return `<svg width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#e9ffe6"></circle></svg>`;
      }
    }

    const refreshRankingBtn = document.getElementById('refreshRanking');
    if (refreshRankingBtn) refreshRankingBtn.addEventListener('click', loadRanking);

    /***********************
     * Achievements inline
     ***********************/
    async function loadAchievementsInline() {
      if (!currentUser) return;
      const today = new Date().toISOString().split('T')[0];
      const progressSnap = await db.ref('userProgress/' + currentUser.uid + '/' + today).once('value');
      const v = progressSnap.val() || 0;
      const content = document.getElementById('achievementsContent');
      if (!content) return;
      content.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
          <div style="width:72px;height:72px;border-radius:12px;background:linear-gradient(90deg,#fff,#f6fff6);display:flex;align-items:center;justify-content:center">
            <svg width="36" height="36" viewBox="0 0 24 24"><path d="M12 2l2.4 4.8L20 8l-4 3.6L17 20l-5-2.6L7 20l1-8.4L4 8l5.6-1.2L12 2z" fill="#FFD400"></path></svg>
          </div>
          <div>
            <div style="font-weight:800">Progreso diario</div>
            <div style="color:var(--muted)">${v} preguntas respondidas hoy</div>
            <div style="margin-top:8px"><button class="btn" id="openAchievementsCloseBtn">Cerrar panel</button></div>
          </div>
        </div>
      `;
      const closeBtn = document.getElementById('openAchievementsCloseBtn');
      if (closeBtn) closeBtn.addEventListener('click', ()=> achievementsPanel.classList.remove('active'));
    }

    /***********************
     * Messages / Settings
     ***********************/
/* ---------- Reemplaza/Inserta: loadMessages (muestra solicitudes dentro de Mensajes Privados) ---------- */
async function loadMessages() {
  const ml = document.getElementById('messagesList');
  if (!ml) return;
  if (!currentUser) {
    ml.innerHTML = '<p>Inicia sesión para ver mensajes.</p>';
    return;
  }

  // Estructura: solicitudes arriba, luego conversaciones
  ml.innerHTML = `
    <div id="reqsArea"><h3 style="margin:0 0 8px 0">Solicitudes de amistad</h3><div id="friendReqs">Cargando...</div></div>
    <hr style="margin:10px 0">
    <div id="convsArea"><h3 style="margin:0 0 8px 0">Mensajes Privados</h3><div id="convList">Cargando...</div></div>
  `;

  // 1) Cargar solicitudes (friendRequests/<myUid>)
  const reqsSnap = await db.ref('friendRequests/' + currentUser.uid).once('value');
  const reqs = reqsSnap.val();
  const reqsArea = document.getElementById('friendReqs');
  if (!reqs || Object.keys(reqs).length === 0) {
    reqsArea.innerHTML = '<p style="color:var(--muted);margin:0">Sin solicitudes pendientes.</p>';
  } else {
    let html = '';
    // reqs guarda por fromUid: { from, name, avatar, ts }
    Object.entries(reqs).forEach(([fromUid, r]) => {
      const name = r.name || 'Anónimo';
      const avatar = r.avatar || null;
      html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-radius:10px;margin-bottom:8px;background:#fff;border:1px solid rgba(0,0,0,0.03)">
          <div style="display:flex;align-items:center;gap:10px">
            ${ avatar ? `<img src="${avatar}" style="width:46px;height:46px;border-radius:50%">` : `<div style="width:46px;height:46px;border-radius:50%;background:#f0f0f0"></div>` }
            <div>
              <div style="font-weight:700">${name}</div>
              <div style="font-size:12px;color:#666">Te ha enviado una solicitud</div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn small accept-req" data-from="${fromUid}">Aceptar</button>
            <button class="btn small secondary decline-req" data-from="${fromUid}">Rechazar</button>
          </div>
        </div>
      `;
    });
    reqsArea.innerHTML = html;

    // listeners de aceptar/rechazar
    reqsArea.querySelectorAll('.accept-req').forEach(b => {
      b.onclick = (ev) => { const from = ev.currentTarget.dataset.from; acceptFriendRequestFrom(from); };
    });
    reqsArea.querySelectorAll('.decline-req').forEach(b => {
      b.onclick = (ev) => { const from = ev.currentTarget.dataset.from; declineFriendRequestFrom(from); };
    });
  }

  // 2) Renderizar lista de conversaciones (sin mostrar UID)
  await renderConversationList(); // usa la función ya provista (asegúrate de tenerla)
}



    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        const diffEl = document.getElementById('difficultySelect');
        if (!diffEl) return;
        const diff = diffEl.value;
        localStorage.setItem('difficulty', diff);
        closeModal('settingsModal');
        showToast('Configuración guardada', 'success');
      });
    }
    const cancelSettingsBtn = document.getElementById('cancelSettings');
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', ()=> closeModal('settingsModal'));

    /***********************
     * Confetti implementation (simple)
     ***********************/
    const confettiCanvas = document.getElementById('confettiCanvas');
    const ctx = confettiCanvas.getContext('2d');
    let confettiParticles = [];
    function resizeConfetti() {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeConfetti);
    resizeConfetti();

    function launchConfetti(x = window.innerWidth/2, y = window.innerHeight/3, count = 40) {
      for (let i = 0; i < count; i++) {
        confettiParticles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * -8 - 2,
          size: Math.random()*8 + 4,
          color: ['#FFD400','#58CC02','#FF7A59','#06B6D4'][Math.floor(Math.random()*4)],
          rot: Math.random()*360,
          vr: (Math.random()-0.5)*10,
          life: 80 + Math.random()*40
        });
      }
      if (!confettiRunning) startConfettiLoop();
    }

    let confettiRunning = false;
    function startConfettiLoop() {
      confettiRunning = true;
      (function loop() {
        ctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
        for (let i = confettiParticles.length-1; i >= 0; i--) {
          const p = confettiParticles[i];
          p.vy += 0.3; // gravity
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          p.life--;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
          ctx.restore();
          if (p.life <= 0 || p.y > confettiCanvas.height + 50) confettiParticles.splice(i,1);
        }
        if (confettiParticles.length > 0) requestAnimationFrame(loop);
        else confettiRunning = false;
      })();
    }

    /***********************
     * Quiz logic
     ***********************/
    const questions = [
      { q: "¿Cuál es la capital del Perú?", a: ["Lima", "Cusco", "Arequipa", "Trujillo"], correct: 0 },
      { q: "¿Quién escribió 'La ciudad y los perros'?", a: ["Mario Vargas Llosa", "César Vallejo", "José María Arguedas", "Alfredo Bryce Echenique"], correct: 0 },
      { q: "¿En qué año se fundó la Universidad Hermilio Valdizán?", a: ["1968", "1970", "1965", "1972"], correct: 2 }
    ];
    let currentQuestion = 0, score = 0, timerInterval = null;
    let ringCircle = null, ringCircumference = 0;

    function buildQuizDOM() {
      // Hide any open overlays/panels
      drawer.classList.remove('open'); overlay.classList.remove('active'); achievementsPanel.classList.remove('active'); rankingCard.style.display = 'none';

      // Make sure quizContainer visible
      quizContainer.style.display = 'flex';
      quizContainer.innerHTML = `
        <div id="quizFS" class="quiz-fullscreen animated-texture">
          <div style="width:100%;max-width:980px;display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;gap:12px;align-items:center">
              <div style="font-weight:800;color:var(--duo-dark);font-size:18px">PRUEBA</div>
              <div style="color:var(--muted);font-size:13px" id="qProgress">Pregunta 1/${questions.length}</div>
            </div>
            <div>
              <button class="btn secondary" id="exitQuizBtn">Cerrar</button>
            </div>
          </div>

          <div style="margin-top:22px;display:flex;flex-direction:column;align-items:center;gap:8px;width:100%">
            <div class="timer-wrap">
              <div class="timer-ring">
                <svg width="86" height="86" viewBox="0 0 86 86">
                  <defs><linearGradient id="gRing" x1="0" x2="1"><stop offset="0" stop-color="#58CC02"></stop><stop offset="1" stop-color="#FFD400"></stop></linearGradient></defs>
                  <circle cx="43" cy="43" r="36" stroke="#e6f7e6" stroke-width="8" fill="none"></circle>
                  <circle id="timerRing" cx="43" cy="43" r="36" stroke="url(#gRing)" stroke-width="8" stroke-linecap="round" fill="none" transform="rotate(-90 43 43)"></circle>
                </svg>
              </div>
              <div class="timer" id="timerText">30s</div>
            </div>

            <div class="question" id="questionText">Pregunta...</div>
            <div class="options" id="optionsList"></div>
            <div class="result" id="resultText"></div>
          </div>
        </div>
      `;
      const exitBtn = document.getElementById('exitQuizBtn');
      if (exitBtn) exitBtn.addEventListener('click', () => {
        endQuizAndClose();
      });

      ringCircle = document.getElementById('timerRing');
      if (ringCircle) {
        const r = parseFloat(ringCircle.getAttribute('r')) || 36;
        ringCircumference = 2 * Math.PI * r;
        ringCircle.style.strokeDasharray = ringCircumference;
        ringCircle.style.strokeDashoffset = 0;
      }
    }

    function openQuizFullScreen() {
      // add quiz-active to body to hide everything else (top/bottom/drawer/main-content)
      document.body.classList.add('quiz-active');
      buildQuizDOM();
      startQuiz();
      window.scrollTo(0,0);
    }

    function closeQuizIfOpen() {
      if (document.body.classList.contains('quiz-active')) {
        document.body.classList.remove('quiz-active');
        quizContainer.innerHTML = '';
        quizContainer.style.display = 'none';
        clearInterval(timerInterval);
      }
    }

    // ensure start button works even if dynamic: event delegation
    document.addEventListener('click', (e) => {
      if (e.target.matches('#startQuizBtn') || (e.target.closest && e.target.closest('#startQuizBtn'))) {
        openQuizFullScreen();
      }
      if (e.target.matches('#closeResultBtn')) {
        endQuizAndClose();
      }
    });

    // redundant direct listeners kept
    const maybeStartBtn = document.getElementById('startQuizBtn');
    if (maybeStartBtn) maybeStartBtn.addEventListener('click', openQuizFullScreen);
    const maybeQuizNav = document.getElementById('quizNavItem');
    if (maybeQuizNav) maybeQuizNav.addEventListener('click', openQuizFullScreen);

    function startQuiz() {
      currentQuestion = 0; score = 0;
      showQuestion();
    }

    function showQuestion() {
      const qWrap = document.getElementById('quizFS');
      if (!qWrap) return;
      if (currentQuestion >= questions.length) { endQuiz(); return; }
      const q = questions[currentQuestion];
      const qText = document.getElementById('questionText');
      const qProgress = document.getElementById('qProgress');
      const optionsDiv = document.getElementById('optionsList');
      if (qText) qText.textContent = q.q;
      if (qProgress) qProgress.textContent = `Pregunta ${currentQuestion+1}/${questions.length}`;
      if (optionsDiv) {
        optionsDiv.innerHTML = '';
        q.a.forEach((opt, i) => {
          const div = document.createElement('div');
          div.className = 'option animated-texture';
          div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div>${opt}</div><div style="opacity:0.15">></div></div>`;
          div.addEventListener('click', () => selectOption(i, q.correct, div));
          optionsDiv.appendChild(div);
        });
      }
      startTimerAnimated(30);
      const res = document.getElementById('resultText'); if (res) res.textContent = '';
    }

    function startTimerAnimated(seconds) {
      clearInterval(timerInterval);
      let time = seconds;
      const timerText = document.getElementById('timerText');
      if (timerText) timerText.textContent = `${time}s`;
      if (ringCircle) {
        ringCircle.style.transition = 'none';
        ringCircle.style.strokeDashoffset = 0;
        setTimeout(()=> ringCircle.style.transition = 'stroke-dashoffset 1s linear', 20);
      }
      const total = seconds;
      timerInterval = setInterval(() => {
        time--;
        if (time < 0) time = 0;
        if (timerText) timerText.textContent = `${time}s`;
        if (ringCircle) {
          const elapsed = total - time;
          const fraction = elapsed / total;
          const offset = ringCircumference * fraction;
          ringCircle.style.strokeDashoffset = offset;
        }
        if (time <= 0) {
          clearInterval(timerInterval);
          const res = document.getElementById('resultText'); if (res) res.textContent = '¡Tiempo agotado!';
          setTimeout(()=> {
            currentQuestion++;
            showQuestion();
          }, 1200);
        }
      }, 1000);
    }

    async function selectOption(selected, correct, divEl) {
      clearInterval(timerInterval);
      const options = document.querySelectorAll('.option');
      options.forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === correct) opt.classList.add('correct');
        if (i === selected && i !== correct) opt.classList.add('wrong');
      });

      const resEl = document.getElementById('resultText');
      if (selected === correct) {
        if (resEl) resEl.textContent = '¡Correcto!';
        // play correct sound + applause
        const correctAudio = document.getElementById('correctSound');
        const applauseAudio = document.getElementById('applauseSound');
        try { correctAudio.currentTime = 0; correctAudio.play(); } catch(e){}
        setTimeout(()=> { try { applauseAudio.currentTime = 0; applauseAudio.play(); } catch(e) {} }, 250);
        score += 10;
        const rect = divEl.getBoundingClientRect();
        launchConfetti(rect.left + rect.width/2, rect.top + rect.height/2, 28);
      } else {
        if (resEl) resEl.textContent = 'Incorrecto';
        try { document.getElementById('wrongSound').currentTime = 0; document.getElementById('wrongSound').play(); } catch(e){}
      }

      if (currentUser) {
        const today = new Date().toISOString().split('T')[0];
        db.ref('dailyScores/' + today + '/' + currentUser.uid).transaction(current => (current || 0) + (selected === correct ? 10 : 0));
        db.ref('userProgress/' + currentUser.uid + '/' + today).transaction(current => (current || 0) + 1);
      }

      setTimeout(()=> {
        try { document.getElementById('nextSound').currentTime = 0; document.getElementById('nextSound').play(); } catch(e){}
        currentQuestion++;
        showQuestion();
      }, 900);
    }

    function endQuiz() {
      clearInterval(timerInterval);
      const qWrap = document.getElementById('quizFS');
      if (!qWrap) return;
      qWrap.innerHTML = `
        <div style="text-align:center">
          <div style="font-weight:900;font-size:28px;color:var(--duo-dark)">¡Quiz terminado!</div>
          <div style="margin-top:12px;font-size:18px">Puntuación total</div>
          <div style="font-size:34px;font-weight:900;margin-top:8px">${score}</div>
          <div style="margin-top:18px"><button class="btn" id="closeResultBtn">Cerrar y volver</button></div>
        </div>
      `;
    }

    function endQuizAndClose() {
      updateMiniUI();
      loadRanking();
      document.body.classList.remove('quiz-active');
      quizContainer.innerHTML = '';
      quizContainer.style.display = 'none';
      clearInterval(timerInterval);
      document.querySelectorAll('.nav-item').forEach(i=> i.classList.remove('active'));
      const homeNav = document.querySelector('.nav-item[data-section="Materiales"]');
      if (homeNav) homeNav.classList.add('active');
      sectionTitle.textContent = 'Materiales';
      showToast('Prueba finalizado', 'info');
      // restore any other UI state
      drawer.classList.remove('open');
      overlay.classList.remove('active');
    }

    /***********************
     * Initial UI wiring
     ***********************/
    const homeIcon = document.getElementById('homeIcon');
    if (homeIcon) {
      homeIcon.addEventListener('click', ()=> {
        achievementsPanel.classList.remove('active');
        rankingCard.style.display = 'none';
        sectionTitle.textContent = 'Materiales';
        document.querySelectorAll('.nav-item').forEach(i=> i.classList.remove('active'));
        const homeNav = document.querySelector('.nav-item[data-section="Materiales"]');
        if (homeNav) homeNav.classList.add('active');
      });
    }

/* ---------- Reemplaza/Inserta: handler para abrir Mensajes Privados ---------- */
const messagesIcon = document.getElementById('messagesIcon');
if (messagesIcon) {
  messagesIcon.addEventListener('click', () => {
    openMessagesModal();
  });
}

/* Abre modal de mensajes, carga solicitudes y limpia notificaciones */
async function openMessagesModal() {
  openModal('messagesModal');      // abre el modal (ya lo usabas)
  await loadMessages();            // carga solicitudes + conversaciones
  // al abrir el modal, limpiamos notificaciones push que ya viste

    if (currentUser) {
      try { await db.ref(`notifications/${currentUser.uid}`).remove(); } catch(e){ console.warn(e); }
      // NO reseteamos el contador global aquí: se limpia cuando se abre la conversación concreta.
      // Sincronizamos el badge visual con el valor en DB por si quedó desincronizado:
      try {
        db.ref(`users/${currentUser.uid}/unreadMessagesCount`).once('value').then(snap => {
          const v = snap.val() || 0;
          const msgBadge = document.getElementById('msgBadge');
          if (msgBadge) {
            if (v > 0) { msgBadge.style.display = 'flex'; msgBadge.textContent = String(v); }
            else { msgBadge.style.display = 'none'; msgBadge.textContent = '0'; }
          }
        });
      } catch(e){}
    }




}



// ----------------- Nuevo handler de cierre de sesión -----------------
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      // Si no hay usuario, nada que hacer
      if (!currentUser) return;

      // 1) Eliminar la presencia online (si aplica)
      try {
        await db.ref('online/' + currentUser.uid).remove();
      } catch (e) {
        console.warn('No se pudo eliminar presencia online:', e);
      }

      // 2) Cerrar sesión en Firebase (esto asegura que se requiera login otra vez)
      // 2) Cerrar sesión en Firebase (esto asegura que se requiera login otra vez)
      stopOnlineUsersListener();
      stopFriendsPresenceListeners();

      await auth.signOut();


      // 3) Limpiar estado local y UI sensible
      currentUser = null;
      // Opcional: limpiar inputs de auth (por seguridad/UX)
      const authEmailEl = document.getElementById('authEmail');
      const authPassEl  = document.getElementById('authPassword');
      if (authEmailEl) authEmailEl.value = '';
      if (authPassEl) authPassEl.value = '';

      // 4) Cerrar/ocultar pantallas internas y mostrar login explícitamente
      // Cierra drawer/modal/quiz que puedan quedar abiertos
      document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
      if (drawer) drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      // Cerrar quiz si está abierto
      if (document.body.classList.contains('quiz-active')) {
        document.body.classList.remove('quiz-active');
        quizContainer.innerHTML = '';
        quizContainer.style.display = 'none';
        clearInterval(timerInterval);
      }

      // 5) Mostrar pantalla de autenticación (tu función showAuthScreen debe existir)
      if (typeof showAuthScreen === 'function') {
        showAuthScreen();
      } else {
        // si por alguna razón no existe showAuthScreen, forzamos mostrar el authScreen
        const el = document.getElementById('authScreen');
        if (el) { el.style.display = 'flex'; document.body.classList.add('auth-active'); }
      }

      // 6) Mensaje al usuario
      showToast('Sesión cerrada. Ingresa tus datos para volver a entrar.', 'info');

    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      showToast('Error al cerrar sesión. Intenta de nuevo.', 'error');
    }
  });
}
// --------------------------------------------------------------------



    document.getElementById('closeProfile').addEventListener('click', ()=> closeModal('profileModal'));
    document.getElementById('closeMessages').addEventListener('click', ()=> closeModal('messagesModal'));
document.getElementById('closeOnline').addEventListener('click', () => {
  closeModal('onlineUsersModal');
  stopOnlineUsersListener(); // detener para evitar listeners mientras está cerrado
});

    document.getElementById('closeSettings').addEventListener('click', ()=> closeModal('settingsModal'));
    document.getElementById('closeRanking').addEventListener('click', ()=> closeModal('rankingModal'));

    // initial difficulty
    const savedDiff = localStorage.getItem('difficulty') || 'medium';
    const diffEl = document.getElementById('difficultySelect');
    if (diffEl) diffEl.value = savedDiff;

    // safety load profile after auth
    setTimeout(()=>{ if (auth.currentUser) loadUserProfile(); }, 800);

    // make sure drawer ranking click toggles display
    const drawerRanking = document.getElementById('drawerRanking');
    if (drawerRanking) drawerRanking.addEventListener('click', ()=> { rankingCard.style.display='block'; });

    // ensure confetti canvas is sized properly initially
    resizeConfetti();



    /* ========== E: Chat UI / conversations / init / unload ========== */

let openConversationId = null;
let openConversationOther = null;
let currentMessagesListenerRef = null;
// Map para listeners de presencia de amigos: uid -> firebase ref
let _friendsPresenceRefs = {};


// Map<convId, Set<messageKey>> para evitar duplicados cuando se usa
// append optimista + listener 'child_added'
const seenMessageKeys = new Map();


async function openChatWithUser(uid, name, avatar=null) {
  if (!currentUser) return showToast('Inicia sesión', 'error');
  openConversationId = createConversationId(currentUser.uid, uid);
  openConversationOther = { uid, name, avatar };
  openModal('messagesModal');
  const ml = document.getElementById('messagesList');
  if (!ml) return;

  // Construir UI del chat (igual que antes)
  ml.innerHTML = `
    <div class="chat-header" style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:8px">
        ${avatar ? `<img src="${avatar}" style="width:44px;height:44px;border-radius:50%">` : `<div style="width:44px;height:44px;border-radius:50%;background:#f0f0f0"></div>`}
        <div style="font-weight:800">${name}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn small secondary" id="backToMsgs">Volver</button>
        <button class="btn small danger" id="deleteConvBtn" title="Eliminar conversación">Eliminar</button>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages" style="max-height:56vh;overflow:auto;padding-top:8px"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <input id="chatInput" placeholder="Escribe un mensaje..." style="flex:1;padding:10px;border-radius:10px;border:1px solid #e6e6e6" />
      <button class="btn" id="chatSendBtn">Enviar</button>
    </div>
  `;

  // --- LIMPIAR bandera 'unread' SOLO para esta conversación (si existía) y decrementar contador global ---
  // --- MARCAR conversación como leída y recalcular contador global ---
  try {
    await markConversationAsRead(openConversationId);
  } catch (e) {
    console.warn('Error marcando conversación como leída:', e);
  }



  // Actualizar badge visual local (por si queda desincronizado)
  try {
    const msgBadge = document.getElementById('msgBadge');
    if (msgBadge) {
      // leer contador actual y actualizar (pero el listener también lo hará)
      db.ref(`users/${currentUser.uid}/unreadMessagesCount`).once('value').then(snap => {
        const v = snap.val() || 0;
        if (v > 0) { msgBadge.style.display = 'flex'; msgBadge.textContent = String(v); }
        else { msgBadge.style.display = 'none'; msgBadge.textContent = '0'; }
      });
    }
  } catch(e){}

  // Back and delete handlers (iguales que antes)
  document.getElementById('backToMsgs').onclick = ()=> {
    try { if (openConversationId && seenMessageKeys.has(openConversationId)) seenMessageKeys.delete(openConversationId); } catch(e){}
    openConversationId = null;
    openConversationOther = null;
    currentMessagesListenerRef && (currentMessagesListenerRef.off && currentMessagesListenerRef.off());
    loadMessages();
  };

  const deleteBtn = document.getElementById('deleteConvBtn');


  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!openConversationId || !openConversationOther) return;

      // Mostramos modal con DOS opciones en un solo confirm:
      // - Confirm (true) => "Eliminar mis mensajes para todos"
      // - Cancel (false)  => "Eliminar solo para mí"
      const choice = await showConfirmModal({
        title: 'Eliminar conversación',
        message: '¿Qué deseas hacer?\n\nAceptar = Eliminar mis mensajes para todos (mis mensajes serán borrados también del otro usuario).\nCancelar = Eliminar solo para mí (la conversación se ocultará en tu lista).',
        confirmText: 'Eliminar mis mensajes para todos',
        cancelText: 'Eliminar solo para mí'
      });

      // choice === true  -> eliminar mis mensajes para todos
      // choice === false -> eliminar solo para mí (ocultar)
      try {
        await deleteConversation(openConversationId, openConversationOther.uid, Boolean(choice));
        // refrescar UI (según tu código original)
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) chatMessages.innerHTML = '<p style="color:var(--muted)">La conversación fue eliminada.</p>';
        try { renderConversationList(); } catch(e){}
        try { seenMessageKeys.delete(openConversationId); } catch(e){}
        openConversationId = null;
        openConversationOther = null;
        showToast('Operación completada', 'info');
      } catch (err) {
        console.error('deleteConversation error (handler)', err);
        await showAlertModal('Error', 'No se pudo eliminar la conversación. Intenta de nuevo.');
      }
    });
  }

  document.getElementById('chatSendBtn').onclick = async () => {
    const textEl = document.getElementById('chatInput');
    const txt = (textEl.value || '').trim();
    if (!txt) return;
    await sendPrivateMessage(openConversationOther.uid, txt);
    textEl.value = '';
  };

  // attach listener inmediatamente; no "Cargando mensajes" textual
  attachMessagesListener(openConversationId);
}

function attachMessagesListener(convId) {
  // detach previo (defensivo)
  try {
    if (currentMessagesListenerRef) {
      currentMessagesListenerRef.off();
    }
  } catch(e){ console.warn('Error detaching previous messages listener', e); }

  // Limpiar sets antiguos (evita fugas si cambiamos de conv)
  // Conservamos solo el set de la conversación activa (si hay otros, los borramos)
  try {
    for (const k of Array.from(seenMessageKeys.keys())) {
      if (k !== convId) seenMessageKeys.delete(k);
    }
  } catch(e){}

  const chatDiv = document.getElementById('chatMessages');
  if (!chatDiv) return;
  chatDiv.innerHTML = ''; // limpio para evitar texto "Cargando"

  // inicializar conjunto visto para esta conversación
  seenMessageKeys.set(convId, new Set());

const ref = db.ref(`privateMessages/${convId}`).limitToLast(200);
currentMessagesListenerRef = ref;
safeUnlisten(ref, 'child_added'); // detach any prev
safeListen(ref, 'child_added', snap => {
  const m = snap.val();
  appendMessageToOpenChat({ ...m, key: snap.key });
});

}



function appendMessageToOpenChat(m) {
  const chatDiv = document.getElementById('chatMessages');
  if (!chatDiv) return;

  const convId = openConversationId;
  let seen = seenMessageKeys.get(convId);
  if (!seen) {
    seen = new Set();
    seenMessageKeys.set(convId, seen);
  }

  // evitar duplicados por key o pseudo-key
  if (m.key) {
    if (seen.has(m.key)) return;
    seen.add(m.key);
  } else {
    const pseudo = `${m.ts || 0}_${m.from || ''}_${(m.text || '').slice(0, 40)}`;
    if (seen.has(pseudo)) return;
    seen.add(pseudo);
  }

  const isMe = m.from === (currentUser && currentUser.uid);

  // bubble wrapper
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = isMe ? 'flex-end' : 'flex-start';
  wrapper.style.marginBottom = '8px';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ' + (isMe ? 'me' : 'them');
  bubble.style.maxWidth = '78%';
  bubble.style.padding = '10px 12px';
  bubble.style.borderRadius = '12px';
  bubble.style.background = isMe ? 'linear-gradient(90deg,#58CC02,#FFD400)' : '#fff';
  bubble.style.color = isMe ? '#000' : '#111';
  bubble.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
  bubble.style.wordBreak = 'break-word';

  // message text
  const msgText = document.createElement('div');
  msgText.textContent = m.text || '';
  msgText.style.marginBottom = '6px';
  bubble.appendChild(msgText);

  // timestamp (usa m.ts si existe, si no Date.now())
  const tsVal = (m.ts && typeof m.ts === 'number') ? m.ts : (m.ts && m.ts['.sv'] ? Date.now() : (m.ts || Date.now()));
  const tsEl = document.createElement('div');
  tsEl.className = 'msg-ts';
  tsEl.textContent = formatTimestamp(tsVal);
  tsEl.style.fontSize = '11px';
  tsEl.style.opacity = '0.6';
  tsEl.style.textAlign = 'right';
  bubble.appendChild(tsEl);

  wrapper.appendChild(bubble);
  chatDiv.appendChild(wrapper);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}


async function renderConversationList() {
  if (!currentUser) return;
  const convListEl = document.getElementById('convList');
  if (!convListEl) return;
  const snap = await db.ref(`conversations/${currentUser.uid}`).orderByChild('lastTs').once('value');
  const convs = snap.val();
  if (!convs) {
    convListEl.innerHTML = '<p style="color:var(--muted)">Sin conversaciones.</p>';
    return;
  }
  const arr = Object.values(convs).sort((a,b)=> (b.lastTs||0)-(a.lastTs||0));
  convListEl.innerHTML = '';
  for (const c of arr) {
    const otherUid = c.otherUid;
    const userSnap = await db.ref('users/' + otherUid).once('value');
    const u = userSnap.val() || {};
    const name = u.name || (u.fullName || 'Anónimo');
    const avatar = u.avatarData || (u.avatarDefault ? ('data:image/svg+xml;utf8,' + encodeURIComponent((defaultAvatars.find(a=>a.id===u.avatarDefault)||{}).svg||'')) : null);
    const item = document.createElement('div');
    item.style.display = 'flex'; item.style.alignItems='center'; item.style.justifyContent='space-between';
    item.style.padding='8px'; item.style.borderRadius='8px'; item.style.marginBottom='8px';
    item.style.background='rgba(0,0,0,0.02)';

    // comprueba si viene la marca "unread" en el objeto conversation
    const isUnread = !!c.unread;

    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        ${avatar ? `<img src="${avatar}" style="width:44px;height:44px;border-radius:50%">` : `<div style="width:44px;height:44px;border-radius:50%;background:#f0f0f0"></div>`}
        <div>
          <div style="font-weight:700">${name}</div>
          <div style="font-size:13px;color:#666">${c.lastText || ''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${isUnread ? `<span class="conv-new-badge" title="Mensaje nuevo">Nuevo</span>` : ''}
        <button class="btn small open-conv" data-conv="${c.convId}" data-other="${otherUid}">Abrir</button>
      </div>
    `;
    convListEl.appendChild(item);
  }
  convListEl.querySelectorAll('.open-conv').forEach(b => {
    b.onclick = async (ev) => {
      const otherUid = ev.currentTarget.dataset.other;
      const uSnap = await db.ref('users/' + otherUid).once('value');
      const u = uSnap.val() || {};
      openChatWithUser(otherUid, u.name || (u.fullName || 'Anónimo'), u.avatarData || (u.avatarDefault ? ('data:image/svg+xml;utf8,' + encodeURIComponent((defaultAvatars.find(a=>a.id===u.avatarDefault)||{}).svg||'')) : null));
    };
  });
}

/* Helpers: convId */
function createConversationId(a,b) { return a < b ? `${a}_${b}` : `${b}_${a}`; }

/**
 * markConversationAsRead(convId)
 * - Quita la bandera `unread` de conversations/<me>/<convId> si existe
 * - Recalcula el contador global users/<me>/unreadMessagesCount contando
 *   todas las conversations/<me> con unread === true y lo actualiza (set).
 * - Actualiza el badge visual llamando a updateMsgBadgeVisual().
 */
async function markConversationAsRead(convId) {
  if (!currentUser) return;
  if (!convId) return;

  const myConvPath = `conversations/${currentUser.uid}/${convId}`;
  try {
    // 1) Comprobar si existía unread
    const unreadSnap = await db.ref(myConvPath + '/unread').once('value');
    if (unreadSnap.exists()) {
      // eliminar la marca unread
      await db.ref(myConvPath + '/unread').remove();
    }

    // 2) Recalcular total de conversaciones con unread
    const allConvSnap = await db.ref(`conversations/${currentUser.uid}`).once('value');
    let totalUnread = 0;
    if (allConvSnap.exists()) {
      const convs = allConvSnap.val();
      // convs puede ser objeto con convId -> { .., unread: true }
      totalUnread = Object.values(convs).filter(c => c && c.unread).length;
    }

    // 3) Guardar contador global (set para sincronía exacta)
    await db.ref(`users/${currentUser.uid}/unreadMessagesCount`).set(totalUnread);

    // 4) Actualizar UI local inmediatamente (el listener también lo hará)
    const msgBadge = document.getElementById('msgBadge');
    if (msgBadge) {
      if (totalUnread > 0) {
        msgBadge.style.display = 'flex';
        msgBadge.textContent = String(totalUnread);
      } else {
        msgBadge.style.display = 'none';
        msgBadge.textContent = '0';
      }
      // helper visual (si lo tienes)
      if (typeof updateMsgBadgeVisual === 'function') updateMsgBadgeVisual();
    }

    return true;
  } catch (e) {
    console.warn('markConversationAsRead error', e);
    return false;
  }
}



/**
 * deleteConversation(convId, otherUid, forAll = false)
 * - if forAll === true:
 *     -> BORRA físicamente los mensajes cuya propiedad `from === me` (mis mensajes),
 *        así también desaparecen para la otra persona.
 *     -> No borra mensajes que pertenecen al otro usuario.
 * - if forAll === false:
 *     -> No borra mensajes en DB. Sólo elimina la referencia conversations/<me>/<convId>
 *        (la conversación deja de verse para mí).
 *
 * En ambos casos detenemos listeners locales y limpiamos estructuras internas.
 */
async function deleteConversation(convId, otherUid, forAll = false) {
  if (!currentUser) throw new Error('No autenticado');
  if (!convId) throw new Error('convId inválido');

  const me = currentUser.uid;

  // intentar deducir otherUid si no fue pasado
  if (!otherUid) {
    try {
      const parts = convId.split('_');
      if (parts.length === 2) {
        otherUid = (parts[0] === me) ? parts[1] : parts[0];
      }
    } catch (e) { otherUid = null; }
  }

  try {
    // 1) Detener listener local si existe
    try {
      if (currentMessagesListenerRef) {
        currentMessagesListenerRef.off();
        currentMessagesListenerRef = null;
      }
    } catch(e){ console.warn('Error detaching messages listener', e); }

    // 2) Si forAll === true, leemos los mensajes y borramos los que YO envié (m.from === me)
    //    Si forAll === false, NO tocamos privateMessages (solo quitamos conversation para mi usuario).
    const updates = {};

    if (forAll) {
      const msgsSnap = await db.ref(`privateMessages/${convId}`).once('value');
      const msgs = msgsSnap.val() || {};

      for (const key of Object.keys(msgs)) {
        const m = msgs[key];
        if (!m) continue;
        // BORRAR solo los mensajes que FUI YO quien envió
        if (m.from === me) {
          // borrar mensaje físicamente
          updates[`privateMessages/${convId}/${key}`] = null;
        }
        // si el mensaje NO fue mío, lo dejamos para que el otro usuario lo conserve
      }
    }

    // 3) Eliminar la referencia conversations para MI usuario (oculta la conversación de mi lista)
    updates[`conversations/${me}/${convId}`] = null;

    // (Opcional) Si quieres además eliminar la conversación del otro usuario cuando forAll===true,
    // lo podríamos añadir aquí, pero por ahora NO lo hacemos para conservar la conversación del otro.
    // Si deseas borrar también conversations/<otherUid>/<convId>, descomenta la línea siguiente:
    // if (forAll && otherUid) updates[`conversations/${otherUid}/${convId}`] = null;

    // 4) Ejecutar update atómico si hay algo
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    // 5) UI local limpieza
    try {
      const chatMessages = document.getElementById('chatMessages');
      if (chatMessages) {
        if (forAll) chatMessages.innerHTML = '<p style="color:var(--muted)">Tus mensajes han sido borrados también para la otra persona.</p>';
        else chatMessages.innerHTML = '<p style="color:var(--muted)">La conversación fue eliminada de tu lista.</p>';
      }
    } catch(e){}

    try { seenMessageKeys.delete(convId); } catch(e){}
    if (openConversationId === convId) {
      openConversationId = null;
      openConversationOther = null;
    }

    return true;
  } catch (err) {
    console.error('deleteConversation error', err);
    throw err;
  }
}


/* Init real-time: presencia, lista online, mensajes, notifs */
function initMessagingPresence() {
  if (!currentUser) return;
  updateUserOnline();
  loadOnlineUsers();
  loadMessages(); // carga solicitudes y conv list
  renderConversationList();
  listenForNotifications();
}

/* Mejor detección de cierre/app ocultada */
window.addEventListener('beforeunload', () => {
  try { if (currentUser) db.ref('online/' + currentUser.uid).update({ online:false, lastSeen: firebase.database.ServerValue.TIMESTAMP }); } catch(e){ }
});
document.addEventListener('visibilitychange', () => {
  if (!currentUser) return;
  try {
    if (document.hidden) db.ref('online/' + currentUser.uid).update({ online:false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    else updateUserOnline();
  } catch(e){}
});




/*************************
 * Amigos: UI + lógica
 *************************/

// Helper: mostrar la sección amigos y ocultar otras
function showFriendsSection() {
  // Oculta otras secciones/panels
  achievementsPanel.classList.remove('active');
  rankingCard.style.display = 'none';
  // Oculta homeCard si quieres (opcional)
  const homeCard = document.getElementById('homeCard');
  if (homeCard) homeCard.style.display = 'none';

  // Mostrar friendsCard
  const fc = document.getElementById('friendsCard');
  if (fc) fc.style.display = 'block';
  sectionTitle.textContent = 'Amigos';
  // cerrar drawer
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('active');

  // cargar amigos
  loadFriends();
}

// Handler para el item del drawer (asegúrate que #drawerFriends existe)
const drawerFriends = document.getElementById('drawerFriends');
if (drawerFriends) {
  drawerFriends.addEventListener('click', (e) => {
    e.preventDefault();
    showFriendsSection();
  });
}

const drawerSubscriptions = document.getElementById('drawerSubscriptions');
if (drawerSubscriptions) {
  drawerSubscriptions.addEventListener('click', (e) => {
    e.preventDefault();
    showSubscriptionsSection();
  });
}


const drawerDocentes = document.getElementById('drawerDocentes'); // si lo creas en el drawer
if (drawerDocentes) drawerDocentes.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const nav = document.querySelector('.nav-item[data-section="Docentes"]');
  if (nav) nav.classList.add('active');
  loadProfessors();
  drawer.classList.remove('open'); overlay.classList.remove('active');
});


// Refresh button
const refreshFriendsBtn = document.getElementById('refreshFriends');
if (refreshFriendsBtn) refreshFriendsBtn.addEventListener('click', () => loadFriends());

// ---------- Reemplazo: loadFriends (muestra estado online + lastSeen en tiempo real) ----------
async function loadFriends() {
  const listEl = document.getElementById('friendsList');
  if (!listEl) return;
  if (!currentUser) {
    listEl.innerHTML = `<p style="color:var(--muted)">Inicia sesión para ver tus amigos.</p>`;
    return;
  }

  listEl.innerHTML = `<p style="color:var(--muted)">Cargando...</p>`;

  // Detenemos listeners previos por seguridad
  stopFriendsPresenceListeners();

  try {
    const snap = await db.ref(`friends/${currentUser.uid}`).once('value');
    const map = snap.val();
    if (!map || Object.keys(map).length === 0) {
      listEl.innerHTML = `<p style="color:var(--muted)">No tienes amigos aún.</p>`;
      return;
    }

    const uids = Object.keys(map);
    listEl.innerHTML = '';

    // Cargar perfiles y estado 'online' en paralelo
    const fetches = uids.map(async (uid) => {
      const [uSnap, onlineSnap] = await Promise.all([
        db.ref('users/' + uid).once('value'),
        db.ref('online/' + uid).once('value')
      ]);
      return { uid, profile: uSnap.val() || {}, online: onlineSnap.val() || null };
    });

    const results = await Promise.all(fetches);

    for (const r of results) {
      const uid = r.uid;
      const u = r.profile;
      const online = r.online;
      const name = u.name || u.fullName || 'Anónimo';

      // avatar
      let avatarHtml = `<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f6fff6,#e6ffe6)"></div>`;
      if (u.avatarData) {
        avatarHtml = `<img src="${u.avatarData}" style="width:46px;height:46px;border-radius:50%;object-fit:cover">`;
      } else if (u.avatarDefault) {
        const av = defaultAvatars.find(a => a.id === u.avatarDefault);
        if (av) avatarHtml = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(av.svg)}" style="width:46px;height:46px;border-radius:50%;object-fit:cover">`;
      }

      // estado inicial (si ya hay nodo online)
      const isOnline = !!(online && online.online);
      const lastSeenText = (online && online.lastSeen) ? formatLastSeen(online.lastSeen) : '-';
      const statusText = isOnline ? 'Conectado' : `Desconectado • ${lastSeenText}`;
      const statusClass = isOnline ? 'online' : 'offline';

      const item = document.createElement('div');
      item.className = 'online-item friend-item';
      item.id = `friend-${uid}`;
      item.style.justifyContent = 'space-between';
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          ${avatarHtml}
          <div class="meta" style="min-width:0">
            <div class="name" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
            <div class="status friend-status ${statusClass}" id="friend-status-${uid}" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${statusText}</div>
          </div>
        </div>
        <div class="controls" style="align-items:center;display:flex;gap:8px">
          <button class="btn small msg-friend-btn" data-uid="${uid}">Mensaje</button>
        </div>
      `;
      listEl.appendChild(item);

      // Listener en tiempo real para la presencia de este amigo
const ref = db.ref(`online/${uid}`);
_friendsPresenceRefs[uid] = ref;
safeListen(ref, 'value', snap2 => {
  const v = snap2.val();
  const statusEl = document.getElementById(`friend-status-${uid}`);
  if (!statusEl) return;
  if (v && v.online) {
    statusEl.textContent = 'Conectado';
    statusEl.classList.remove('offline');
    statusEl.classList.add('online');
    statusEl.style.color = '#058a00';
  } else {
    const last = (v && v.lastSeen) ? formatLastSeen(v.lastSeen) : '-';
    statusEl.textContent = 'Off • ' + last;
    statusEl.classList.remove('online');
    statusEl.classList.add('offline');
    statusEl.style.color = '#666';
  }
});



    }

    // listeners para enviar mensaje (igual que antes)
    listEl.querySelectorAll('.msg-friend-btn').forEach(b => {
      b.onclick = async (ev) => {
        const toUid = ev.currentTarget.dataset.uid;
        const uSnap = await db.ref('users/' + toUid).once('value');
        const u = uSnap.val() || {};
        openChatWithUser(toUid, u.name || (u.fullName || 'Anónimo'), u.avatarData || (u.avatarDefault ? ('data:image/svg+xml;utf8,' + encodeURIComponent((defaultAvatars.find(a=>a.id===u.avatarDefault)||{}).svg||'')) : null));
      };
    });

  } catch (err) {
    console.error('loadFriends error', err);
    listEl.innerHTML = `<p style="color:#ef4444">Error cargando amigos.</p>`;
  }
}


/* =========================
   Suscripciones (para profesores)
   ========================= */

// Helper para calcular días restantes (redondeo hacia arriba)
function daysRemaining(expiryTs) {
  if (!expiryTs) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  const remaining = (parseInt(expiryTs, 10) - Date.now());
  return remaining > 0 ? Math.ceil(remaining / msPerDay) : 0;
}

// Mostrar sección Suscripciones (oculta otras secciones)
function showSubscriptionsSection() {
  // Usa el helper que ya creamos para ocultar secciones (si lo tienes)
  if (typeof hideAllMainSectionsExcept === 'function') {
    hideAllMainSectionsExcept('subscriptionsCard');
  } else {
    // fallback: ocultar manualmente
    document.querySelectorAll('.card').forEach(c => { if (c.id !== 'subscriptionsCard') c.style.display = 'none'; });
    const sc = document.getElementById('subscriptionsCard'); if (sc) sc.style.display = 'block';
  }
  const st = document.getElementById('sectionTitle'); if (st) st.textContent = 'Suscripciones';
  loadProfessorSubscriptions();
}

// Cargar suscripciones donde currentUser es profesor
async function loadProfessorSubscriptions() {
  const listEl = document.getElementById('subscriptionsList');
  if (!listEl) return;
  if (!currentUser) {
    listEl.innerHTML = `<p style="color:var(--muted)">Inicia sesión para ver las suscripciones.</p>`;
    return;
  }

  // Solo profesor
  try {
    const meSnap = await db.ref('users/' + currentUser.uid).once('value');
    const meData = meSnap.val() || {};
    if (meData.role !== 'professor') {
      listEl.innerHTML = `<p style="color:var(--muted)">Esta sección es solo para profesores.</p>`;
      return;
    }

    listEl.innerHTML = `<p style="color:var(--muted)">Cargando suscripciones...</p>`;

    // Suscripciones bajo subscriptions/<profUid> -> map studentUid -> { studentUid, startTs, expiryTs }
    const subsSnap = await db.ref(`subscriptions/${currentUser.uid}`).once('value');
    const subs = subsSnap.val();

    if (!subs || Object.keys(subs).length === 0) {
      listEl.innerHTML = `<p style="color:var(--muted)">Aún no hay alumnos suscritos.</p>`;
      return;
    }

    // Construir lista
    const frag = document.createDocumentFragment();
    // convert to array of { studentUid, ... }
    const entries = Object.entries(subs).map(([studentUid, s]) => ({ studentUid, ...s }));
    // orden por fecha de inicio descendente
    entries.sort((a,b) => (b.startTs || 0) - (a.startTs || 0));

    entries.forEach(entry => {
      const stUid = entry.studentUid;
      const startTs = entry.startTs || 0;
      const expiryTs = entry.expiryTs || 0;
      const daysLeft = daysRemaining(expiryTs);

      const wrapper = document.createElement('div');
      wrapper.className = 'subscription-row';
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'space-between';
      wrapper.style.alignItems = 'center';
      wrapper.style.padding = '10px';
      wrapper.style.borderRadius = '10px';
      wrapper.style.background = '#fff';
      wrapper.style.marginBottom = '8px';
      wrapper.style.border = '1px solid rgba(0,0,0,0.04)';

      // Placeholder hasta cargar perfil estudiante
      wrapper.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <div id="sub-avatar-${stUid}" style="width:56px;height:56px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#f6fff6,#e6ffe6)"></div>
          <div style="min-width:0">
            <div id="sub-name-${stUid}" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Cargando...</div>
            <div id="sub-meta-${stUid}" style="font-size:13px;color:var(--muted)">Inicio: - • Días restantes: ${daysLeft}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn small cancel-sub-btn" data-st="${stUid}">Cancelar</button>
        </div>
      `;
      frag.appendChild(wrapper);

      // carga perfil del alumno y actualiza elementos
      db.ref('users/' + stUid).once('value').then(snap => {
        const u = snap.val() || {};
        const avatarEl = document.getElementById(`sub-avatar-${stUid}`);
        const nameEl = document.getElementById(`sub-name-${stUid}`);
        const metaEl = document.getElementById(`sub-meta-${stUid}`);
        const name = u.name || u.fullName || 'Alumno';
        if (nameEl) nameEl.textContent = name;
        if (metaEl) metaEl.textContent = `Inicio: ${formatTimestamp(startTs)} • Días restantes: ${daysLeft}`;
        if (avatarEl) {
          if (u.avatarData) avatarEl.innerHTML = `<img src="${u.avatarData}" style="width:100%;height:100%;object-fit:cover">`;
          else if (u.avatarDefault) {
            const av = defaultAvatars.find(a=>a.id===u.avatarDefault);
            if (av) avatarEl.innerHTML = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(av.svg)}" style="width:100%;height:100%;object-fit:cover">`;
          } else {
            avatarEl.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#7b7b7b">${(name||'')[0]||'?'}</div>`;
          }
        }
      }).catch(e => {
        console.warn('Error cargando perfil alumno', e);
      });

    });

    // mostrar todo
    listEl.innerHTML = '';
    listEl.appendChild(frag);

    // attach handlers para cancelar
    listEl.querySelectorAll('.cancel-sub-btn').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const studentUid = ev.currentTarget.dataset.st;
        const ok = await showConfirmModal({ title: 'Cancelar suscripción', message: '¿Deseas cancelar esta suscripción antes de que termine?', confirmText: 'Sí, cancelar', cancelText: 'No' });
        if (!ok) return;
        // cancelar
        try {
          await cancelSubscription(currentUser.uid, studentUid);
          showToast('Suscripción cancelada', 'info');
          // refrescar la lista
          loadProfessorSubscriptions();
        } catch (err) {
          console.error('cancelSubscription err', err);
          showToast('No se pudo cancelar. Intenta de nuevo.', 'error');
        }
      });
    });

  } catch (err) {
    console.error('loadProfessorSubscriptions error', err);
    listEl.innerHTML = `<p style="color:#ef4444">Error cargando suscripciones.</p>`;
  }
}

// Cancelar suscripción (el profesor borra la suscripción del alumno)
// args: profUid (actual profesor), studentUid
async function cancelSubscription(profUid, studentUid) {
  if (!profUid || !studentUid) throw new Error('Parámetros inválidos');
  // Actualizar de forma atómica: borrar subscriptions/<profUid>/<studentUid> y users/<studentUid>/subscriptions/<profUid>
  const updates = {};
  updates[`subscriptions/${profUid}/${studentUid}`] = null;
  updates[`users/${studentUid}/subscriptions/${profUid}`] = null;
  await db.ref().update(updates);
}


/***************************************************************
 * SIMULACRO - Cliente (sin Cloud Functions)
 * - Guarda scheduledSimulacros/<uid> en Firebase
 * - Genera enlace Google Calendar y archivo .ics (descarga)
 * - Muestra notificación del navegador + globo UI cuando llega
 * - Marca en DB {notified: true} para evitar duplicados
 ***************************************************************/

/* 1) Referencias DOM */
const simulacroCard = document.getElementById('simulacroCard');
const simDateTime = document.getElementById('simDateTime');
const simEmail = document.getElementById('simEmail');
const scheduleSimBtn = document.getElementById('scheduleSimBtn');
const startSimBtn = document.getElementById('startSimBtn');
const scheduledList = document.getElementById('scheduledList');

/* 2) Nav handler: cuando el usuario hace click en Simulacro (añadir en tu handler navItems) */
// Si tu handler ya tiene switch/if, añade esta rama:
// (Si no quieres editar el handler, coloca esto donde defines navItems.forEach)
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const section = item.getAttribute('data-section');
    if (section === 'Simulacro') {
      hideAllMainSectionsExcept('simulacroCard');
      const sc = document.getElementById('simulacroCard');
      if (sc) sc.style.display = 'block';
      if (currentUser && simEmail) simEmail.value = currentUser.email || '';
      loadScheduledSimulacros();
    }
  });
});

/* 3) Util: validar correo (debe coincidir con currentUser.email por seguridad) */
function isEmailAuthorizedForUser(inputEmail) {
  if (!currentUser) return false;
  const regEmail = (currentUser.email || '').trim().toLowerCase();
  return String(inputEmail || '').trim().toLowerCase() === regEmail;
}

/* 4) Generadores: Google Calendar URL y archivo .ics */
function generateGoogleCalendarUrl({title='Simulacro', details='', location='', startTs, endTs}) {
  // startTs/endTs en ms
  const fmt = (ts) => {
    const d = new Date(ts);
    // formato YYYYMMDDTHHMMSSZ (usar UTC)
    const pad = n => String(n).padStart(2,'0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const start = fmt(startTs);
  const end = fmt(endTs || (startTs + 30*60*1000)); // 30 min default
  const url = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  return url;
}



// Formatea ts (ms) a YYYYMMDDTHHMMSSZ (UTC) — necesario para Google Calendar template
function formatDateToGoogle(ts) {
  const d = new Date(Number(ts));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// Genera la URL de plantilla de Google Calendar (pre-rellena evento)
// startTs/endTs en ms. attendees = array de emails opcional.
function generateGoogleCalendarTemplateUrl({ title='Evento', details='', location='', startTs, endTs, attendees = [] }) {
  if (!startTs) startTs = Date.now();
  if (!endTs) endTs = startTs + (60*60*1000); // 1 hora por defecto
  const startStr = formatDateToGoogle(startTs);
  const endStr = formatDateToGoogle(endTs);

  const base = 'https://www.google.com/calendar/render?action=TEMPLATE';
  const parts = [];
  parts.push('text=' + encodeURIComponent(title));
  parts.push('dates=' + encodeURIComponent(startStr + '/' + endStr));
  if (details) parts.push('details=' + encodeURIComponent(details));
  if (location) parts.push('location=' + encodeURIComponent(location));
  if (attendees && attendees.length) parts.push('add=' + encodeURIComponent(attendees.join(',')));
  // sf=true mejora la experiencia en algunos navegadores; output=xml no es necesario aquí
  const url = base + '&' + parts.join('&');
  return url;
}


// gcalUrl debe ser la URL creada con generateGoogleCalendarUrl(...)
function tryOpenGoogleCalendarApp(gcalUrl) {
  try {
    const isAndroid = /Android/i.test(navigator.userAgent || '');
    // Si Android, intent URI para forzar abrir la app instalada (si el navegador lo permite)
    if (isAndroid) {
      // Construye intent URL basado en la gcalUrl (scheme https -> intent://, con package)
      const intentUrl = gcalUrl.replace(/^https?:\/\//i, 'intent://') + '#Intent;package=com.google.android.calendar;scheme=https;end';
      // Primer intento: navegar a intent (debería abrir la app si está instalada)
      window.location.href = intentUrl;

      // Fallback: si el intent no funcionó (navegador lo bloquea), después de un pequeño timeout abrimos la URL web.
      setTimeout(() => {
        try { window.open(gcalUrl, '_blank', 'noopener'); } catch (e) { window.location.href = gcalUrl; }
      }, 700);
      return;
    }

    // No-Android (iOS, desktop): abrir la URL web en nueva pestaña (iOS suele redirigir a app si está registrado)
    try { window.open(gcalUrl, '_blank', 'noopener'); } catch (e) { window.location.href = gcalUrl; }
  } catch (e) {
    // Fallback seguro
    try { window.open(gcalUrl, '_blank', 'noopener'); } catch (err) { window.location.href = gcalUrl; }
  }
}


function generateIcs({title='Simulacro', details='', location='', startTs, endTs}) {
  const dtStamp = (ts) => {
    const d = new Date(ts);
    const pad = n => String(n).padStart(2,'0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };
  const uid = `simulacro-${Math.random().toString(36).slice(2)}@yourapp`;
  const start = dtStamp(startTs);
  const end = dtStamp(endTs || (startTs + 30*60*1000));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TuApp//Simulacro//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTAMP:${dtStamp(Date.now())}`,
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\r\n');
}

/* 5) Guardado en Firebase */
async function writeSimulacroToDb(startTs, emailVal) {
  const payload = {
    email: emailVal,
    startTs: startTs,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    notified: false, // para marcar cuando ya notificamos (local)
    createdByUid: (currentUser && currentUser.uid) ? currentUser.uid : null
  };
  const ref = await db.ref(`scheduledSimulacros/${currentUser.uid}`).push(payload);
  return { key: ref.key, ...payload };
}

// REEMPLAZO: scheduleSimulacro() sin la opción "Abrir en navegador"
async function scheduleSimulacro() {
  if (!currentUser) return showToast('Inicia sesión para programar', 'error');
  if (!simDateTime || !simEmail) return showToast('Elementos no encontrados', 'error');

  const dt = (simDateTime.value || '').trim();
  const emailVal = (simEmail.value || '').trim();

  if (!dt) return showToast('Selecciona fecha y hora', 'error');
  if (!emailVal) return showToast('Ingresa tu correo autorizado', 'error');
  if (!isEmailAuthorizedForUser(emailVal)) return showToast('Ingresa el correo con el que estás registrado', 'error');

  const startTs = new Date(dt).getTime();
  if (isNaN(startTs)) return showToast('Fecha inválida', 'error');

  try {
    // Guardar en DB (mismo comportamiento)
    const savedRef = await db.ref(`scheduledSimulacros/${currentUser.uid}`).push({
      email: emailVal,
      startTs: startTs,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      notified: false,
      createdByUid: currentUser.uid
    });
    const savedKey = savedRef.key;

    // Preparar datos para Google Calendar
    const title = 'Simulacro UNHEVAL';
    const durationMs = 60 * 60 * 1000; // 1 hora por defecto
    const endTs = startTs + durationMs;
    const details = `Simulacro programado desde la plataforma UNHEVAL.\nInicia: ${new Date(startTs).toLocaleString()}.\nGenerado automáticamente.`;
    const location = 'Plataforma UNHEVAL';

    const gcalUrl = generateGoogleCalendarTemplateUrl({
      title,
      details,
      location,
      startTs,
      endTs,
      attendees: (currentUser && currentUser.email) ? [currentUser.email] : []
    });

    // Crear modal SIMPLE: solo "Abrir en Google Calendar (app)" y Cerrar
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.45)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 10000;

    const modal = document.createElement('div');
    modal.style.width = 'min(520px,94%)';
    modal.style.background = '#fff';
    modal.style.padding = '16px';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
    modal.style.fontFamily = 'system-ui,Segoe UI,Roboto,Arial';
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-weight:800">Simulacro creado</div>
        <button class="cc-close" aria-label="Cerrar" style="background:none;border:none;font-size:20px;cursor:pointer">×</button>
      </div>
      <div style="margin-bottom:12px">
        El evento fue pre-llenado para Google Calendar.
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;justify-content:center">
        <button id="open_gcal_app" class="btn">Abrir en Google Calendar (app)</button>
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button id="close_sim_modal_btn" class="btn small secondary">Cerrar</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Handlers
    modal.querySelector('.cc-close').addEventListener('click', () => overlay.remove());
    modal.querySelector('#close_sim_modal_btn').addEventListener('click', () => overlay.remove());

    const openAppBtn = modal.querySelector('#open_gcal_app');
    if (openAppBtn) {
      openAppBtn.addEventListener('click', () => {
        tryOpenGoogleCalendarApp(gcalUrl);
      });
    }

    // limpiar inputs y recargar lista
    simDateTime.value = '';
    loadScheduledSimulacros();

  } catch (err) {
    console.error('scheduleSimulacro err', err);
    showToast('Error programando simulacro', 'error');
  }
}


/* 7) Listar simulacros guardados */
async function loadScheduledSimulacros() {
  if (!scheduledList) return;
  if (!currentUser) return (scheduledList.innerHTML = '<p style="color:var(--muted)">Inicia sesión para ver tus simulacros.</p>');
  scheduledList.innerHTML = '<p style="color:var(--muted)">Cargando...</p>';
  try {
    const snap = await db.ref(`scheduledSimulacros/${currentUser.uid}`).orderByChild('startTs').once('value');
    const data = snap.val();
    if (!data) {
      scheduledList.innerHTML = '<p style="color:var(--muted)">No tienes simulacros programados.</p>';
      return;
    }
    const arr = Object.entries(data).map(([k,v]) => ({ key:k, ...v })).sort((a,b) => (a.startTs||0)-(b.startTs||0));
    const frag = document.createDocumentFragment();
    arr.forEach(item => {
      const when = item.startTs ? new Date(item.startTs).toLocaleString() : 'Sin fecha';
      const el = document.createElement('div');
      el.style.display = 'flex';
      el.style.justifyContent = 'space-between';
      el.style.alignItems = 'center';
      el.style.padding = '8px';
      el.style.borderRadius = '8px';
      el.style.marginBottom = '8px';
      el.style.background = '#fff';
      el.style.border = '1px solid rgba(0,0,0,0.03)';
      el.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:700">${when}</div>
          <div style="font-size:13px;color:var(--muted)">${item.email || ''}${item.notified ? ' • Notificado' : ''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn small start-now" data-key="${item.key}">Iniciar ahora</button>
          <button class="btn small secondary del-sim" data-key="${item.key}">Eliminar</button>
        </div>
      `;
      frag.appendChild(el);
    });
    scheduledList.innerHTML = '';
    scheduledList.appendChild(frag);

    // attach handlers
    scheduledList.querySelectorAll('.del-sim').forEach(b => {
      b.addEventListener('click', async (e) => {
        const key = e.currentTarget.dataset.key;
        const ok = await showConfirmModal({ title:'Eliminar simulacro', message:'¿Eliminar este simulacro?', confirmText:'Eliminar', cancelText:'Cancelar' });
        if (!ok) return;
        await db.ref(`scheduledSimulacros/${currentUser.uid}/${key}`).remove();
        showToast('Simulacro eliminado', 'info');
        loadScheduledSimulacros();
      });
    });
    scheduledList.querySelectorAll('.start-now').forEach(b => {
      b.addEventListener('click', (e) => {
        // iniciar simulacro inmediatamente (3 preguntas)
        startSimulacroNow();
      });
    });

  } catch (err) {
    console.error('loadScheduledSimulacros err', err);
    scheduledList.innerHTML = '<p style="color:#ef4444">Error cargando simulacros.</p>';
  }
}

/* 8) Iniciar simulacro ahora: reutiliza tu openQuizFullScreen() con 3 preguntas */
const simulacroQuestions = [
  { q: "¿Cuál es la capital del Perú?", a: ["Lima", "Cusco", "Arequipa", "Trujillo"], correct: 0 },
  { q: "¿Cuál es la raíz cuadrada de 81?", a: ["7", "9", "8", "11"], correct: 1 },
  { q: "¿Quién escribió 'La ciudad y los perros'?", a: ["Mario Vargas Llosa", "César Vallejo", "José María Arguedas", "Alfredo Bryce Echenique"], correct: 0 }
];

function startSimulacroNow() {
  try {
    // backup preguntas globales
    window._backup_questions = Array.isArray(window.questions) ? window.questions.slice() : null;
    window.questions = simulacroQuestions.slice();
    openQuizFullScreen(); // tu función ya existente
  } catch (e) {
    console.error('startSimulacroNow err', e);
    showToast('No se pudo iniciar el simulacro', 'error');
  }
}

/* 9) Checker local: polling cada 30s para notificar si llega la hora (requiere que la pestaña esté abierta) */
let _simLocalChecker = null;
function requestNotificationPermissionIfNeeded() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => {
      // nothing more
    });
  }
}
function startLocalReminderChecker() {
  if (!currentUser) return;
  if (_simLocalChecker) return; // idempotente
  requestNotificationPermissionIfNeeded();
  _simLocalChecker = setInterval(async () => {
    try {
      const snap = await db.ref(`scheduledSimulacros/${currentUser.uid}`).orderByChild('startTs').endAt(Date.now()).once('value');
      const items = snap.val();
      if (!items) return;
      for (const key of Object.keys(items)) {
        const it = items[key];
        if (!it) continue;
        if (it.notified) continue; // ya notificado
        // marcar notificado y mostrar notificación
        try {
          await db.ref(`scheduledSimulacros/${currentUser.uid}/${key}/notified`).set(true);
        } catch (e) { console.warn('No se pudo marcar notified en DB', e); }
        // mostrar Notificación Web
        const title = 'Tu simulacro está por comenzar';
        const body = `Inicia: ${new Date(it.startTs).toLocaleString()}. Haz click para ir al simulacro.`;
        if ('Notification' in window && Notification.permission === 'granted') {
          const notif = new Notification(title, { body, tag: `sim-${key}` });
          notif.onclick = () => {
            window.focus();
            startSimulacroNow();
          };
        }
        // también mostrar el globo de la app (si existe)
        try {
          if (typeof showNotifBalloon === 'function') {
            showNotifBalloon({ name: 'Recordatorio', avatar: null, from: currentUser.uid }, key);
          }
        } catch (e) {}
        // adicional: toast en la UI
        showToast('Recordatorio: tu simulacro ha iniciado o está por iniciar', 'info', 6000);
      }
    } catch (err) {
      console.error('simLocalChecker err', err);
    }
  }, 30 * 1000); // cada 30s
}

function stopLocalReminderChecker() {
  if (_simLocalChecker) { clearInterval(_simLocalChecker); _simLocalChecker = null; }
}

/* 10) Listeners botones */
if (scheduleSimBtn) scheduleSimBtn.addEventListener('click', (e) => scheduleSimulacro());
if (startSimBtn) startSimBtn.addEventListener('click', startSimulacroNow);



/**
 * Reemplaza/borra todo lo de abajo y pega aquí tu código JS.
 * Ejemplo mínimo de inicialización:
 */
document.addEventListener('DOMContentLoaded', function() {
  // Código de ejemplo — puedes borrar estas 4 líneas
  const root = document.getElementById('extrasRoot') || document.getElementById('app');
  if(root) {
    const p = document.createElement('p');
    p.textContent = 'Tu código JS puede inicializarse aquí (DOMContentLoaded).';
    p.style.textAlign = 'center';
    p.style.color = '#666';
    root.appendChild(p);
  }

  // Emite evento de arranque
  APP.bus.emit('app.ready', { ts: Date.now() });
});

/* --- FIN: PEGA TU CÓDIGO AQUÍ --- */

/* Exporta APP para debugging */
window._app = APP;
