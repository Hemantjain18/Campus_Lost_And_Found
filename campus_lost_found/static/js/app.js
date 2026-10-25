/**
 * CampusFind - Client-Side Application Logic
 * Talks to Flask REST API via fetch() with session cookies
 */

const API_BASE = '/api';

// Application State
const state = {
  currentUser: null,
  categories: [],
  filters: {
    type: '',
    category_id: '',
    location: '',
    start_date: '',
    end_date: '',
    keyword: '',
    status: 'open'
  },
  currentDetailItem: null
};

// -----------------------------------------------------------------------------
// Toast Helper
// -----------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// -----------------------------------------------------------------------------
// API Wrapper
// -----------------------------------------------------------------------------
async function apiFetch(endpoint, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {}
  };

  // If sending JSON body, set Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }

  const merged = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, merged);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Initial Boot & Auth Verification
// -----------------------------------------------------------------------------
async function initApp() {
  await checkAuth();
  await loadCategories();
  setupEventListeners();
  handleRouting();
}

async function checkAuth() {
  try {
    const data = await apiFetch('/auth/me');
    if (data.authenticated && data.user) {
      state.currentUser = data.user;
    } else {
      state.currentUser = null;
    }
  } catch {
    state.currentUser = null;
  }
  updateAuthUI();
}

function updateAuthUI() {
  const userPill = document.getElementById('user-pill');
  const userDisplayName = document.getElementById('user-display-name');
  const loginLink = document.getElementById('login-link-btn');
  const authNavs = document.querySelectorAll('.auth-only');
  const adminNavs = document.querySelectorAll('.admin-only');

  if (state.currentUser) {
    if (userPill) userPill.style.display = 'flex';
    if (userDisplayName) userDisplayName.textContent = state.currentUser.full_name;
    if (loginLink) loginLink.style.display = 'none';

    authNavs.forEach(el => el.style.display = 'inline-block');
    adminNavs.forEach(el => {
      el.style.display = state.currentUser.role === 'admin' ? 'inline-block' : 'none';
    });
  } else {
    if (userPill) userPill.style.display = 'none';
    if (loginLink) loginLink.style.display = 'inline-flex';
    authNavs.forEach(el => el.style.display = 'none');
    adminNavs.forEach(el => el.style.display = 'none');
  }
}

async function loadCategories() {
  try {
    const categories = await apiFetch('/categories');
    state.categories = categories;

    // Populate filter category select
    const filterSelect = document.getElementById('filter-category');
    const reportSelect = document.getElementById('report-category');

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(cat => {
        filterSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
      });
    }

    if (reportSelect) {
      reportSelect.innerHTML = '<option value="">Select category...</option>';
      categories.forEach(cat => {
        reportSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
      });
    }
  } catch (err) {
    console.error('Could not load categories', err);
  }
}

// -----------------------------------------------------------------------------
// Hash Routing
// -----------------------------------------------------------------------------
function handleRouting() {
  const rawHash = window.location.hash.slice(1) || 'home';
  const [route, queryString] = rawHash.split('?');
  const urlParams = new URLSearchParams(queryString || '');

  // Hide all sections
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(link => link.classList.remove('active'));

  // Target section
  const targetSection = document.getElementById(`view-${route}`) || document.getElementById('view-home');
  targetSection.classList.add('active');

  const activeNav = document.querySelector(`.nav-item[data-nav="${route}"]`);
  if (activeNav) activeNav.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'instant' });

  // Route specific handlers
  switch (route) {
    case 'home':
      loadHomeData();
      break;
    case 'browse':
      if (urlParams.has('keyword')) {
        state.filters.keyword = urlParams.get('keyword');
        const kwInput = document.getElementById('filter-keyword');
        if (kwInput) kwInput.value = state.filters.keyword;
      }
      loadBrowseItems();
      break;
    case 'report':
      if (urlParams.get('type')) {
        setReportType(urlParams.get('type'));
      }
      break;
    case 'item-detail':
      const itemId = urlParams.get('id');
      if (itemId) loadItemDetail(itemId);
      break;
    case 'my-posts':
      if (!state.currentUser) {
        window.location.hash = '#login';
      } else {
        loadMyPosts();
      }
      break;
    case 'admin':
      if (!state.currentUser || state.currentUser.role !== 'admin') {
        showToast('Admin privilege required.', 'error');
        window.location.hash = '#home';
      } else {
        loadAdminDashboard();
      }
      break;
  }
}

// -----------------------------------------------------------------------------
// View 1: Home Loader
// -----------------------------------------------------------------------------
async function loadHomeData() {
  try {
    const data = await apiFetch('/items?limit=6&status=open');
    const container = document.getElementById('home-items-grid');
    if (!container) return;

    if (!data.items || data.items.length === 0) {
      container.innerHTML = '<p class="empty-state">No open items reported yet.</p>';
      return;
    }

    container.innerHTML = data.items.map(renderItemCard).join('');

    // Update stats counters
    const activeEl = document.getElementById('stat-active-items');
    const reunitedEl = document.getElementById('stat-reunited');
    if (activeEl) activeEl.textContent = data.total || data.items.length;
    if (reunitedEl) reunitedEl.textContent = '142';
  } catch (err) {
    console.error('Home items error:', err);
  }
}

// -----------------------------------------------------------------------------
// View 2: Browse & Filter Logic
// -----------------------------------------------------------------------------
async function loadBrowseItems() {
  const grid = document.getElementById('browse-items-grid');
  const countEl = document.getElementById('results-count');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state">Searching catalog...</div>';

  const params = new URLSearchParams();
  if (state.filters.type) params.append('type', state.filters.type);
  if (state.filters.category_id) params.append('category_id', state.filters.category_id);
  if (state.filters.location) params.append('location', state.filters.location);
  if (state.filters.start_date) params.append('start_date', state.filters.start_date);
  if (state.filters.end_date) params.append('end_date', state.filters.end_date);
  if (state.filters.keyword) params.append('keyword', state.filters.keyword);
  if (state.filters.status) params.append('status', state.filters.status);

  try {
    const data = await apiFetch(`/items?${params.toString()}`);
    if (countEl) countEl.textContent = `Showing ${data.items.length} of ${data.total} items`;

    if (!data.items || data.items.length === 0) {
      grid.innerHTML = '<div class="empty-state">No items found matching your filters. Try clearing some options.</div>';
      return;
    }

    grid.innerHTML = data.items.map(renderItemCard).join('');
  } catch (err) {
    grid.innerHTML = `<div class="error-state">Failed to load items: ${err.message}</div>`;
  }
}

function renderItemCard(item) {
  const isLost = item.type === 'lost';
  const badgeClass = isLost ? 'lost' : 'found';
  const badgeLabel = isLost ? 'LOST' : 'FOUND';

  const imgHtml = item.image_path
    ? `<img src="/static/${item.image_path}" alt="${item.title}" loading="lazy" onerror="this.style.display='none';">`
    : `<div class="placeholder-icon">${renderCategorySvg(item.category_slug)}</div>`;

  return `
    <div class="item-card" onclick="window.location.hash='#item-detail?id=${item.id}'">
      <div class="item-card-media">
        ${imgHtml}
        <span class="item-type-chip ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="item-card-body">
        <div class="item-card-meta">
          <span>${escapeHtml(item.category_name || 'Item')}</span>
          <span class="meta-sep">&middot;</span>
          <span>${formatDate(item.date_occurred)}</span>
        </div>
        <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
        <p class="item-card-desc">${escapeHtml(item.description)}</p>
        <div class="item-card-footer">
          <span class="item-card-location" title="${escapeHtml(item.location)}">
            📍 ${escapeHtml(item.location)}
          </span>
          <span class="btn-text">Details &rarr;</span>
        </div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// View 3: Report Item Logic
// -----------------------------------------------------------------------------
function setReportType(type) {
  const hiddenInput = document.getElementById('report-item-type');
  const buttons = document.querySelectorAll('#report-type-control .segment-btn');
  const formTitle = document.getElementById('report-form-title');

  if (hiddenInput) hiddenInput.value = type;
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  if (formTitle) {
    formTitle.textContent = type === 'lost' ? 'Report a Lost Campus Item' : 'Report a Found Campus Item';
  }
}

async function handleReportSubmit(e) {
  e.preventDefault();

  if (!state.currentUser) {
    showToast('Please sign in first to report an item.', 'error');
    window.location.hash = '#login';
    return;
  }

  const form = document.getElementById('report-item-form');
  const formData = new FormData(form);
  const submitBtn = document.getElementById('submit-report-btn');

  // Client-side validation checks
  const photoInput = document.getElementById('report-photo-input');
  if (photoInput.files.length > 0) {
    const file = photoInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be less than 5MB.', 'error');
      return;
    }
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const result = await apiFetch('/items', {
      method: 'POST',
      body: formData
    });

    showToast('Item successfully reported!', 'success');
    form.reset();
    resetPhotoPreview();
    window.location.hash = `#item-detail?id=${result.item.id}`;
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Item Report';
  }
}

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('File exceeds 5MB size limit.', 'error');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const previewContainer = document.getElementById('upload-preview-container');
    const previewImg = document.getElementById('upload-preview-img');
    const prompt = document.getElementById('upload-prompt');

    if (previewImg) previewImg.src = event.target.result;
    if (previewContainer) previewContainer.style.display = 'block';
    if (prompt) prompt.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function resetPhotoPreview() {
  const input = document.getElementById('report-photo-input');
  const previewContainer = document.getElementById('upload-preview-container');
  const previewImg = document.getElementById('upload-preview-img');
  const prompt = document.getElementById('upload-prompt');

  if (input) input.value = '';
  if (previewImg) previewImg.src = '';
  if (previewContainer) previewContainer.style.display = 'none';
  if (prompt) prompt.style.display = 'flex';
}

// -----------------------------------------------------------------------------
// View 4: Item Detail & Smart Matching Engine UI
// -----------------------------------------------------------------------------
async function loadItemDetail(itemId) {
  const titleEl = document.getElementById('detail-title');
  const typeBadge = document.getElementById('detail-type-badge');
  const categoryText = document.getElementById('detail-category-text');
  const statusText = document.getElementById('detail-status-text');
  const dateEl = document.getElementById('detail-date');
  const locationEl = document.getElementById('detail-location');
  const reporterEl = document.getElementById('detail-reporter');
  const descEl = document.getElementById('detail-desc');
  const specificLocEl = document.getElementById('detail-specific-location');
  const photoEl = document.getElementById('detail-photo');
  const placeholderEl = document.getElementById('detail-placeholder');
  const claimBtn = document.getElementById('open-claim-btn');

  try {
    const data = await apiFetch(`/items/${itemId}`);
    const item = data.item;
    state.currentDetailItem = item;

    if (titleEl) titleEl.textContent = item.title;
    if (typeBadge) {
      typeBadge.textContent = item.type.toUpperCase();
      typeBadge.style.color = item.type === 'lost' ? 'var(--status-lost-text)' : 'var(--status-found-text)';
    }
    if (categoryText) categoryText.textContent = item.category_name;
    if (statusText) statusText.textContent = item.status;
    if (dateEl) dateEl.textContent = formatDate(item.date_occurred);
    if (locationEl) locationEl.textContent = item.location;
    if (reporterEl) reporterEl.textContent = item.reporter_name || 'Campus Member';
    if (descEl) descEl.textContent = item.description;
    if (specificLocEl) specificLocEl.textContent = item.specific_location || 'None specified';

    // Image vs SVG illustration fallback
    if (item.image_path) {
      photoEl.src = `/static/${item.image_path}`;
      photoEl.style.display = 'block';
      placeholderEl.style.display = 'none';
    } else {
      photoEl.style.display = 'none';
      placeholderEl.style.display = 'flex';
      placeholderEl.innerHTML = renderCategorySvg(item.category_slug);
    }

    // Configure Claim Button
    if (claimBtn) {
      if (item.status !== 'open') {
        claimBtn.disabled = true;
        claimBtn.textContent = `Item ${item.status}`;
      } else {
        claimBtn.disabled = false;
        claimBtn.textContent = item.type === 'found' ? 'Claim This Item (It’s Mine)' : 'I Found This Item';
      }
    }

    // Render Smart Matches
    renderMatches(data.suggested_matches || []);
  } catch (err) {
    showToast(`Failed to load item: ${err.message}`, 'error');
  }
}

function renderMatches(matches) {
  const container = document.getElementById('matches-container');
  if (!container) return;

  if (matches.length === 0) {
    container.innerHTML = '<p class="empty-state">No close candidate matches found in active listings right now.</p>';
    return;
  }

  container.innerHTML = matches.map(match => {
    const mItem = match.item;
    const score = match.match_score;
    const bd = match.breakdown;
    const kwText = bd.matched_keywords.length > 0
      ? `Keywords: ${bd.matched_keywords.join(', ')}`
      : 'Category & proximity match';

    return `
      <div class="match-item-card">
        <div class="match-score-pill">${score}% Match Score</div>
        <h4 class="match-card-title">${escapeHtml(mItem.title)}</h4>
        <p class="match-breakdown-text">
          <span>${escapeHtml(mItem.location)} &middot; ${formatDate(mItem.date_occurred)}</span><br>
          <small>${kwText}</small>
        </p>
        <button class="btn btn-outline btn-block" onclick="window.location.hash='#item-detail?id=${mItem.id}'">
          View Candidate
        </button>
      </div>
    `;
  }).join('');
}

// -----------------------------------------------------------------------------
// Claims Modal Handling
// -----------------------------------------------------------------------------
function openClaimModal() {
  if (!state.currentUser) {
    showToast('Please sign in before submitting a claim.', 'error');
    window.location.hash = '#login';
    return;
  }
  const modal = document.getElementById('claim-modal');
  const idInput = document.getElementById('claim-item-id');
  if (modal && idInput && state.currentDetailItem) {
    idInput.value = state.currentDetailItem.id;
    modal.style.display = 'flex';
  }
}

function closeClaimModal() {
  const modal = document.getElementById('claim-modal');
  if (modal) modal.style.display = 'none';
}

async function handleClaimSubmit(e) {
  e.preventDefault();
  const itemId = document.getElementById('claim-item-id').value;
  const message = document.getElementById('claim-message').value.trim();
  const proof = document.getElementById('claim-proof').value.trim();

  try {
    await apiFetch(`/items/${itemId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ message, proof_details: proof })
    });
    showToast('Claim successfully submitted to campus coordinators!', 'success');
    closeClaimModal();
    document.getElementById('claim-form').reset();
  } catch (err) {
    showToast(`Claim failed: ${err.message}`, 'error');
  }
}

// -----------------------------------------------------------------------------
// View 6: My Posts & Claims Management
// -----------------------------------------------------------------------------
async function loadMyPosts() {
  const container = document.getElementById('my-posts-container');
  const claimsContainer = document.getElementById('my-submitted-claims');
  if (!container) return;

  try {
    const data = await apiFetch('/my-posts');
    if (!data.items || data.items.length === 0) {
      container.innerHTML = '<p class="empty-state">You have not posted any lost or found items yet.</p>';
    } else {
      container.innerHTML = data.items.map(item => `
        <div class="item-card" style="margin-bottom:1rem; flex-direction:row; padding:1rem; gap:1.5rem;">
          <div style="flex:1;">
            <div class="item-card-meta">
              <span>${item.type.toUpperCase()}</span> &middot;
              <span>${item.status.toUpperCase()}</span> &middot;
              <span>${formatDate(item.date_occurred)}</span>
            </div>
            <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
            <p class="item-card-desc">${escapeHtml(item.description)}</p>
            <small style="color:var(--text-muted);">Incoming claims: ${item.claim_count || 0}</small>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.5rem; justify-content:center;">
            ${item.status === 'open' ? `<button class="btn btn-primary" onclick="resolvePost(${item.id})">Mark Resolved</button>` : ''}
            <button class="btn btn-outline" style="color:#dc2626;" onclick="deletePost(${item.id})">Delete Post</button>
          </div>
        </div>
      `).join('');
    }

    // Claims submitted by user
    if (claimsContainer) {
      if (!data.claims || data.claims.length === 0) {
        claimsContainer.innerHTML = '<p class="empty-state">You have not submitted any claims.</p>';
      } else {
        claimsContainer.innerHTML = data.claims.map(cl => `
          <div style="background:var(--bg-surface); border:1px solid var(--border-light); padding:1rem; border-radius:8px; margin-bottom:0.75rem;">
            <strong>${escapeHtml(cl.item_title)}</strong>
            <span style="float:right; font-weight:600; text-transform:capitalize;">${cl.status}</span>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.3rem;">"${escapeHtml(cl.message)}"</p>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    container.innerHTML = `<p class="error-state">${err.message}</p>`;
  }
}

async function resolvePost(itemId) {
  if (!confirm('Mark this listing as resolved and reunified?')) return;
  try {
    await apiFetch(`/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'resolved' })
    });
    showToast('Post marked as resolved!', 'success');
    loadMyPosts();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deletePost(itemId) {
  if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;
  try {
    await apiFetch(`/items/${itemId}`, { method: 'DELETE' });
    showToast('Post deleted successfully.', 'success');
    loadMyPosts();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// -----------------------------------------------------------------------------
// View 7: Admin Dashboard & Category Chart
// -----------------------------------------------------------------------------
async function loadAdminDashboard() {
  try {
    const metrics = await apiFetch('/admin/metrics');
    const claims = await apiFetch('/admin/claims');
    const itemsData = await apiFetch('/items?limit=100');

    // Populate KPIs
    document.getElementById('kpi-lost').textContent = metrics.counts.open_lost;
    document.getElementById('kpi-found').textContent = metrics.counts.open_found;
    document.getElementById('kpi-resolved').textContent = metrics.counts.resolved;
    document.getElementById('kpi-pending-claims').textContent = metrics.counts.pending_claims;

    // Render Category Distribution Chart
    renderCategoryChart(metrics.category_distribution || []);

    // Render Claims Queue
    renderAdminClaims(claims || []);

    // Render All Items Management Table
    renderAdminItems(itemsData.items || []);
  } catch (err) {
    showToast(`Failed to load admin metrics: ${err.message}`, 'error');
  }
}

function renderCategoryChart(data) {
  const container = document.getElementById('category-chart');
  if (!container) return;

  const maxVal = Math.max(...data.map(d => d.item_count), 1);

  container.innerHTML = data.map(item => {
    const pct = Math.round((item.item_count / maxVal) * 100);
    return `
      <div class="cat-bar-row">
        <span class="cat-bar-name" title="${item.category_name}">${item.category_name}</span>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="cat-bar-val">${item.item_count}</span>
      </div>
    `;
  }).join('');
}

function renderAdminClaims(claims) {
  const tbody = document.getElementById('admin-claims-tbody');
  if (!tbody) return;

  if (claims.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No claims on record.</td></tr>';
    return;
  }

  tbody.innerHTML = claims.map(cl => `
    <tr>
      <td>#${cl.id}</td>
      <td><strong>${escapeHtml(cl.item_title)}</strong></td>
      <td>${escapeHtml(cl.claimer_name)}<br><small>${escapeHtml(cl.claimer_email)}</small></td>
      <td>
        <p style="font-size:0.8rem; margin-bottom:0.25rem;">${escapeHtml(cl.message)}</p>
        ${cl.proof_details ? `<small style="color:var(--text-muted);">Proof: ${escapeHtml(cl.proof_details)}</small>` : ''}
      </td>
      <td><span class="status-indicator">${cl.claim_status}</span></td>
      <td>
        ${cl.claim_status === 'pending' ? `
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-primary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="processAdminClaim(${cl.id}, 'approved')">Approve</button>
            <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#dc2626;" onclick="processAdminClaim(${cl.id}, 'rejected')">Reject</button>
          </div>
        ` : `<span style="font-size:0.75rem; color:var(--text-muted);">Resolved</span>`}
      </td>
    </tr>
  `).join('');
}

function renderAdminItems(items) {
  const tbody = document.getElementById('admin-items-tbody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No items registered.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>${item.id}</td>
      <td><span class="item-type-chip ${item.type}">${item.type.toUpperCase()}</span></td>
      <td><strong>${escapeHtml(item.title)}</strong></td>
      <td>${escapeHtml(item.category_name)}</td>
      <td>${escapeHtml(item.location)}</td>
      <td>${formatDate(item.date_occurred)}</td>
      <td>${item.status}</td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          ${item.status !== 'resolved' ? `<button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="adminSetStatus(${item.id}, 'resolved')">Resolve</button>` : ''}
          <button class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; color:#dc2626;" onclick="adminDeleteItem(${item.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function processAdminClaim(claimId, status) {
  const notes = prompt(`Optional administrative notes for ${status} claim:`);
  try {
    await apiFetch(`/admin/claims/${claimId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_notes: notes, resolve_item: status === 'approved' })
    });
    showToast(`Claim marked as ${status}.`, 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

async function adminSetStatus(itemId, status) {
  try {
    await apiFetch(`/admin/items/${itemId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    showToast(`Item status set to ${status}.`, 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function adminDeleteItem(itemId) {
  if (!confirm('Permanently delete this item?')) return;
  try {
    await apiFetch(`/items/${itemId}`, { method: 'DELETE' });
    showToast('Item deleted.', 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

// -----------------------------------------------------------------------------
// Authentication Event Handlers & Demo Fast Switcher
// -----------------------------------------------------------------------------
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    showToast(`Welcome back, ${res.user.full_name}!`, 'success');
    state.currentUser = res.user;
    updateAuthUI();
    window.location.hash = res.user.role === 'admin' ? '#admin' : '#browse';
  } catch (err) {
    showToast(`Login failed: ${err.message}`, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const campus_id = document.getElementById('reg-campus-id').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, campus_id, phone, password })
    });
    showToast('Registration successful! Welcome to CampusFind.', 'success');
    state.currentUser = res.user;
    updateAuthUI();
    window.location.hash = '#browse';
  } catch (err) {
    showToast(`Registration failed: ${err.message}`, 'error');
  }
}

async function handleLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
    state.currentUser = null;
    updateAuthUI();
    showToast('You have signed out.', 'info');
    window.location.hash = '#home';
  } catch (err) {
    console.error('Logout error', err);
  }
}

// -----------------------------------------------------------------------------
// Event Listeners Binding
// -----------------------------------------------------------------------------
function setupEventListeners() {
  window.addEventListener('hashchange', handleRouting);

  // Hero Search Form
  const heroForm = document.getElementById('hero-search-form');
  if (heroForm) {
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('hero-search-input').value.trim();
      window.location.hash = `#browse?keyword=${encodeURIComponent(q)}`;
    });
  }

  // Filter Event Listeners
  document.querySelectorAll('#filter-type-control .segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filter-type-control .segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.type = btn.dataset.type;
      loadBrowseItems();
    });
  });

  const filterInputs = ['filter-keyword', 'filter-category', 'filter-location', 'filter-start-date', 'filter-end-date', 'filter-status'];
  filterInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const eventName = el.tagName === 'INPUT' && el.type === 'text' ? 'input' : 'change';
    el.addEventListener(eventName, () => {
      state.filters[id.replace('filter-', '').replace('-', '_')] = el.value;
      loadBrowseItems();
    });
  });

  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      state.filters = { type: '', category_id: '', location: '', start_date: '', end_date: '', keyword: '', status: 'open' };
      document.querySelectorAll('#filter-type-control .segment-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('#filter-type-control .segment-btn[data-type=""]').classList.add('active');
      filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'filter-status' ? 'open' : '';
      });
      loadBrowseItems();
    });
  }

  // Report Form Listeners
  document.querySelectorAll('#report-type-control .segment-btn').forEach(btn => {
    btn.addEventListener('click', () => setReportType(btn.dataset.type));
  });

  const photoInput = document.getElementById('report-photo-input');
  if (photoInput) photoInput.addEventListener('change', handlePhotoSelect);

  const removePhotoBtn = document.getElementById('remove-photo-btn');
  if (removePhotoBtn) removePhotoBtn.addEventListener('click', resetPhotoPreview);

  const reportForm = document.getElementById('report-item-form');
  if (reportForm) reportForm.addEventListener('submit', handleReportSubmit);

  // Claim Form Listeners
  const openClaimBtn = document.getElementById('open-claim-btn');
  if (openClaimBtn) openClaimBtn.addEventListener('click', openClaimModal);

  const closeClaimBtn = document.getElementById('close-claim-modal-btn');
  if (closeClaimBtn) closeClaimBtn.addEventListener('click', closeClaimModal);

  const cancelClaimBtn = document.getElementById('cancel-claim-btn');
  if (cancelClaimBtn) cancelClaimBtn.addEventListener('click', closeClaimModal);

  const claimForm = document.getElementById('claim-form');
  if (claimForm) claimForm.addEventListener('submit', handleClaimSubmit);

  // Auth Forms
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const regForm = document.getElementById('register-form');
  if (regForm) regForm.addEventListener('submit', handleRegister);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Auth Tabs
  const tabLogin = document.getElementById('tab-login');
  const tabReg = document.getElementById('tab-register');
  if (tabLogin && tabReg) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      document.getElementById('login-form').style.display = 'block';
      document.getElementById('register-form').style.display = 'none';
    });
    tabReg.addEventListener('click', () => {
      tabReg.classList.add('active');
      tabLogin.classList.remove('active');
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'block';
    });
  }

  // Fast Demo Switchers
  document.querySelectorAll('.btn-demo').forEach(btn => {
    btn.addEventListener('click', () => {
      const isStudent = btn.dataset.demo === 'student';
      document.getElementById('login-email').value = isStudent
        ? 'arivera@student.university.edu'
        : 'campus.security@university.edu';
      document.getElementById('login-password').value = 'CampusPass2026!';
    });
  });
}

// -----------------------------------------------------------------------------
// Utilities & Visual Helpers
// -----------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCategorySvg(slug) {
  // Clean fallback SVG icons for item categories
  return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>`;
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);
