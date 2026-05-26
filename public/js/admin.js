/* ===================================================
   Dave's Ultimate Automotive — Admin Dashboard JS
   Complete client-side logic
   =================================================== */

(function () {
  'use strict';

  /* =============================================
     AUTH MODULE
     ============================================= */
  const Auth = {
    TOKEN_KEY: 'dua_admin_token',
    USER_KEY: 'dua_admin_user',

    getToken() {
      return localStorage.getItem(this.TOKEN_KEY);
    },

    setToken(token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    },

    clearToken() {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    },

    getUser() {
      try {
        return JSON.parse(localStorage.getItem(this.USER_KEY));
      } catch {
        return null;
      }
    },

    setUser(user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    isAuthenticated() {
      return !!this.getToken();
    },

    /**
     * Wrapper for all API calls. Adds Authorization header, handles 401.
     */
    async apiRequest(endpoint, options = {}) {
      const token = this.getToken();

      // -- FAKE API FOR MOCKUP --
      if (token === 'fake-jwt-token-123') {
        return new Promise(resolve => {
          setTimeout(() => {
            if (endpoint.includes('/api/admin/dashboard')) {
              resolve({
                stats: { todayAppointments: 3, pendingRequests: 5, totalCustomers: 120, unreadMessages: 2 },
                todayAppointments_list: [
                  { id: 1, customerName: 'RK', service: 'Oil Change', time: '10:00', status: 'confirmed' }
                ],
                recentActivity: [
                  { time: '10 mins ago', message: 'RK booked an oil change' }
                ]
              });
            } else if (endpoint.includes('/api/admin/appointments')) {
              resolve([
                { id: 101, customer_name: 'RK', appointment_date: '2026-05-30', appointment_time: '10:00', service: 'Oil Change', vehicle: 'Toyota Camry', status: 'pending', location_name: 'Leander' },
                { id: 102, customer_name: 'John Doe', appointment_date: '2026-05-30', appointment_time: '13:00', service: 'Brake Inspection', vehicle: 'Honda Civic', status: 'confirmed', location_name: 'Cedar Park' },
                { id: 103, customer_name: 'Jane Smith', appointment_date: '2026-05-31', appointment_time: '09:00', service: 'Tire Rotation', vehicle: 'Ford F-150', status: 'completed', location_name: 'South Austin' }
              ]);
            } else if (endpoint.includes('/api/admin/customers')) {
              resolve([
                { id: 1, name: 'RK', email: 'rk@example.com', phone: '555-0101', vehicle: 'Toyota Camry', visits: 5, last_visit: '2026-04-15' },
                { id: 2, name: 'John Doe', email: 'john@example.com', phone: '555-0102', vehicle: 'Honda Civic', visits: 2, last_visit: '2026-05-10' },
                { id: 3, name: 'Jane Smith', email: 'jane@example.com', phone: '555-0103', vehicle: 'Ford F-150', visits: 8, last_visit: '2026-05-20' }
              ]);
            } else if (endpoint.includes('/api/admin/contact-messages')) {
              resolve([
                { id: 1, name: 'Test User', email: 'test@example.com', timestamp: '2026-05-26T10:00:00Z', message: 'Hello', read: false }
              ]);
            } else {
              resolve({});
            }
          }, 400);
        });
      }
      
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, { ...options, headers });

      if (res.status === 401) {
        this.clearToken();
        showLogin();
        throw new Error('Session expired. Please log in again.');
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }

      return res.json();
    },
  };

  /* =============================================
     UTILITY HELPERS
     ============================================= */
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '—';
    // Accept "HH:MM" or "HH:MM:SS" or a full ISO string
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  function formatDateTime(dateStr, timeStr) {
    return `${formatDate(dateStr)} · ${formatTime(timeStr)}`;
  }

  function formatCurrency(amount) {
    if (amount == null) return '—';
    return '$' + Number(amount).toFixed(2);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  /* =============================================
     DOM REFERENCES
     ============================================= */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Screens
  const loginScreen = $('#login-screen');
  const dashboardLayout = $('#dashboard-layout');

  // Login form
  const loginForm = $('#login-form');
  const loginUsername = $('#login-username');
  const loginPassword = $('#login-password');
  const loginError = $('#login-error');
  const loginBtn = $('#login-btn');

  // Sidebar
  const sidebar = $('#sidebar');
  const sidebarToggle = $('#sidebar-toggle');
  const sidebarClose = $('#sidebar-close');
  const sidebarOverlay = $('#sidebar-overlay');
  const navItems = $$('.nav-item');
  const unreadBadge = $('#unread-badge');

  // User info
  const userAvatar = $('#user-avatar');
  const userDisplayName = $('#user-display-name');
  const userDisplayRole = $('#user-display-role');

  // Views
  const pageTitle = $('#page-title');

  // Dashboard
  const statTodayAppointments = $('#stat-today-appointments');
  const statPendingRequests = $('#stat-pending-requests');
  const statTotalCustomers = $('#stat-total-customers');
  const statUnreadMessages = $('#stat-unread-messages');
  const todayAppointmentsList = $('#today-appointments-list');
  const recentActivity = $('#recent-activity');

  // Appointments
  const filterLocation = $('#filter-location');
  const filterStatus = $('#filter-status');
  const filterDate = $('#filter-date');
  const appointmentsTbody = $('#appointments-tbody');

  // Customers
  const customerSearch = $('#customer-search');
  const customersTbody = $('#customers-tbody');
  const customersListPanel = $('#customers-list-panel');
  const customerDetailPanel = $('#customer-detail-panel');
  const customerBackBtn = $('#customer-back-btn');

  // Messages
  const messagesList = $('#messages-list');

  // Reschedule dialog
  const rescheduleDialog = $('#reschedule-dialog');
  const rescheduleForm = $('#reschedule-form');
  const rescheduleAppointmentId = $('#reschedule-appointment-id');
  const rescheduleDate = $('#reschedule-date');
  const rescheduleTime = $('#reschedule-time');
  const rescheduleClose = $('#reschedule-close');
  const rescheduleCancel = $('#reschedule-cancel');
  const rescheduleSave = $('#reschedule-save');

  // Confirm dialog
  const confirmDialog = $('#confirm-dialog');
  const confirmTitle = $('#confirm-title');
  const confirmMessage = $('#confirm-message');
  const confirmClose = $('#confirm-close');
  const confirmCancelBtn = $('#confirm-cancel-btn');
  const confirmOkBtn = $('#confirm-ok-btn');

  // Toast
  const toastContainer = $('#toast-container');

  // Logout
  const logoutBtn = $('#logout-btn');

  /* =============================================
     TOAST SYSTEM
     ============================================= */
  function showToast(message, type = 'success') {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  /* =============================================
     CONFIRM DIALOG HELPER
     ============================================= */
  function showConfirm(title, message, okText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmOkBtn.textContent = okText;
      confirmCancelBtn.textContent = cancelText;
      confirmDialog.showModal();

      const cleanup = () => {
        confirmOkBtn.removeEventListener('click', onOk);
        confirmCancelBtn.removeEventListener('click', onCancel);
        confirmClose.removeEventListener('click', onCancel);
        confirmDialog.close();
      };

      function onOk() {
        cleanup();
        resolve(true);
      }
      function onCancel() {
        cleanup();
        resolve(false);
      }

      confirmOkBtn.addEventListener('click', onOk);
      confirmCancelBtn.addEventListener('click', onCancel);
      confirmClose.addEventListener('click', onCancel);
    });
  }

  /* =============================================
     STATUS BADGE RENDERER
     ============================================= */
  function renderStatusBadge(status) {
    const s = (status || 'unknown').toLowerCase().replace(/\s+/g, '-');
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      'in-progress': 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return `<span class="badge badge-${s}">${labels[s] || escapeHtml(status)}</span>`;
  }

  /* =============================================
     LOADING / EMPTY STATES
     ============================================= */
  function loadingHTML(msg = 'Loading…') {
    return `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${escapeHtml(msg)}</p>
      </div>`;
  }

  function emptyHTML(icon, title, msg) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${escapeHtml(title)}</div>
        <div class="empty-state-message">${escapeHtml(msg)}</div>
      </div>`;
  }

  /* =============================================
     SHOW / HIDE SCREENS
     ============================================= */
  function showLogin() {
    closeSidebar();
    loginScreen.hidden = false;
    dashboardLayout.hidden = true;
    loginForm.reset();
    loginError.hidden = true;
  }

  function showDashboard() {
    loginScreen.hidden = true;
    dashboardLayout.hidden = false;
    updateUserInfo();
    navigateTo('dashboard');
  }

  function updateUserInfo() {
    const user = Auth.getUser();
    if (user) {
      const name = user.name || user.username || 'Admin';
      userDisplayName.textContent = name;
      userDisplayRole.textContent = user.role || 'Administrator';
      userAvatar.textContent = name.charAt(0).toUpperCase();
    }
  }

  /* =============================================
     NAVIGATION
     ============================================= */
  const viewTitles = {
    dashboard: 'Dashboard',
    appointments: 'Appointments',
    customers: 'Customers',
    messages: 'Messages',
  };

  // Track what data has been loaded so we can lazy-load
  const viewLoaded = {};

  function navigateTo(viewName) {
    // Update sidebar active state
    navItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Show correct view
    $$('.view').forEach((v) => {
      const isTarget = v.id === `view-${viewName}`;
      v.hidden = !isTarget;
      v.classList.toggle('active', isTarget);
    });

    // Update page title
    pageTitle.textContent = viewTitles[viewName] || viewName;

    // Close mobile sidebar
    closeSidebar();

    // Lazy-load data for this view
    loadViewData(viewName);
  }

  function loadViewData(viewName) {
    switch (viewName) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'appointments':
        loadAppointments();
        break;
      case 'customers':
        if (!viewLoaded.customers) loadCustomers();
        break;
      case 'messages':
        loadMessages();
        break;
    }
  }

  /* =============================================
     SIDEBAR TOGGLE (Mobile)
     ============================================= */
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  }

  /* =============================================
     LOGIN HANDLER
     ============================================= */
  async function handleLogin(e) {
    e.preventDefault();
    loginError.hidden = true;

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
      loginError.textContent = 'Please enter both username and password.';
      loginError.hidden = false;
      return;
    }

    // Show loading
    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').hidden = true;
    loginBtn.querySelector('.btn-spinner').hidden = false;

    // Simulate 1.5 second network delay for fake login
    setTimeout(() => {
      if (username === 'admin' && password === 'changeme123') {
        // Fake success: set dummy token and show the dashboard view
        Auth.setToken('fake-jwt-token-123');
        Auth.setUser({ username: 'admin', name: 'Admin', role: 'Administrator' });
        
        showDashboard();
      } else {
        // Fake error
        loginError.textContent = 'Invalid credentials';
        loginError.hidden = false;
      }

      // Reset button state
      loginBtn.disabled = false;
      loginBtn.querySelector('.btn-text').hidden = false;
      loginBtn.querySelector('.btn-spinner').hidden = true;
    }, 1500);
  }

  /* =============================================
     DASHBOARD VIEW
     ============================================= */
  async function loadDashboard() {
    // Show loading states
    todayAppointmentsList.innerHTML = loadingHTML('Loading appointments…');
    recentActivity.innerHTML = loadingHTML('Loading activity…');

    try {
      const data = await Auth.apiRequest('/api/admin/dashboard');
      const stats = data.stats || data;

      // Animate stat counters
      animateCounter(statTodayAppointments, stats.todayAppointments ?? stats.today_appointments ?? 0);
      animateCounter(statPendingRequests, stats.pendingRequests ?? stats.pending_requests ?? 0);
      animateCounter(statTotalCustomers, stats.totalCustomers ?? stats.total_customers ?? 0);
      animateCounter(statUnreadMessages, stats.unreadMessages ?? stats.unread_messages ?? 0);

      // Update unread badge in sidebar
      const unread = stats.unreadMessages ?? stats.unread_messages ?? 0;
      if (unread > 0) {
        unreadBadge.textContent = unread;
        unreadBadge.hidden = false;
      } else {
        unreadBadge.hidden = true;
      }

      // Today's appointments
      const todayAppts = stats.todayAppointments_list || stats.today_appointments_list || data.todayAppointments_list || data.today || [];
      renderTodayAppointments(todayAppts);

      // Recent activity
      const activity = data.recentActivity || data.recent_activity || [];
      renderRecentActivity(activity);
    } catch (err) {
      todayAppointmentsList.innerHTML = emptyHTML('⚠️', 'Error', err.message);
      recentActivity.innerHTML = '';
    }
  }

  function animateCounter(el, target) {
    const num = parseInt(target, 10) || 0;
    if (num === 0) {
      el.textContent = '0';
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.ceil(num / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= num) {
        current = num;
        clearInterval(interval);
      }
      el.textContent = current;
    }, 30);
  }

  function renderTodayAppointments(appointments) {
    if (!appointments || appointments.length === 0) {
      todayAppointmentsList.innerHTML = emptyHTML('📅', 'No appointments today', 'Enjoy the quiet — or check upcoming schedules.');
      return;
    }

    todayAppointmentsList.innerHTML = `<div class="appointment-list">${appointments
      .map((a) => {
        const time = formatTime(a.time || a.appointment_time);
        const customer = escapeHtml(a.customer_name || a.customerName || a.name || '—');
        const service = escapeHtml(a.service || a.service_name || '—');
        const vehicle = escapeHtml(a.vehicle || a.vehicle_info || '');
        const status = a.status || 'pending';
        return `
          <div class="appointment-list-item">
            <span class="appointment-time">${time}</span>
            <div class="appointment-info">
              <div class="appointment-customer">${customer}</div>
              <div class="appointment-service">${service}${vehicle ? ' · ' + vehicle : ''}</div>
            </div>
            ${renderStatusBadge(status)}
          </div>`;
      })
      .join('')}</div>`;
  }

  function renderRecentActivity(activity) {
    if (!activity || activity.length === 0) {
      recentActivity.innerHTML = emptyHTML('📋', 'No recent activity', 'Activity will appear here as actions are taken.');
      return;
    }

    recentActivity.innerHTML = `<div class="appointment-list">${activity
      .map((a) => {
        const time = escapeHtml(a.time || a.created_at || '');
        const msg = escapeHtml(a.message || a.description || '');
        return `
          <div class="appointment-list-item">
            <span class="appointment-time" style="min-width:auto;font-size:0.75rem">${time}</span>
            <div class="appointment-info">
              <div class="appointment-customer">${msg}</div>
            </div>
          </div>`;
      })
      .join('')}</div>`;
  }

  /* =============================================
     APPOINTMENTS VIEW
     ============================================= */
  let allAppointments = [];

  async function loadAppointments() {
    appointmentsTbody.innerHTML = `<tr><td colspan="8">${loadingHTML('Loading appointments…')}</td></tr>`;

    const params = new URLSearchParams();
    const status = filterStatus.value;
    const date = filterDate.value;
    if (status) params.set('status', status);
    if (date) params.set('date', date);

    const qs = params.toString();
    const url = '/api/admin/appointments' + (qs ? '?' + qs : '');

    try {
      const data = await Auth.apiRequest(url);
      let appointments = Array.isArray(data) ? data : data.appointments || [];
      
      // Override dummy locations as requested
      appointments.forEach(a => {
        const name = a.customer_name || a.customerName || '';
        if (name.includes('RK')) a.location_name = 'Leander';
        else if (name.includes('John Doe')) a.location_name = 'Cedar Park';
        else if (name.includes('Jane Smith')) a.location_name = 'South Austin';
        else if (!a.location_name) a.location_name = 'Central Austin';
      });
      
      allAppointments = appointments;
      applyLocationFilter();
    } catch (err) {
      appointmentsTbody.innerHTML = `<tr><td colspan="8">${emptyHTML('⚠️', 'Error loading appointments', err.message)}</td></tr>`;
    }
  }

  function applyLocationFilter() {
    const loc = filterLocation ? filterLocation.value : 'All Locations';
    let filtered = allAppointments;
    if (loc && loc !== 'All Locations') {
      filtered = allAppointments.filter(a => a.location_name === loc);
    }
    renderAppointmentsTable(filtered);
  }

  if (filterLocation) {
    filterLocation.addEventListener('change', applyLocationFilter);
  }

  function renderAppointmentsTable(appointments) {
    if (appointments.length === 0) {
      appointmentsTbody.innerHTML = `<tr><td colspan="8">${emptyHTML('📅', 'No appointments found', 'Try adjusting the filters above.')}</td></tr>`;
      return;
    }

    appointmentsTbody.innerHTML = appointments
      .map((a) => {
        const id = a.id;
        const date = formatDate(a.date || a.appointment_date);
        const time = formatTime(a.time || a.appointment_time);
        const customer = escapeHtml(a.customer_name || a.customerName || '—');
        const locationName = escapeHtml(a.location_name || '—');
        const service = escapeHtml(a.service || a.service_name || '—');
        const vehicle = escapeHtml(a.vehicle || a.vehicle_info || '—');
        const status = (a.status || 'pending').toLowerCase();

        // Build action buttons based on status
        let actions = '';
        if (status === 'pending') {
          actions += `<button class="btn btn-sm btn-success" onclick="Admin.approveAppointment(${id})">Approve</button>`;
          actions += `<button class="btn btn-sm btn-warning" onclick="Admin.rescheduleAppointment(${id})">Reschedule</button>`;
          actions += `<button class="btn btn-sm btn-danger" onclick="Admin.fakeCancelAppointment(${id}, '${customer.replace(/'/g, "\\'")}')">Cancel</button>`;
        } else if (status === 'confirmed') {
          actions += `<button class="btn btn-sm btn-info" onclick="Admin.startAppointment(${id})">Start</button>`;
          actions += `<button class="btn btn-sm btn-warning" onclick="Admin.rescheduleAppointment(${id})">Reschedule</button>`;
          actions += `<button class="btn btn-sm btn-danger" onclick="Admin.fakeCancelAppointment(${id}, '${customer.replace(/'/g, "\\'")}')">Cancel</button>`;
        } else if (status === 'in-progress') {
          actions += `<button class="btn btn-sm btn-success" onclick="Admin.completeAppointment(${id})">Complete</button>`;
        }

        return `
          <tr id="appt-row-${id}">
            <td>#${id}</td>
            <td>${date}<br><small style="color:var(--text-muted)">${time}</small></td>
            <td>${customer}</td>
            <td>${locationName}</td>
            <td>${service}</td>
            <td>${vehicle}</td>
            <td>${renderStatusBadge(status)}</td>
            <td><div class="action-btns">${actions || '<span style="color:var(--text-muted);font-size:0.75rem">—</span>'}</div></td>
          </tr>`;
      })
      .join('');
  }

  /* ---------- Appointment Actions ---------- */
  async function approveAppointment(id) {
    try {
      await Auth.apiRequest(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'confirmed' }),
      });
      showToast('Appointment approved');
      loadAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function startAppointment(id) {
    try {
      await Auth.apiRequest(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'in-progress' }),
      });
      showToast('Appointment started');
      loadAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function completeAppointment(id) {
    try {
      await Auth.apiRequest(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });
      showToast('Appointment completed');
      loadAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function cancelAppointment(id) {
    const ok = await showConfirm(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.'
    );
    if (!ok) return;

    try {
      await Auth.apiRequest(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      showToast('Appointment cancelled');
      loadAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function fakeCancelAppointment(id, customerName) {
    const ok = await showConfirm(
      'Cancel Appointment?',
      `Are you sure you want to remove the appointment for ${customerName}?`,
      'Yes, Cancel',
      'Nevermind'
    );
    if (!ok) return;

    // Instantly filter out of the UI
    const row = document.getElementById('appt-row-' + id);
    if (row) row.remove();
    allAppointments = allAppointments.filter(a => a.id !== id);
    
    showToast('Appointment Canceled.', 'success');
  }

  /* ---------- Reschedule ---------- */
  function openRescheduleDialog(id) {
    rescheduleAppointmentId.value = id;
    rescheduleDate.min = todayISO();
    rescheduleDate.value = '';
    rescheduleTime.innerHTML = '<option value="">Select a date first…</option>';
    rescheduleDialog.showModal();
  }

  async function loadTimeSlots(date) {
    rescheduleTime.innerHTML = '<option value="">Loading slots…</option>';
    try {
      const data = await Auth.apiRequest(`/api/appointments/slots?date=${date}`);
      const slots = Array.isArray(data) ? data : data.slots || [];
      if (slots.length === 0) {
        rescheduleTime.innerHTML = '<option value="">No available slots</option>';
        return;
      }
      rescheduleTime.innerHTML = '<option value="">Select a time…</option>' +
        slots.map((s) => {
          const val = typeof s === 'string' ? s : s.time;
          return `<option value="${escapeHtml(val)}">${formatTime(val)}</option>`;
        }).join('');
    } catch (err) {
      rescheduleTime.innerHTML = '<option value="">Error loading slots</option>';
    }
  }

  async function handleReschedule(e) {
    e.preventDefault();
    const id = rescheduleAppointmentId.value;
    const date = rescheduleDate.value;
    const time = rescheduleTime.value;

    if (!date || !time) {
      showToast('Please select a date and time.', 'error');
      return;
    }

    rescheduleSave.querySelector('.btn-text').hidden = true;
    rescheduleSave.querySelector('.btn-spinner').hidden = false;
    rescheduleSave.disabled = true;

    try {
      await Auth.apiRequest(`/api/admin/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ date, time, status: 'pending' }),
      });
      rescheduleDialog.close();
      showToast('Appointment rescheduled');
      loadAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      rescheduleSave.querySelector('.btn-text').hidden = false;
      rescheduleSave.querySelector('.btn-spinner').hidden = true;
      rescheduleSave.disabled = false;
    }
  }

  /* =============================================
     CUSTOMERS VIEW
     ============================================= */
  async function loadCustomers(search) {
    customersTbody.innerHTML = `<tr><td colspan="7">${loadingHTML('Loading customers…')}</td></tr>`;

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const qs = params.toString();
    const url = '/api/admin/customers' + (qs ? '?' + qs : '');

    try {
      const data = await Auth.apiRequest(url);
      const customers = Array.isArray(data) ? data : data.customers || [];
      viewLoaded.customers = true;
      renderCustomersTable(customers);
    } catch (err) {
      customersTbody.innerHTML = `<tr><td colspan="7">${emptyHTML('⚠️', 'Error loading customers', err.message)}</td></tr>`;
    }
  }

  function renderCustomersTable(customers) {
    if (customers.length === 0) {
      customersTbody.innerHTML = `<tr><td colspan="7">${emptyHTML('👥', 'No customers found', 'Try adjusting your search terms.')}</td></tr>`;
      return;
    }

    customersTbody.innerHTML = customers
      .map((c) => {
        const name = escapeHtml(c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—');
        const email = escapeHtml(c.email || '—');
        const phone = escapeHtml(c.phone || '—');
        const vehicle = escapeHtml(c.vehicle || c.vehicle_info || '—');
        const visits = c.appointments_count ?? c.visit_count ?? c.visits ?? 0;
        const lastVisit = formatDate(c.last_visit || c.lastVisit);
        return `
          <tr>
            <td><strong>${name}</strong></td>
            <td>${email}</td>
            <td>${phone}</td>
            <td>${vehicle}</td>
            <td>${visits}</td>
            <td>${lastVisit}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="Admin.viewCustomer(${c.id})">View</button>
            </td>
          </tr>`;
      })
      .join('');
  }

  async function viewCustomer(id) {
    customersListPanel.hidden = true;
    customerDetailPanel.hidden = false;

    // Reset
    $('#detail-customer-name').textContent = 'Loading…';
    $('#detail-customer-email').textContent = '';
    $('#detail-customer-phone').textContent = '';
    $('#detail-customer-vehicle').textContent = '—';
    $('#detail-customer-visits').textContent = '—';
    $('#detail-customer-last-visit').textContent = '—';
    $('#customer-history-tbody').innerHTML = `<tr><td colspan="3">${loadingHTML()}</td></tr>`;

    try {
      const data = await Auth.apiRequest(`/api/admin/customers/${id}`);
      const c = data.customer || data;

      const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—';
      $('#detail-customer-avatar').textContent = name.charAt(0).toUpperCase();
      $('#detail-customer-name').textContent = name;
      $('#detail-customer-email').textContent = c.email || '—';
      $('#detail-customer-phone').textContent = c.phone || '—';
      $('#detail-customer-vehicle').textContent = c.vehicle || c.vehicle_info || '—';
      $('#detail-customer-visits').textContent = c.appointments_count ?? c.visit_count ?? c.visits ?? '—';
      $('#detail-customer-last-visit').textContent = formatDate(c.last_visit || c.lastVisit);

      // Appointment history
      const history = c.appointments || c.history || data.appointments || [];
      if (history.length === 0) {
        $('#customer-history-tbody').innerHTML = `<tr><td colspan="3">${emptyHTML('📋', 'No appointment history', '')}</td></tr>`;
      } else {
        $('#customer-history-tbody').innerHTML = history
          .map((a) => `
            <tr>
              <td>${formatDate(a.date || a.appointment_date)} ${formatTime(a.time || a.appointment_time)}</td>
              <td>${escapeHtml(a.service || a.service_name || '—')}</td>
              <td>${renderStatusBadge(a.status || 'pending')}</td>
            </tr>`)
          .join('');
      }
    } catch (err) {
      $('#detail-customer-name').textContent = 'Error';
      $('#customer-history-tbody').innerHTML = `<tr><td colspan="3">${emptyHTML('⚠️', 'Error', err.message)}</td></tr>`;
    }
  }

  function backToCustomersList() {
    customerDetailPanel.hidden = true;
    customersListPanel.hidden = false;
  }

  /* =============================================
     MESSAGES VIEW
     ============================================= */
  let messagesData = [];

  async function loadMessages() {
    messagesList.innerHTML = loadingHTML('Loading messages…');

    try {
      const data = await Auth.apiRequest('/api/admin/contact-messages');
      messagesData = Array.isArray(data) ? data : data.messages || [];
      renderMessages(messagesData);
    } catch (err) {
      messagesList.innerHTML = emptyHTML('⚠️', 'Error loading messages', err.message);
    }
  }

  function renderMessages(messages) {
    if (messages.length === 0) {
      messagesList.innerHTML = emptyHTML('✉️', 'No messages yet', 'Contact form submissions will appear here.');
      return;
    }

    messagesList.innerHTML = messages
      .map((m, idx) => {
        const isUnread = !m.read && !m.is_read;
        const name = escapeHtml(m.name || m.sender_name || '—');
        const email = escapeHtml(m.email || m.sender_email || '');
        const time = formatDate(m.created_at || m.timestamp || m.date);
        const preview = escapeHtml(m.message || m.body || m.content || '');
        return `
          <div class="message-card ${isUnread ? 'unread' : ''}" data-message-id="${m.id}" data-idx="${idx}">
            <div class="message-card-header">
              <span class="message-sender">
                ${isUnread ? '<span class="unread-dot"></span>' : ''}
                ${name}
              </span>
              <span class="message-time">${time}</span>
            </div>
            <div class="message-email-display">${email}</div>
            <div class="message-preview">${preview}</div>
            <div class="message-full" hidden>${preview}</div>
            <div class="message-actions" hidden>
              ${isUnread ? `<button class="btn btn-sm btn-primary" onclick="Admin.markAsRead(${m.id}); event.stopPropagation();">Mark as Read</button>` : '<span class="badge badge-completed">Read</span>'}
            </div>
          </div>`;
      })
      .join('');

    // Attach click handlers to expand/collapse
    messagesList.querySelectorAll('.message-card').forEach((card) => {
      card.addEventListener('click', () => {
        const full = card.querySelector('.message-full');
        const actions = card.querySelector('.message-actions');
        const preview = card.querySelector('.message-preview');
        const isExpanded = !full.hidden;
        // Collapse all first
        messagesList.querySelectorAll('.message-full').forEach((f) => (f.hidden = true));
        messagesList.querySelectorAll('.message-actions').forEach((a) => (a.hidden = true));
        messagesList.querySelectorAll('.message-preview').forEach((p) => (p.style.display = ''));
        if (!isExpanded) {
          full.hidden = false;
          actions.hidden = false;
          preview.style.display = 'none';
        }
      });
    });
  }

  async function markAsRead(id) {
    try {
      await Auth.apiRequest(`/api/admin/contact-messages/${id}/read`, {
        method: 'PUT',
      });
      showToast('Message marked as read');
      loadMessages();
      // Also update unread count badge
      const unread = parseInt(unreadBadge.textContent || '0', 10);
      if (unread > 1) {
        unreadBadge.textContent = unread - 1;
      } else {
        unreadBadge.hidden = true;
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  /* =============================================
     LOGOUT
     ============================================= */
  function handleLogout(e) {
    if (e) e.preventDefault();
    Auth.clearToken();
    viewLoaded.customers = false;
    allAppointments = [];
    appointmentsTbody.innerHTML = '';
    todayAppointmentsList.innerHTML = '';
    recentActivity.innerHTML = '';
    showLogin();
    showToast('Logged out successfully', 'info');
  }

  /* =============================================
     EVENT LISTENERS
     ============================================= */
  function bindEvents() {
    // Login
    loginForm.addEventListener('submit', handleLogin);

    // Sidebar navigation
    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.view);
      });
    });

    // Sidebar toggle (mobile)
    sidebarToggle.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Appointment filters
    filterStatus.addEventListener('change', loadAppointments);
    filterDate.addEventListener('change', loadAppointments);

    // Customer search (debounced)
    customerSearch.addEventListener(
      'input',
      debounce(() => {
        loadCustomers(customerSearch.value.trim());
      }, 300)
    );

    // Customer back button
    customerBackBtn.addEventListener('click', backToCustomersList);

    // Reschedule dialog
    rescheduleDate.addEventListener('change', () => {
      if (rescheduleDate.value) {
        loadTimeSlots(rescheduleDate.value);
      }
    });
    rescheduleForm.addEventListener('submit', handleReschedule);
    rescheduleClose.addEventListener('click', () => rescheduleDialog.close());
    rescheduleCancel.addEventListener('click', () => rescheduleDialog.close());

    // Close dialogs on backdrop click
    rescheduleDialog.addEventListener('click', (e) => {
      if (e.target === rescheduleDialog) rescheduleDialog.close();
    });
    confirmDialog.addEventListener('click', (e) => {
      if (e.target === confirmDialog) confirmDialog.close();
    });

    // Keyboard: Escape closes mobile sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  /* =============================================
     EXPOSE ACTIONS GLOBALLY (for onclick handlers in rendered HTML)
     ============================================= */
  window.Admin = {
    approveAppointment,
    startAppointment,
    completeAppointment,
    cancelAppointment,
    fakeCancelAppointment,
    rescheduleAppointment: openRescheduleDialog,
    viewCustomer,
    markAsRead,
  };

  /* =============================================
     INIT
     ============================================= */
  function init() {
    bindEvents();

    if (Auth.isAuthenticated()) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
