(function () {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  const currentPath = window.location.pathname;
  const token = localStorage.getItem('admin_token');

  function updateNavigation() {
    const navItems = document.getElementById('navLinks');
    const footerItems = document.getElementById('footerLinks');
    let links = `<a href="/">Home</a><a href="/products.html">Collection</a>`;
    if (token) {
      links += `<a href="/orders.html">Orders</a><a href="/admin.html">Studio</a><a href="#" id="logoutLink">Logout</a>`;
    } else {
      links += `<a href="/admin-login.html">Login</a>`;
    }
    if (navItems) navItems.innerHTML = links;
    if (footerItems) footerItems.innerHTML = links;

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
      logoutLink.onclick = (e) => {
        e.preventDefault();
        localStorage.removeItem('admin_token');
        window.location.href = '/';
      };
    }
  }
  updateNavigation();

  function initCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    const closeBtn = document.getElementById('cartClose');
    const checkoutBtn = document.getElementById('drawerCheckoutBtn');

    const toggle = (force) => {
      const isOpen = force !== undefined ? force : !drawer.classList.contains('open');
      drawer.classList.toggle('open', isOpen);
      overlay.classList.toggle('open', isOpen);
      if (isOpen) renderCartDrawer();
    };

    if (closeBtn) closeBtn.onclick = () => toggle(false);
    if (overlay) overlay.onclick = () => toggle(false);
    if (checkoutBtn) checkoutBtn.onclick = handleCheckout;

    window.toggleCartDrawer = toggle;
    renderCartDrawer();
  }

  function renderCartDrawer() {
    const content = document.getElementById('cartDrawerContent');
    const totalEl = document.getElementById('cartDrawerTotal');
    if (!content) return;

    const cart = JSON.parse(localStorage.getItem('moon_cart') || '[]');
    if (cart.length === 0) {
      content.innerHTML = '<p style="text-align: center; color: var(--color-gray-400); margin-top: 40px;">Your cart is empty.</p>';
      if (totalEl) totalEl.textContent = '$0.00';
      return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
      total += item.price * item.quantity;
      html += `
        <div class="cart-item">
          <div class="cart-item-image">
            <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" onerror="this.src='https://via.placeholder.com/80x100?text=${escapeHtml(item.name)}'">
          </div>
          <div class="cart-item-info">
            <h4>${escapeHtml(item.name)}</h4>
            <p>$${Number(item.price).toFixed(2)}</p>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="updateCartQty('${item.productId}', -1)">-</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartQty('${item.productId}', 1)">+</button>
            </div>
          </div>
          <button style="color: var(--color-error); font-size: 0.75rem; cursor: pointer;" onclick="updateCartQty('${item.productId}', -999)">Remove</button>
        </div>
      `;
    });

    content.innerHTML = html;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  }

  window.updateCartQty = (productId, change) => {
    let cart = JSON.parse(localStorage.getItem('moon_cart') || '[]');
    const item = cart.find(i => i.productId === productId);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.productId !== productId);
      }
    }
    localStorage.setItem('moon_cart', JSON.stringify(cart));
    renderCartDrawer();
  };



  function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('moon_cart') || '[]');
    const existing = cart.find(item => item.productId === product._id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: product._id, quantity: 1, name: product.name, price: product.price, imageUrl: product.imageUrl });
    }
    localStorage.setItem('moon_cart', JSON.stringify(cart));
    window.toggleCartDrawer(true);
  }

  function initHomePage() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.slide-up').forEach((el) => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  function initProductsPage() {
    const productsGrid = document.getElementById('productsGrid');
    const searchInput = document.getElementById('searchInput');
    const emptyState = document.getElementById('emptyState');
    let allProducts = [];
    const fetchProducts = () => {
      if (!productsGrid) return;
      
      productsGrid.innerHTML = generateSkeletons(6);

      fetch('/api/products')
        .then(res => {
          if (!res.ok) throw new Error('API unreachable');
          return res.json();
        })
        .then(products => {
          allProducts = products;
          renderProducts(allProducts);
        })
        .catch(err => {
          console.error('Catalog Fetch Fail:', err);
          productsGrid.innerHTML = '';
          emptyState.style.display = 'block';
        });
    };
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = allProducts.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        );
        renderProducts(filtered);
      });
    }
    const renderProducts = (products) => {
      if (!productsGrid) return;
      if (products.length === 0) {
        productsGrid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }
      emptyState.style.display = 'none';
      productsGrid.innerHTML = '';
      products.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'card fade-in';
        card.style.animationDelay = (index * 0.05) + 's';
        card.innerHTML = `
          <div class="card-image">
            <img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy">
          </div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(product.name)}</h3>
            <p class="card-description">${escapeHtml(product.description)}</p>
            <div class="card-footer">
              <span class="card-price">$${Number(product.price).toFixed(2)}</span>
              <span class="card-action">View <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
            </div>
          </div>`;
        card.onclick = () => window.location.href = `/product.html?id=${product._id}`;
        productsGrid.appendChild(card);
      });
    };
    fetchProducts();
  }

  function initProductDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (!productId) return window.location.href = '/products.html';
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(product => {
        const nameEl = document.getElementById('productName');
        const priceEl = document.getElementById('productPrice');
        const descEl = document.getElementById('productDescription');
        const imgEl = document.getElementById('productImage');
        if (nameEl) nameEl.textContent = product.name;
        if (priceEl) priceEl.textContent = `$${Number(product.price).toFixed(2)}`;
        if (descEl) descEl.textContent = product.description;
        if (imgEl) imgEl.innerHTML = `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}">`;
        const buyButton = document.getElementById('buyButton');
        if (buyButton) {
          buyButton.disabled = false;
          buyButton.onclick = () => addToCart(product);
        }
      });
  }

  function initAdminLoginPage() {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;
    form.onsubmit = (e) => {
      e.preventDefault();
      const username = document.getElementById('adminUsername').value;
      const password = document.getElementById('adminPassword').value;
      fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
          window.location.href = '/admin.html';
        } else {
          alert('Invalid credentials');
        }
      });
    };
  }

  function initAdminPage() {
    if (!token) return window.location.href = '/admin-login.html';
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin-login.html';
      };
    }
    const form = document.getElementById('productForm');
    if (!form) return;
    form.onsubmit = (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('name', document.getElementById('productNameInput').value);
      formData.append('description', document.getElementById('productDescInput').value);
      formData.append('price', document.getElementById('productPriceInput').value);
      formData.append('image', document.getElementById('productImgInput').files[0]);
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Authorization': token },
        body: formData
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        alert('Product added successfully');
        form.reset();
      })
      .catch(() => alert('Failed to add product.'));
    };
  }

  function initOrdersPage() {
    if (!token) return window.location.href = '/admin-login.html';
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      alert('Payment successful! Your order has been placed.');
    }
    const ordersBody = document.getElementById('ordersBody');
    const tableWrapper = document.getElementById('ordersTableWrapper');
    const emptyState = document.getElementById('ordersEmpty');
    fetch('/api/orders', {
      headers: { 'Authorization': token }
    })
      .then(res => res.json())
      .then(orders => {
        if (!orders || orders.length === 0) {
          if (tableWrapper) tableWrapper.style.display = 'none';
          if (emptyState) emptyState.style.display = 'block';
          return;
        }
        if (emptyState) emptyState.style.display = 'none';
        if (ordersBody) {
          ordersBody.innerHTML = '';
          orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>#${order._id.slice(-6).toUpperCase()}</td>
              <td>${order.items.length} items</td>
              <td>$${Number(order.amount).toFixed(2)}</td>
              <td><span class="status-badge status-badge--${order.status.toLowerCase()}">${order.status}</span></td>
              <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            `;
            ordersBody.appendChild(row);
          });
        }
      });
  }

  function generateSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<div class="card"><div class="card-image"><div class="loading-skeleton" style="height:100%"></div></div><div class="card-body"><div class="loading-skeleton" style="height:20px; width:60%"></div></div></div>`;
    }
    return html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  let audioCtx;
  function playAppSound(type) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'add-to-cart') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'checkout') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('button, a, .card')) playAppSound('click');
  });

  initCartDrawer();
  if (currentPath === '/' || currentPath === '/index.html') initHomePage();
  else if (currentPath === '/products.html') initProductsPage();
  else if (currentPath === '/product.html') initProductDetailPage();
  else if (currentPath === '/checkout.html') {
    initCheckoutPage();
    playAppSound('checkout');
  }
  else if (currentPath === '/admin-login.html') initAdminLoginPage();
  else if (currentPath === '/admin.html') initAdminPage();
  else if (currentPath === '/orders.html') initOrdersPage();

  function initCheckoutPage() {
    const itemsEl = document.getElementById('checkoutItems');
    const totalEl = document.getElementById('checkoutTotal');
    const paypalBtn = document.getElementById('paypalButton');
    if (!itemsEl || !totalEl) return;

    const cart = JSON.parse(localStorage.getItem('moon_cart') || '[]');
    if (cart.length === 0) {
      window.location.href = '/products.html';
      return;
    }

    let html = '';
    let total = 0;
    cart.forEach(item => {
      total += item.price * item.quantity;
      html += `
        <div style="display: flex; gap: 20px; border-bottom: 1px solid var(--color-gray-100); padding: 20px 0;">
          <div style="width: 80px; height: 100px; background: var(--color-off-white);">
            <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="flex: 1;">
            <h4 style="font-size: 1rem; font-weight: 600;">${escapeHtml(item.name)}</h4>
            <p style="color: var(--color-gray-400); font-size: 0.875rem;">Qty: ${item.quantity}</p>
          </div>
          <div style="font-weight: 600;">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      `;
    });
    itemsEl.innerHTML = html;
    totalEl.textContent = `$${total.toFixed(2)}`;

    if (paypalBtn) {
      paypalBtn.onclick = handleCheckout;
    }
  }

  function handleCheckout() {
    const cart = JSON.parse(localStorage.getItem('moon_cart') || '[]');
    if (cart.length === 0) return;
    
    if (window.location.pathname !== '/checkout.html') {
      window.location.href = '/checkout.html';
      return;
    }

    const payload = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    };

    // Handing off to the PayPal API to generate a checkout session
    fetch('/api/pay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok && data.approvalUrl) {
        // Clear cart local state once we've successfully initiated the payment
        localStorage.removeItem('moon_cart');
        window.location.href = data.approvalUrl;
      } else {
        throw new Error(data.error || 'The payment gateway is currently busy');
      }
    })
    .catch(err => {
      console.error('[Checkout] Handshake error:', err.message);
      alert('We had trouble reaching the checkout studio. Please try again or contact us.');
    });
  }

  const originalAddToCart = addToCart;
  addToCart = function(product) {
    playAppSound('add-to-cart');
    originalAddToCart(product);
  };
})();
