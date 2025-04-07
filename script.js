// ใช้ SweetAlert2 แทน alert/confirm และเพิ่มส่วน Dashboard
document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname;
    console.log('DOM Loaded. Path:', pathname);

    // ==================================================
    // หน้า Product Listing (/products)
    // ==================================================
    if (pathname.includes('/products')) {
        console.log('Running script for /products page');
        const productListDiv = document.getElementById('product-list');
        const navCartCountSpan = document.getElementById('nav-cart-count');

        // --- ฟังก์ชันอัปเดตตัวเลขบนไอคอนตะกร้า ---
        function updateNavCartCount(cartData) {
            if (!navCartCountSpan) {
                // console.warn('Nav cart count span not found.');
                return;
            }
            let totalItems = 0;
            // ลองจัดการทั้งสองรูปแบบข้อมูล cart ที่อาจได้รับ
            if (cartData && cartData.items && Array.isArray(cartData.items)) { // ถ้าได้ข้อมูลละเอียดจาก /api/cart
                totalItems = cartData.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            } else if (cartData && typeof cartData === 'object' && !Array.isArray(cartData)) { // ถ้าได้ข้อมูลดิบ {productId: qty} จาก API อื่น
                 totalItems = Object.values(cartData).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
            }
            console.log('[Products Page] Updating nav cart count:', totalItems);
            navCartCountSpan.textContent = totalItems;
            navCartCountSpan.style.display = totalItems > 0 ? 'inline-flex' : 'none';
        }

        // --- ฟังก์ชันสำหรับ Add to Cart (ใช้ SweetAlert2) ---
        function addToCart(productId) {
            console.log(`[Products Page] Adding product ID: ${productId}`);
            // แสดง loading ชั่วคราว (อาจจะ disable ปุ่ม)
            const button = productListDiv.querySelector(`.add-to-cart-btn[data-product-id="${productId}"]`);
            if (button) button.disabled = true;

            fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: productId })
            })
            .then(response => {
                if (!response.ok) {
                    // ลองอ่าน error จาก JSON ก่อน
                    return response.json().then(err => { throw new Error(err.error || `HTTP error! status: ${response.status}`); });
                }
                return response.json();
            })
            .then(data => {
                console.log('[Products Page] Add to Cart response:', data);
                Swal.fire({ // ใช้ SweetAlert2 แทน alert
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `เพิ่ม "${data.productName || 'สินค้า'}" แล้ว!`,
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });
                if (data.cart) updateNavCartCount(data.cart); // อัปเดตไอคอน
            })
            .catch(error => {
                console.error('[Products Page] Add to Cart error:', error);
                Swal.fire({ // ใช้ SweetAlert2 แทน alert
                    icon: 'error',
                    title: 'Oops...',
                    text: error.message || 'เกิดข้อผิดพลาดบางอย่าง',
                });
                if (error.message.includes('401')) setTimeout(() => window.location.href = '/', 2000); // ถ้า 401 กลับไป login
            })
            .finally(() => {
                 // เปิดปุ่มคืน ไม่ว่าจะสำเร็จหรือล้มเหลว
                 if (button) button.disabled = false;
            });
        }

        // --- ส่วนดึงข้อมูลสินค้า (ใส่ log เพิ่ม) ---
        if (productListDiv) {
            console.log('[Products Page] Found productListDiv. Fetching /api/products...');
            productListDiv.innerHTML = '<p id="loading-message" class="text-gray-500 col-span-full text-center py-8">กำลังโหลดสินค้า...</p>'; // แสดง Loading

            fetch('/api/products')
                .then(response => {
                    console.log('[Products Page] /api/products response status:', response.status);
                    if (!response.ok) {
                        if (response.status === 401) window.location.href = '/';
                        return response.text().then(text => {
                             let errorMsg = `HTTP error! status: ${response.status}`;
                             try { errorMsg = JSON.parse(text).error || errorMsg; } catch (e) {}
                             throw new Error(errorMsg);
                         });
                    }
                    return response.json();
                })
                .then(products => {
                    console.log('[Products Page] Received products data:', products); // <<< ดูข้อมูลตรงนี้
                    const loadingMsg = document.getElementById('loading-message');
                    if (loadingMsg) loadingMsg.remove();
                    productListDiv.innerHTML = ''; // เคลียร์ div

                    if (products && Array.isArray(products) && products.length > 0) {
                        console.log('[Products Page] Starting to display products...');
                        products.forEach(product => { // <<< วนลูปข้อมูลที่ได้
                            const card = document.createElement('div');
                            card.className = 'bg-white rounded shadow-md p-4 flex flex-col';
                            // !!! ตรวจสอบชื่อ property ที่ใช้ใน template ให้ตรงกับข้อมูลใน console log ข้างบน !!!
                            card.innerHTML = `
                                <img src="${product.image || 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=No+Image'}" alt="${product.name || 'N/A'}" class="w-full h-48 object-cover mb-4 rounded">
                                <h3 class="text-lg font-semibold mb-2 flex-grow">${product.name || 'Unnamed Product'}</h3>
                                <p class="text-gray-700 mb-4">ราคา: ${product.price !== undefined ? product.price : 'N/A'} บาท</p>
                                <button class="add-to-cart-btn mt-auto bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                        data-product-id="${product.id}"
                                        data-product-name="${product.name || 'สินค้า'}">
                                    หยิบใส่ตะกร้า
                                </button>
                            `;
                            // เพิ่มการป้องกัน ถ้า product.id ไม่มีค่า ปุ่มอาจจะทำงานผิดพลาด
                            if (!product.id) {
                                console.warn("Product missing ID:", product);
                                // อาจจะ disable ปุ่ม หรือไม่แสดงปุ่มเลย
                                const button = card.querySelector('.add-to-cart-btn');
                                if (button) button.disabled = true;
                            }
                            productListDiv.appendChild(card);
                        });
                        console.log('[Products Page] Finished displaying products.');

                        // ใช้ Event Delegation สำหรับปุ่ม Add to Cart
                        productListDiv.addEventListener('click', function handleProductClick(event) {
                            if (event.target.classList.contains('add-to-cart-btn') && !event.target.disabled) {
                                addToCart(event.target.dataset.productId);
                            }
                        });

                    } else {
                        console.log('[Products Page] No products found or empty array.');
                        productListDiv.innerHTML = '<p class="text-gray-500 text-center py-8">ยังไม่มีสินค้าในร้านเลยเพื่อน</p>';
                    }
                })
                .catch(error => {
                    console.error('[Products Page] Fetch products error:', error);
                    const loadingMsg = document.getElementById('loading-message');
                    if (loadingMsg) loadingMsg.remove();
                    if (productListDiv) productListDiv.innerHTML = `<p class="text-red-500 text-center py-8">เกิดข้อผิดพลาดในการโหลดสินค้า: ${error.message}</p>`;
                });
        } else {
             console.warn('[Products Page] Element with ID "product-list" not found!');
        }

        // --- โหลดข้อมูลตะกร้าครั้งแรกเพื่ออัปเดตไอคอน ---
        console.log('[Products Page] Fetching initial cart for nav icon...');
        fetch('/api/cart')
            .then(response => {
                console.log('[Products Page] /api/cart (for nav) response status:', response.status);
                return response.ok ? response.json() : Promise.resolve(null);
            })
            .then(cartData => {
                console.log('[Products Page] Received initial cart data for nav:', cartData);
                updateNavCartCount(cartData);
            })
            .catch(error => {
                console.error('[Products Page] Error fetching initial cart for nav icon:', error);
                updateNavCartCount(null);
            });

    } // จบ if (pathname.includes('/products'))

    // ==================================================
    // หน้า Shopping Cart (/cart)
    // ==================================================
    else if (pathname.includes('/cart')) {
        console.log('Running script for /cart page');
        const cartItemsContainer = document.getElementById('cart-items-container');
        const totalPriceSpan = document.getElementById('total-price');
        const checkoutButton = document.getElementById('checkout-button');

        function loadAndDisplayCart() {
             if (!cartItemsContainer) { console.error('Cart container not found'); return; }
             cartItemsContainer.innerHTML = '<p id="loading-cart-message" class="text-gray-500 text-center py-8">กำลังโหลดตะกร้า...</p>';
             if (totalPriceSpan) totalPriceSpan.textContent = '...';
             if (checkoutButton) checkoutButton.disabled = true;
             fetch('/api/cart')
                 .then(res => {
                     if (!res.ok) {
                         if (res.status === 401) window.location.href = '/';
                         throw new Error(`HTTP error! status: ${res.status}`);
                     } return res.json();
                 })
                 .then(displayCart)
                 .catch(error => {
                     console.error('Fetch cart error:', error);
                     Swal.fire({ icon: 'error', title: 'โหลดตะกร้าไม่ได้', text: error.message });
                     if (cartItemsContainer) cartItemsContainer.innerHTML = `<p class="text-red-500 text-center py-8">Error: ${error.message}</p>`;
                 });
        }
        function displayCart(cartData) {
            if (!cartItemsContainer || !totalPriceSpan || !checkoutButton) return;
            const loadingMsg = document.getElementById('loading-cart-message');
            if (loadingMsg) loadingMsg.remove();
            cartItemsContainer.innerHTML = '';
            if (cartData && cartData.items && cartData.items.length > 0) {
                cartData.items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'flex items-center border-b border-gray-200 py-4 cart-item';
                    itemDiv.dataset.productId = item.id;
                    itemDiv.innerHTML = `
                        <img src="${item.image || 'https://via.placeholder.com/80/CCCCCC/FFFFFF?text=N/A'}" alt="${item.name || 'N/A'}" class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded mr-4 flex-shrink-0">
                        <div class="flex-grow mr-4">
                            <h3 class="text-md sm:text-lg font-semibold">${item.name || 'Unnamed'}</h3>
                            <p class="text-sm text-gray-600">ราคา: ${item.price !== undefined ? item.price : 'N/A'} บาท</p>
                        </div>
                        <div class="flex items-center justify-center mx-2 sm:mx-4">
                            <button class="quantity-change-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded-l ${item.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}" data-product-id="${item.id}" data-change="-1" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <input type="number" value="${item.quantity}" min="1" class="quantity-input w-12 border-t border-b border-gray-300 text-center mx-0 appearance-none" data-product-id="${item.id}" data-old-value="${item.quantity}">
                            <button class="quantity-change-btn bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded-r" data-product-id="${item.id}" data-change="+1">+</button>
                        </div>
                        <div class="text-right mx-2 sm:mx-4 min-w-[80px] sm:min-w-[100px]">
                             <p class="text-xs sm:text-sm font-medium text-gray-500 mb-1">รวม</p>
                             <p class="text-md sm:text-lg font-semibold">${item.itemTotalPrice !== undefined ? item.itemTotalPrice : 'N/A'} บาท</p>
                        </div>
                        <button class="remove-from-cart-btn text-red-500 hover:text-red-700 ml-2 sm:ml-4 p-1" title="ลบ ${item.name || 'สินค้านี้'}" data-product-id="${item.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    `;
                    cartItemsContainer.appendChild(itemDiv);
                });
                totalPriceSpan.textContent = cartData.totalPrice !== undefined ? cartData.totalPrice : 'N/A';
                checkoutButton.disabled = false;
                checkoutButton.onclick = () => { window.location.href = '/checkout'; };
            } else {
                cartItemsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">ตะกร้าสินค้าของคุณว่างเปล่า ไปเลือกซื้อของกัน!</p>';
                totalPriceSpan.textContent = '0';
                checkoutButton.disabled = true;
                checkoutButton.onclick = null;
            }
        }
        function removeFromCart(productId) {
            console.log(`Removing ID: ${productId}`);
            fetch('/api/cart/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
            .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); }))
            .then(data => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message || 'ลบสินค้าแล้ว', showConfirmButton: false, timer: 1500 });
                loadAndDisplayCart();
            })
            .catch(error => {
                Swal.fire({ icon: 'error', title: 'ลบไม่ได้', text: error.message });
                loadAndDisplayCart();
                if (error.message.includes('401')) setTimeout(() => window.location.href = '/', 2000);
            });
        }
        function updateCartQuantity(productId, newQuantity) {
             console.log(`Updating ID: ${productId} Qty: ${newQuantity}`);
             const qtyNum = parseInt(newQuantity);
             if (isNaN(qtyNum) || qtyNum < 0) { loadAndDisplayCart(); return; }
             if (qtyNum === 0) {
                 Swal.fire({ title: 'ลบสินค้า?', text: 'จำนวนเป็น 0 ต้องการลบสินค้านี้หรือไม่?', icon: 'question', showCancelButton: true, confirmButtonText: 'ใช่, ลบ', cancelButtonText: 'ไม่' })
                     .then(result => { if (result.isConfirmed) removeFromCart(productId); else loadAndDisplayCart(); });
                 return;
             }
             fetch('/api/cart/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, quantity: qtyNum }) })
             .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); }))
             .then(data => { loadAndDisplayCart(); })
             .catch(error => {
                 Swal.fire({ icon: 'error', title: 'อัปเดตไม่ได้', text: error.message });
                 loadAndDisplayCart();
                 if (error.message.includes('401')) setTimeout(() => window.location.href = '/', 2000);
             });
        }

        if (cartItemsContainer) { // Event Delegation
            cartItemsContainer.addEventListener('click', (event) => {
                const removeBtn = event.target.closest('.remove-from-cart-btn');
                if (removeBtn) {
                    const productId = removeBtn.dataset.productId;
                    Swal.fire({ title: 'แน่ใจนะ?', text: `ต้องการลบ ${removeBtn.title.replace('ลบ ','')}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก' })
                        .then(result => { if (result.isConfirmed) removeFromCart(productId); });
                    return;
                }
                const changeBtn = event.target.closest('.quantity-change-btn');
                if (changeBtn) {
                    const productId = changeBtn.dataset.productId;
                    const change = parseInt(changeBtn.dataset.change);
                    const input = cartItemsContainer.querySelector(`.quantity-input[data-product-id="${productId}"]`);
                    if (input) {
                        const currentQty = parseInt(input.value);
                        const newQty = currentQty + change;
                        input.value = Math.max(0, newQty); // Update UI temp
                        updateCartQuantity(productId, newQty);
                    }
                    return;
                }
            });
            cartItemsContainer.addEventListener('change', (event) => {
                 const input = event.target.closest('.quantity-input');
                 if (input) {
                     const productId = input.dataset.productId;
                     const oldValue = input.dataset.oldValue;
                     if (input.value !== oldValue) updateCartQuantity(productId, input.value);
                 }
            });
        }
        loadAndDisplayCart(); // Initial load
    }

    // ==================================================
    // หน้า Checkout (/checkout)
    // ==================================================
    else if (pathname.includes('/checkout')) {
        console.log('Running script for /checkout page');
        const itemListDiv = document.getElementById('checkout-item-list');
        const totalPriceSpan = document.getElementById('checkout-total-price');
        const confirmButton = document.getElementById('confirm-order-button');

        function displayCheckoutSummary(cartData) {
             if (!itemListDiv || !totalPriceSpan || !confirmButton) { console.error('Checkout elements missing'); return; }
             const loadingMsg = document.getElementById('loading-checkout-message');
             if (loadingMsg) loadingMsg.remove();
             itemListDiv.innerHTML = '';
             if (cartData && cartData.items && cartData.items.length > 0) {
                 cartData.items.forEach(item => {
                     const itemDiv = document.createElement('div');
                     itemDiv.className = 'flex justify-between items-center py-2 border-b border-gray-100';
                     itemDiv.innerHTML = `
                         <span class="text-gray-700">${item.name || 'Unnamed'} x ${item.quantity}</span>
                         <span class="font-semibold">${item.itemTotalPrice !== undefined ? item.itemTotalPrice : 'N/A'} บาท</span>`;
                     itemListDiv.appendChild(itemDiv);
                 });
                 totalPriceSpan.textContent = cartData.totalPrice !== undefined ? cartData.totalPrice : 'N/A';
                 confirmButton.disabled = false;
             } else {
                 itemListDiv.innerHTML = '<p class="text-red-500 text-center py-4">ตะกร้าสินค้าว่างเปล่า</p>';
                 totalPriceSpan.textContent = '0';
                 confirmButton.disabled = true;
                 setTimeout(() => { window.location.href = '/cart'; }, 2000);
             }
        }
        function confirmOrder() {
            if (!confirmButton) return;
            console.log('Confirming order...');
            confirmButton.disabled = true; confirmButton.textContent = 'กำลังดำเนินการ...';
            fetch('/checkout/complete', { method: 'POST' })
            .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error || `HTTP ${res.status}`); }))
            .then(data => { window.location.href = '/order-success'; }) // Redirect on success
            .catch(error => {
                Swal.fire({ icon: 'error', title: 'ยืนยันไม่ได้', text: error.message });
                confirmButton.disabled = false; confirmButton.textContent = 'ยืนยันการสั่งซื้อ';
                if (error.message.includes('401')) setTimeout(() => window.location.href = '/', 2000);
            });
        }

        if (itemListDiv) {
            itemListDiv.innerHTML = '<p id="loading-checkout-message" class="text-gray-500">กำลังโหลดสรุปรายการ...</p>';
            fetch('/api/cart')
                .then(res => {
                    if (!res.ok) {
                        if (res.status === 401) window.location.href = '/';
                        if (res.status === 400 || res.status === 404) window.location.href = '/cart';
                        throw new Error(`HTTP ${res.status}`);
                    } return res.json();
                })
                .then(displayCheckoutSummary)
                .catch(error => {
                    console.error('Load checkout summary error:', error);
                    Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่ได้', text: error.message });
                    if(itemListDiv) itemListDiv.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
                });
        }
        if (confirmButton) confirmButton.addEventListener('click', confirmOrder);
    }

     // ==================================================
    // หน้า Dashboard (/dashboard)
    // ==================================================
    else if (pathname.includes('/dashboard') || pathname === '/') {
        console.log('Running script for /dashboard page');
        const usernamePlaceholder = document.getElementById('username-placeholder');
        const navCartCountSpan = document.getElementById('nav-cart-count');

         function updateNavCartCount(cartData) { /* ... (เหมือนเดิม) ... */
             if (!navCartCountSpan) return;
             let totalItems = 0;
             if (cartData && cartData.items) { totalItems = cartData.items.reduce((s, i) => s + i.quantity, 0); }
             else if (cartData && typeof cartData === 'object') { totalItems = Object.values(cartData).reduce((s, q) => s + (parseInt(q) || 0), 0); }
             navCartCountSpan.textContent = totalItems;
             navCartCountSpan.style.display = totalItems > 0 ? 'inline-flex' : 'none';
         }

        if (usernamePlaceholder) {
            fetch('/api/user/me')
                .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
                .then(userData => { usernamePlaceholder.textContent = userData.username || 'ผู้ใช้'; })
                .catch(error => { usernamePlaceholder.textContent = 'Error'; console.error('Fetch user error:', error); });
        }
        fetch('/api/cart').then(res => res.ok ? res.json() : null).then(updateNavCartCount).catch(() => updateNavCartCount(null));
    }

}); // จบ DOMContentLoaded