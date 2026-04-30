/* script.js — Shared site scripts for LearningPlatform
   Place this file in the same folder as your HTML pages and include it last (after Bootstrap).
   Author: Generated for student project
   Note: All data saved to localStorage is for demo only (not secure). In production, use server-side storage & proper hashing.
*/

/* =========================
   Configuration / keys
   ========================= */
const KEYS = {
  CART: 'lp_cart',
  CONTACTS: 'lp_contacts',
  USERS: 'lp_users',
  SESSION: 'lp_session',
  REMEMBER: 'lp_remember'
};

document.addEventListener('DOMContentLoaded', () => {
  initFooterYear();
  setupEnrollButtons();
  initCartPage();       // if cart page elements exist, this will wire everything
  setupContactForm();
  setupRegisterForm();
  setupLoginForm();
  // Accessibility helper: add keyboard-only outline class when tabbing
  initKeyboardFocusOutline();
});

/* =========================
   Utilities
   ========================= */
function formatCurrencyINR(value) {
  // value is number
  return '₹' + Number(value).toFixed(2);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    console.error('Storage parse error for', key, e);
    return [];
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error for', key, e);
  }
}

/* =========================
   Footer year population
   Look for common IDs used across pages and set the year.
   ========================= */
function initFooterYear() {
  const ids = ['year', 'year-about', 'year-contact', 'year-cart', 'year-register', 'year-login'];
  const year = new Date().getFullYear();
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = year;
  });
}

/* =========================
   Enroll buttons (index.html cards)
   Adds a course object into localStorage under KEYS.CART
   Course object: { id, title, price, qty, total }
   ========================= */
function setupEnrollButtons() {
  const buttons = document.querySelectorAll('.enroll-btn');
  if (!buttons || buttons.length === 0) return;

  buttons.forEach(btn => {
    // avoid adding duplicate handlers: tag with data attribute
    if (btn.dataset.enrollAttached === '1') return;
    btn.dataset.enrollAttached = '1';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id || ('course_' + Date.now());
      const title = btn.dataset.title || btn.getAttribute('aria-label') || 'Course';
      const price = parseFloat(btn.dataset.price || '0') || 0;

      const cart = readStorage(KEYS.CART);
      const existing = cart.find(item => item.id === id);
      if (existing) {
        existing.qty = Number(existing.qty) + 1;
        existing.total = +(existing.qty * existing.price).toFixed(2);
      } else {
        cart.push({
          id,
          title,
          price: +price,
          qty: 1,
          total: +price
        });
      }
      writeStorage(KEYS.CART, cart);

      // Provide feedback + optional redirect to cart
      const go = confirm(`${title} has been added to your cart.\n\nOpen cart now?`);
      if (go) window.location.href = 'cart.html';
    });
  });
}

/* =========================
   Cart page: render and interactivity
   Only initializes if cart page elements exist.
   Expects IDs/classes used in cart.html:
     #cartTableBody, #cartCards, #subtotal, #tax, #grandTotal, #clearCartBtn, #checkoutBtn
   ========================= */
function initCartPage() {
  const tableBody = document.getElementById('cartTableBody');
  const cardsContainer = document.getElementById('cartCards');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const grandTotalEl = document.getElementById('grandTotal');
  const emptyState = document.getElementById('emptyState');
  const clearBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // if none of the expected elements exist, skip initialization (not on cart page)
  if (!tableBody && !cardsContainer && !subtotalEl) return;

  // Render initially
  renderCartUI();

  // Event delegation for table and cards (quantity buttons, inputs, remove)
  if (tableBody) {
    tableBody.addEventListener('click', handleCartClick);
    tableBody.addEventListener('change', handleCartChange);
  }
  if (cardsContainer) {
    cardsContainer.addEventListener('click', handleCartClick);
    cardsContainer.addEventListener('change', handleCartChange);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all items from your cart?')) return;
      localStorage.removeItem(KEYS.CART);
      renderCartUI();
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = readStorage(KEYS.CART);
      if (!cart || cart.length === 0) {
        alert('Your cart is empty. Please add courses first.');
        return;
      }
      const totals = calculateTotals(cart);
      if (confirm(`Proceed to checkout? Total payable: ${formatCurrencyINR(totals.grandTotal)}`)) {
        // demo: clear cart and show success
        localStorage.removeItem(KEYS.CART);
        alert('Checkout successful (demo). Thank you!');
        renderCartUI();
      }
    });
  }

  // Helpers for cart page
  function renderCartUI() {
    const cart = readStorage(KEYS.CART);
    // show/hide empty state
    if (emptyState) emptyState.classList.toggle('d-none', cart.length > 0);

    // render desktop table
    if (tableBody) {
      tableBody.innerHTML = '';
      cart.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        tr.innerHTML = `
          <td>
            <div class="d-flex align-items-center">
              <img src="images/${item.id}.jpg" alt="${escapeHtml(item.title)}" style="width:72px; height:54px; object-fit:cover; border-radius:6px; margin-right:12px;">
              <div>
                <div class="fw-bold">${escapeHtml(item.title)}</div>
                <div class="small text-muted">Course ID: ${escapeHtml(item.id)}</div>
              </div>
            </div>
          </td>
          <td class="text-end">₹${Number(item.price).toFixed(2)}</td>
          <td class="text-center">
            <div class="input-group input-group-sm justify-content-center" style="max-width:120px;">
              <button class="btn btn-outline-secondary btn-sm qty-decrease" type="button" aria-label="Decrease quantity">−</button>
              <input type="number" min="1" class="form-control text-center qty-input" value="${Number(item.qty)}" aria-label="Quantity">
              <button class="btn btn-outline-secondary btn-sm qty-increase" type="button" aria-label="Increase quantity">+</button>
            </div>
          </td>
          <td class="text-end">₹${Number(item.total).toFixed(2)}</td>
          <td class="text-center">
            <button class="btn btn-outline-danger btn-sm remove-item">Remove</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }

    // render mobile cards
    if (cardsContainer) {
      cardsContainer.innerHTML = '';
      cart.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-12';
        col.innerHTML = `
          <div class="card shadow-sm">
            <div class="card-body d-flex gap-3">
              <img src="images/${item.id}.jpg" alt="${escapeHtml(item.title)}" style="width:96px; height:72px; object-fit:cover; border-radius:6px;">
              <div class="flex-grow-1 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <div class="fw-bold">${escapeHtml(item.title)}</div>
                    <div class="small text-muted">Course ID: ${escapeHtml(item.id)}</div>
                  </div>
                  <div class="text-end">
                    <div class="fw-bold">₹${Number(item.price).toFixed(2)}</div>
                    <div class="small text-muted">each</div>
                  </div>
                </div>
                <div class="mt-2 d-flex justify-content-between align-items-center">
                  <div class="input-group input-group-sm" style="max-width:130px;">
                    <button class="btn btn-outline-secondary btn-sm qty-decrease" type="button">−</button>
                    <input type="number" min="1" class="form-control text-center qty-input" value="${Number(item.qty)}">
                    <button class="btn btn-outline-secondary btn-sm qty-increase" type="button">+</button>
                  </div>
                  <div class="text-end">
                    <div class="fw-bold">₹${Number(item.total).toFixed(2)}</div>
                    <button class="btn btn-link btn-sm text-danger remove-item">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        cardsContainer.appendChild(col);
      });
    }

    // update totals
    const totals = calculateTotals(cart);
    if (subtotalEl) subtotalEl.textContent = formatCurrencyINR(totals.subtotal);
    if (taxEl) taxEl.textContent = formatCurrencyINR(totals.tax);
    if (grandTotalEl) grandTotalEl.textContent = formatCurrencyINR(totals.grandTotal);
  }

  function calculateTotals(cart) {
    const subtotal = cart.reduce((acc, i) => acc + Number(i.total || 0), 0);
    const tax = +(subtotal * 0.18).toFixed(2);
    const grandTotal = +(subtotal + tax).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), tax, grandTotal };
  }

  function handleCartClick(e) {
    const target = e.target;
    // find the item id: from closest tr or from card
    let id = null;
    const tr = target.closest('tr');
    if (tr && tr.dataset.id) id = tr.dataset.id;
    else {
      const card = target.closest('.card');
      if (card) {
        const idText = card.querySelector('.small.text-muted');
        if (idText) {
          const match = idText.textContent.match(/Course ID:\s*(.+)/i);
          if (match) id = match[1].trim();
        }
      }
    }
    if (!id) return;

    if (target.classList.contains('qty-decrease')) {
      changeQty(id, -1);
    } else if (target.classList.contains('qty-increase')) {
      changeQty(id, +1);
    } else if (target.classList.contains('remove-item')) {
      removeItem(id);
    }
  }

  function handleCartChange(e) {
    const input = e.target;
    if (!input.classList.contains('qty-input')) return;
    // locate id like above
    let id = null;
    const tr = input.closest('tr');
    if (tr && tr.dataset.id) id = tr.dataset.id;
    else {
      const card = input.closest('.card');
      if (card) {
        const idText = card.querySelector('.small.text-muted');
        if (idText) {
          const match = idText.textContent.match(/Course ID:\s*(.+)/i);
          if (match) id = match[1].trim();
        }
      }
    }
    if (!id) return;
    let qty = parseInt(input.value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    setQty(id, qty);
  }

  function changeQty(itemId, delta) {
    const cart = readStorage(KEYS.CART);
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    item.qty = Math.max(1, Number(item.qty) + delta);
    item.total = +(item.qty * item.price).toFixed(2);
    writeStorage(KEYS.CART, cart);
    renderCartUI();
  }

  function setQty(itemId, qty) {
    const cart = readStorage(KEYS.CART);
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    item.qty = Math.max(1, Number(qty));
    item.total = +(item.qty * item.price).toFixed(2);
    writeStorage(KEYS.CART, cart);
    renderCartUI();
  }

  function removeItem(itemId) {
    let cart = readStorage(KEYS.CART);
    cart = cart.filter(i => i.id !== itemId);
    writeStorage(KEYS.CART, cart);
    renderCartUI();
  }
}

/* =========================
   Contact form handling (contact.html)
   Expects #contactForm and #formAlert (optional)
   Saves entries to KEYS.CONTACTS
   ========================= */
function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const alertBox = document.getElementById('formAlert');

  function showAlert(type, msg) {
    if (!alertBox) {
      alert(msg);
      return;
    }
    alertBox.className = '';
    alertBox.classList.add('alert', 'alert-' + type);
    alertBox.textContent = msg;
    alertBox.classList.remove('d-none');
    setTimeout(() => alertBox.classList.add('d-none'), 5000);
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      showAlert('danger', 'Please fix the errors and try again.');
      return;
    }

    const fd = new FormData(form);
    const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value);

    const entry = {
      id: 'c_' + Date.now(),
      name: fd.get('name') || '',
      email: fd.get('email') || '',
      phone: fd.get('phone') || '',
      contactMethod: fd.get('contactMethod') || 'email',
      subject: fd.get('subject') || '',
      course: fd.get('course') || '',
      interests,
      message: fd.get('message') || '',
      urgency: fd.get('urgency') || 'normal',
      subscribe: !!fd.get('subscribe'),
      createdAt: new Date().toISOString()
    };

    const existing = readStorage(KEYS.CONTACTS);
    existing.push(entry);
    writeStorage(KEYS.CONTACTS, existing);

    form.reset();
    form.classList.remove('was-validated');
    showAlert('success', 'Thanks — your message has been received. We will contact you soon.');
  });

  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    if (alertBox) alertBox.classList.add('d-none');
  });
}

/* =========================
   Registration handling (register.html)
   Expects #registerForm and #regMessage (optional)
   Saves user to KEYS.USERS (demo). Password is saved if provided.
   WARNING: In production, never store plain passwords in localStorage.
   ========================= */
function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  const messageBox = document.getElementById('regMessage');
  const pwd = document.getElementById('password');
  const confirmPwd = document.getElementById('confirmPassword');
  const toggleBtn = document.getElementById('togglePwd');
  const dobInput = document.getElementById('dob');

  // Max DOB to today (prevents future dates)
  if (dobInput) {
    const today = new Date().toISOString().split('T')[0];
    dobInput.setAttribute('max', today);
  }

  // Password toggle
  if (toggleBtn && pwd && confirmPwd) {
    toggleBtn.addEventListener('click', () => {
      const showing = pwd.type === 'text';
      pwd.type = showing ? 'password' : 'text';
      confirmPwd.type = showing ? 'password' : 'text';
      toggleBtn.textContent = showing ? 'Show' : 'Hide';
    });
  }

  function showMessage(type, msg) {
    if (!messageBox) {
      alert(msg);
      return;
    }
    messageBox.className = '';
    messageBox.classList.add('alert', 'alert-' + type);
    messageBox.textContent = msg;
    messageBox.classList.remove('d-none');
    setTimeout(() => messageBox.classList.add('d-none'), 5000);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      showMessage('danger', 'Please fix the errors and try again.');
      return;
    }

    // password match check
    if (pwd && confirmPwd && pwd.value !== confirmPwd.value) {
      confirmPwd.setCustomValidity('Passwords do not match');
      form.classList.add('was-validated');
      showMessage('danger', 'Passwords do not match. Please confirm your password.');
      setTimeout(() => confirmPwd.setCustomValidity(''), 2000);
      return;
    }

    const fd = new FormData(form);
    const preferred = Array.from(document.getElementById('preferred')?.selectedOptions || []).map(o => o.value);

    // Build user object (demo). NOTE: storing password in localStorage is insecure — this is only for demonstration.
    const userObj = {
      id: 'u_' + Date.now(),
      fullName: fd.get('fullName') || '',
      username: fd.get('username') || '',
      email: fd.get('email') || '',
      phone: fd.get('phone') || '',
      gender: fd.get('gender') || '',
      dob: fd.get('dob') || '',
      country: fd.get('country') || '',
      city: fd.get('city') || '',
      preferred,
      createdAt: new Date().toISOString()
    };
    // Optionally include password if provided (demo only)
    if (pwd && pwd.value) {
      userObj.password = pwd.value;
    }

    // Check duplicates by username or email
    const users = readStorage(KEYS.USERS);
    const dup = users.find(u => (u.username && u.username.toLowerCase() === userObj.username.toLowerCase()) || (u.email && u.email.toLowerCase() === userObj.email.toLowerCase()));
    if (dup) {
      showMessage('warning', 'Username or email already registered. Try logging in or choose different credentials.');
      return;
    }

    users.push(userObj);
    writeStorage(KEYS.USERS, users);

    form.reset();
    form.classList.remove('was-validated');
    showMessage('success', 'Registration successful! Redirecting to login...');
    setTimeout(() => window.location.href = 'login.html', 1100);
  });

  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    if (messageBox) messageBox.classList.add('d-none');
  });
}

/* =========================
   Login handling (login.html)
   Expects #loginForm, #loginAlert, #toggleLoginPwd, #guestBtn
   Uses KEYS.USERS to find user; creates a simple session in KEYS.SESSION
   ========================= */
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const identifierInput = document.getElementById('identifier');
  const pwdInput = document.getElementById('loginPassword');
  const togglePwdBtn = document.getElementById('toggleLoginPwd');
  const rememberCheckbox = document.getElementById('rememberMe');
  const alertBox = document.getElementById('loginAlert');
  const guestBtn = document.getElementById('guestBtn');

  if (togglePwdBtn && pwdInput) {
    togglePwdBtn.addEventListener('click', () => {
      const showing = pwdInput.type === 'text';
      pwdInput.type = showing ? 'password' : 'text';
      togglePwdBtn.textContent = showing ? 'Show' : 'Hide';
    });
  }

  // pre-fill remembered identifier if found
  const remembered = localStorage.getItem(KEYS.REMEMBER);
  if (remembered && identifierInput) {
    identifierInput.value = remembered;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  function showAlert(type, msg) {
    if (!alertBox) {
      alert(msg);
      return;
    }
    alertBox.className = '';
    alertBox.classList.add('alert', 'alert-' + type);
    alertBox.textContent = msg;
    alertBox.classList.remove('d-none');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!identifierInput || !identifierInput.value.trim()) {
      if (identifierInput) identifierInput.classList.add('is-invalid');
      showAlert('danger', 'Please enter your username or email.');
      return;
    } else {
      identifierInput.classList.remove('is-invalid');
    }

    const identifier = identifierInput.value.trim().toLowerCase();
    const password = pwdInput ? pwdInput.value : '';

    const users = readStorage(KEYS.USERS);
    const user = users.find(u =>
      (u.username && u.username.toLowerCase() === identifier) ||
      (u.email && u.email.toLowerCase() === identifier)
    );

    if (!user) {
      showAlert('danger', 'No account found with that username or email. Please register.');
      return;
    }

    // If user has stored password, validate it (demo simple compare)
    if (user.password) {
      if (!password) {
        showAlert('warning', 'This account requires a password. Please enter it.');
        return;
      }
      if (password !== user.password) {
        showAlert('danger', 'Incorrect password. Try again.');
        return;
      }
    } else {
      // Demo mode: no password stored — allow login but show message
      if (password) {
        showAlert('info', 'Demo account — password not stored. Signing in by matching username/email.');
        // continue
      } else {
        // proceed quietly
      }
    }

    // Remember me handling
    if (rememberCheckbox && rememberCheckbox.checked) {
      localStorage.setItem(KEYS.REMEMBER, identifier);
    } else {
      localStorage.removeItem(KEYS.REMEMBER);
    }

    // Create demo session and store
    const session = {
      id: 's_' + Date.now(),
      userId: user.id || user.username || user.email,
      username: user.username || '',
      email: user.email || '',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));

    showAlert('success', 'Login successful! Redirecting...');
    setTimeout(() => window.location.href = 'index.html', 800);
  });

  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      localStorage.removeItem(KEYS.SESSION);
      showAlert('info', 'Continuing as guest...');
      setTimeout(() => window.location.href = 'index.html', 700);
    });
  }
}

/* =========================
   Keyboard-only focus outline helper
   Adds class 'user-is-tabbing' to html when Tab is pressed
   ========================= */
function initKeyboardFocusOutline() {
  function handleFirstTab(e) {
    if (e.key === 'Tab') {
      document.documentElement.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
}
