/* ═══════════════════════════════════════════════════════════════════
   Dave's Ultimate Automotive — Client-Side Application Logic
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── UTILITY HELPERS ──────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function formatCurrency(cents) {
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function formatTime12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function debounce(fn, ms = 100) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  const ICON_MAP = {
    'oil-drop': '🛢️',
    'brake-disc': '🔴',
    'engine': '⚙️',
    'tire': '🔘',
    'snowflake': '❄️',
    'transmission': '⚡',
    'wrench': '🔧',
    'gauge': '📊',
  };

  function getIcon(key) {
    return ICON_MAP[key] || '🔧';
  }

  // ─── STATE ────────────────────────────────────────────────────────
  let servicesData = [];
  let locationsData = [];
  let reviewsAutoScroll = null;
  let currentBooking = { locationId: null, serviceId: null };

  // ─── DOM REFERENCES ───────────────────────────────────────────────
  const nav = $('#nav');
  const hamburger = $('#hamburger');
  const navLinks = $('#navLinks');
  const servicesGrid = $('#servicesGrid');
  const serviceTabs = $('#serviceTabs');
  const reviewsTrack = $('#reviewsTrack');
  const locationsGrid = $('#locationsGrid');
  const bookingModal = $('#bookingModal');
  const bookingModalOverlay = $('#bookingModalOverlay');
  const bookingModalClose = $('#bookingModalClose');
  const bookingModalBack = $('#bookingModalBack');
  const stepService = $('#stepService');
  const stepDateTime = $('#stepDateTime');
  const stepCustomer = $('#stepCustomer');
  const modalLocationSelect = $('#modalLocationSelect');
  const modalServicesList = $('#modalServicesList');
  const btnNextService = $('#btnNextService');
  const modalLocationAddress = $('#modalLocationAddress');
  const modalDate = $('#modalDate');
  const modalTime = $('#modalTime');
  const btnNextDateTime = $('#btnNextDateTime');
  const modalBookingForm = $('#modalBookingForm');
  const btnSubmitBooking = $('#btnSubmitBooking');
  const confirmationDialog = $('#confirmationDialog');
  const dialogDetails = $('#dialogDetails');
  const dialogClose = $('#dialogClose');
  const contactForm = $('#contactForm');
  const toastContainer = $('#toastContainer');

  // ─── NAVIGATION ───────────────────────────────────────────────────

  // Mobile hamburger toggle
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.classList.toggle('no-scroll', isOpen);
  });

  // Close mobile menu on link click
  $$('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    });
  });

  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Scrolled nav state & active link
  const sections = $$('section[id]');

  function onScroll() {
    const y = window.scrollY;

    // Shrink nav
    nav.classList.toggle('scrolled', y > 100);

    // Active link highlighting
    let currentId = '';
    for (const section of sections) {
      if (y >= section.offsetTop - 200) {
        currentId = section.id;
      }
    }
    $$('.nav__link').forEach(link => {
      const isActive = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('active', isActive);
    });
  }

  window.addEventListener('scroll', debounce(onScroll, 15), { passive: true });
  onScroll();

  // ─── SERVICES ─────────────────────────────────────────────────────

  async function loadServices() {
    try {
      const res = await fetch('/api/services');
      if (!res.ok) throw new Error('Failed to fetch services');
      servicesData = await res.json();
      renderServices(servicesData);
      populateServiceDropdown(servicesData);
    } catch (err) {
      console.error('Services load error:', err);
      if (servicesGrid) servicesGrid.innerHTML = '<p style="text-align:center;color:var(--text-light);grid-column:1/-1;">Unable to load services. Please try again later.</p>';
    }
  }

  function renderServices(services) {
    if (!servicesGrid) return;
    servicesGrid.innerHTML = services.map(s => `
      <div class="service-card animate-in visible" data-category="${s.category}" data-id="${s.id}">
        <div class="service-card__icon">${getIcon(s.icon)}</div>
        <h3 class="service-card__name">${escapeHTML(s.name)}</h3>
        <p class="service-card__desc">${escapeHTML(s.description)}</p>
        <div class="service-card__meta">
          <span class="service-card__duration">${s.duration} min</span>
        </div>
        <button class="service-card__book" data-service-id="${s.id}">
          Book Now
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    `).join('');

    // Book Now clicks on cards
    $$('.service-card__book', servicesGrid).forEach(btn => {
      btn.addEventListener('click', () => {
        const serviceId = btn.dataset.serviceId;
        serviceSelect.value = serviceId;
        document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  function populateServiceDropdown(services) {
    serviceSelect.innerHTML = '<option value="">Select a service…</option>' +
      services.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
  }

  // Category filter tabs
  if (serviceTabs) {
    serviceTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.services__tab');
      if (!tab) return;

      $$('.services__tab', serviceTabs).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.dataset.category;
      if (servicesGrid) {
        $$('.service-card', servicesGrid).forEach(card => {
          if (category === 'all' || card.dataset.category === category) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      }
    });
  }

  
  // ─── LOCATIONS ────────────────────────────────────────────────────
  async function loadLocations() {
    try {
      const res = await fetch('/api/locations');
      if (!res.ok) throw new Error('Failed to fetch locations');
      locationsData = await res.json();
      renderLocations(locationsData);
      populateModalLocations(locationsData);
    } catch (err) {
      console.error('Locations load error:', err);
    }
  }

  function renderLocations(locations) {
    if (!locationsGrid) return;
    locationsGrid.innerHTML = locations.map(loc => `
      <div class="loc-card">
        <img src="https://placehold.co/600x300/e0e0e0/555?text=${encodeURIComponent(loc.name)}" class="loc-card__img" alt="${escapeHTML(loc.name)}">
        <div class="loc-card__body">
          <h3 class="loc-card__title">${escapeHTML(loc.name)}</h3>
          <div class="loc-card__phone">${escapeHTML(loc.phone)}</div>
          <div class="loc-card__hours">${escapeHTML(loc.hours)}</div>
          <div class="loc-card__address">${escapeHTML(loc.address)}</div>
          <div class="loc-card__social" style="font-size:1.2rem; margin: 15px 0;">
            <span style="color:#1877F2; margin-right:5px;">f</span>
            <span style="color:#000; margin-right:5px;">𝕏</span>
            <span style="color:#FF0000; margin-right:5px;">▶</span>
            <span style="color:#4285F4;">G</span>
          </div>
          <div class="loc-card__reviews">
            <span class="loc-card__reviews-stars">★★★★★</span>
            ${escapeHTML(loc.rating_count)} Google Reviews
          </div>
          <button class="loc-card__btn" onclick="openBookingModal(${loc.id})">Schedule Service</button>
        </div>
      </div>
    `).join('');
  }

  function populateModalLocations(locations) {
    if (!modalLocationSelect) return;
    modalLocationSelect.innerHTML = locations.map(loc => 
      `<option value="${loc.id}">${escapeHTML(loc.name)}</option>`
    ).join('');
  }
  
  window.openBookingModal = function(locationId) {
    currentBooking.locationId = locationId;
    if(modalLocationSelect) modalLocationSelect.value = locationId;
    updateModalLocationAddress();
    
    // Render popular services
    renderModalServices();
    
    // Reset steps
    stepService.hidden = false;
    stepDateTime.hidden = true;
    stepCustomer.hidden = true;
    bookingModalBack.hidden = true;
    
    bookingModal.hidden = false;
  };

  // ─── REVIEWS ──────────────────────────────────────────────────────

  async function loadReviews() {
    try {
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const reviews = await res.json();
      renderReviews(reviews);
      startReviewAutoScroll();
    } catch (err) {
      console.error('Reviews load error:', err);
      reviewsTrack.innerHTML = '<p style="text-align:center;color:var(--text-light);width:100%;">Unable to load reviews.</p>';
    }
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    const empty = 5 - full;
    return '★'.repeat(full) + '☆'.repeat(empty);
  }

  function renderReviews(reviews) {
    reviewsTrack.innerHTML = reviews.map(r => `
      <div class="review-card">
        <div class="review-card__stars">${renderStars(r.rating)}</div>
        <p class="review-card__text">"${escapeHTML(r.review_text || r.text || '')}"</p>
        <span class="review-card__author">${escapeHTML(r.customer_name || r.name || 'Anonymous')}</span>
        <span class="review-card__dash"></span>
      </div>
    `).join('');
  }

  function startReviewAutoScroll() {
    const track = reviewsTrack;
    if (!track.children.length) return;

    reviewsAutoScroll = setInterval(() => {
      const cardWidth = track.children[0].offsetWidth + 24; // gap
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: cardWidth, behavior: 'smooth' });
      }
    }, 5000);

    // Pause on hover
    track.addEventListener('mouseenter', () => clearInterval(reviewsAutoScroll));
    track.addEventListener('mouseleave', () => startReviewAutoScroll());
  }

  // ─── BOOKING WIZARD ───────────────────────────────────────────────

  function updateModalLocationAddress() {
    const loc = locationsData.find(l => l.id == modalLocationSelect.value);
    if (loc && modalLocationAddress) {
      modalLocationAddress.textContent = `${loc.address}, ${loc.city_state_zip} • DRIVEN BY KUKUI`;
    }
  }

  modalLocationSelect?.addEventListener('change', (e) => {
    currentBooking.locationId = e.target.value;
    updateModalLocationAddress();
  });

  function renderModalServices() {
    if (!modalServicesList) return;
    modalServicesList.innerHTML = servicesData.slice(0, 5).map(s => `
      <div class="modal-service-card" data-id="${s.id}" onclick="selectModalService(${s.id})">
        <div class="modal-service-card__icon">${getIcon(s.icon)}</div>
        <div class="modal-service-card__info">
          <div class="modal-service-card__name">${escapeHTML(s.name)}</div>
          <div class="modal-service-card__desc">${escapeHTML(s.description)}</div>
        </div>
      </div>
    `).join('');
  }

  window.selectModalService = function(serviceId) {
    currentBooking.serviceId = serviceId;
    $$('.modal-service-card', modalServicesList).forEach(card => {
      if (card.dataset.id == serviceId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
    if (btnNextService) {
      btnNextService.disabled = false;
      btnNextService.style.background = '#F5C518';
      btnNextService.style.color = '#0B1D3A';
      btnNextService.style.borderColor = '#F5C518';
    }
  };

  btnNextService?.addEventListener('click', () => {
    stepService.hidden = true;
    stepDateTime.hidden = false;
    bookingModalBack.hidden = false;
  });

  // Date/Time Step
  if (modalDate) modalDate.min = todayISO();
  
  modalDate?.addEventListener('change', async () => {
    const date = modalDate.value;
    if (!date) return;

    modalTime.innerHTML = '<option value="">Loading slots…</option>';
    modalTime.disabled = true;

    try {
      const res = await fetch(`/api/appointments/slots?date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch slots');
      const { slots } = await res.json();

      if (slots.length === 0) {
        modalTime.innerHTML = '<option value="">No slots available</option>';
        btnNextDateTime.disabled = true;
      } else {
        modalTime.innerHTML = '<option value="">Choose a time…</option>' +
          slots.map(s => {
            const time = s.time || s;
            return `<option value="${time}">${formatTime12(time)}</option>`;
          }).join('');
        modalTime.disabled = false;
      }
    } catch (err) {
      console.error('Slots error:', err);
      modalTime.innerHTML = '<option value="">Error loading slots</option>';
    } finally {
      modalTime.disabled = false;
    }
  });

  modalTime?.addEventListener('change', () => {
    btnNextDateTime.disabled = !modalTime.value;
  });

  btnNextDateTime?.addEventListener('click', () => {
    stepDateTime.hidden = true;
    stepCustomer.hidden = false;
  });

  // Back Button
  bookingModalBack?.addEventListener('click', () => {
    if (!stepCustomer.hidden) {
      stepCustomer.hidden = true;
      stepDateTime.hidden = false;
    } else if (!stepDateTime.hidden) {
      stepDateTime.hidden = true;
      stepService.hidden = false;
      bookingModalBack.hidden = true;
    }
  });

  // Close Button / Overlay
  function closeBookingModal() {
    if(bookingModal) bookingModal.hidden = true;
    if(stepService) stepService.hidden = false;
    if(stepDateTime) stepDateTime.hidden = true;
    if(stepCustomer) stepCustomer.hidden = true;
    if(bookingModalBack) bookingModalBack.hidden = true;
    currentBooking.serviceId = null;
    if(btnNextService) {
      btnNextService.disabled = true;
      btnNextService.style.background = '#ddd';
      btnNextService.style.color = '#888';
      btnNextService.style.borderColor = '#ddd';
    }
    if(modalBookingForm) modalBookingForm.reset();
    if(modalTime) modalTime.innerHTML = '<option value="">Select a date first…</option>';
  }
  
  bookingModalClose?.addEventListener('click', closeBookingModal);
  bookingModalOverlay?.addEventListener('click', closeBookingModal);

  // Submit Booking
  modalBookingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!modalBookingForm.checkValidity()) {
      modalBookingForm.reportValidity();
      return;
    }

    const submitBtn = btnSubmitBooking;
    const text = $('.btn__text', submitBtn);
    const loader = $('.btn__loader', submitBtn);
    text.hidden = true;
    loader.hidden = false;
    submitBtn.disabled = true;

    const body = {
      location_id: parseInt(currentBooking.locationId, 10),
      service_id: parseInt(currentBooking.serviceId, 10),
      date: modalDate.value,
      time: modalTime.value,
      first_name: $('#modalFirstName').value.trim(),
      last_name: $('#modalLastName').value.trim(),
      email: $('#modalEmail').value.trim(),
      phone: $('#modalPhone').value.trim(),
      vehicle_make: $('#modalMake').value.trim(),
      vehicle_model: $('#modalModel').value.trim(),
      vehicle_year: parseInt($('#modalYear').value, 10),
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Booking failed');
      }

      const result = await res.json();
      closeBookingModal();
      showToast('Appointment scheduled successfully!', 'success');
    } catch (err) {
      console.error('Booking error:', err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      text.hidden = false;
      loader.hidden = true;
      submitBtn.disabled = false;
    }
  });

  // ─── SERVICE & CONTACT PAGES SHOW/HIDE LOGIC ────────────────────────
  const pageIds = ['ev-services', 'all-services', 'premium-protection', 'contact', 'refer', 'vip', 'oil-change', 'join-club'];

  document.querySelectorAll('.nav__dropdown-menu a, .top-bar__link, .internal-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && pageIds.includes(href.replace('#', ''))) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = href.replace('#', '');

        // Hide all pages first
        pageIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });

        // Show the clicked one
        const target = document.getElementById(targetId);
        if (target) {
          target.style.display = 'block';
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  });

  // ─── FINANCING SECTION LOGIC ──────────────────────────────────────
  const financingView1 = document.getElementById('financingView1');
  const financingView2 = document.getElementById('financingView2');
  const financingHeroTitle = document.getElementById('financingHeroTitle');
  const financingApplyBtn = document.getElementById('financingApplyBtn');
  const financingBackBtn = document.getElementById('financingBackBtn');
  
  // Application links provided by Dave's Ultimate Automotive
  const financingLinks = {
    'Cedar Park': 'https://www.synchrony.com/mmc/NN195852701',
    'Central Austin': 'https://www.synchrony.com/mmc/NN188357101',
    'Leander': 'https://www.synchrony.com/mmc/NN238427801?sitecode=acewel401',
    'North Austin': 'https://www.synchrony.com/mmc/NN173203801',
    'Pflugerville': 'https://www.synchrony.com/mmc/NN179220201',
    'Round Rock': 'https://www.synchrony.com/mmc/NN184766001',
    'South Austin': 'https://www.synchrony.com/mmc/NN215244001'
  };

  document.querySelectorAll('.financing__loc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const loc = btn.dataset.loc;
      if(financingHeroTitle) financingHeroTitle.textContent = `${loc} – Financing`;
      if(financingApplyBtn) financingApplyBtn.href = financingLinks[loc] || '#';
      if(financingView1) financingView1.style.display = 'none';
      if(financingView2) financingView2.style.display = 'block';
    });
  });

  financingBackBtn?.addEventListener('click', () => {
    if(financingHeroTitle) financingHeroTitle.textContent = 'Financing';
    if(financingView2) financingView2.style.display = 'none';
    if(financingView1) financingView1.style.display = 'block';
  });

  // ─── CONTACT FORM (FOOTER) ────────────────────────────────────────

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const body = {
      name: contactForm.querySelector('[name="name"]').value.trim(),
      email: contactForm.querySelector('[name="email"]').value.trim(),
      message: contactForm.querySelector('[name="message"]').value.trim(),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Send failed');

      showToast('Message sent! We\'ll get back to you soon.', 'success');
      contactForm.reset();
    } catch (err) {
      console.error('Contact error:', err);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });

  // ─── TOAST SYSTEM ─────────────────────────────────────────────────

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast--error' : ''}`;
    toast.innerHTML = `
      <span class="toast__icon">${type === 'error' ? '❌' : '✅'}</span>
      <span>${escapeHTML(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }

  // ─── SCROLL ANIMATIONS ───────────────────────────────────────────

  function initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // Stagger siblings
            const parent = entry.target.parentElement;
            const siblings = $$('.animate-in', parent);
            const idx = siblings.indexOf(entry.target);
            entry.target.style.transitionDelay = `${idx * 0.1}s`;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    $$('.animate-in').forEach(el => observer.observe(el));
  }

  // ─── COUNTER ANIMATION ───────────────────────────────────────────

  function initCounters() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    $$('[data-target]').forEach(el => observer.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const value = Math.round(eased * target);
      el.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ─── ESCAPE HTML ──────────────────────────────────────────────────

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── INIT ─────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    loadLocations();
    loadServices();
    loadReviews();
    initScrollAnimations();
    initCounters();
  });

})();
