// --- VARIABLES GLOBALES ---
let productosBaseDeDatos = [];
let carrito = [];
let descuentoCupon = 0;

// --- 1. CARGA DE PRODUCTOS ---
async function cargarProductos() {
    try {
        console.log("Intentando cargar productos...");
        const respuesta = await fetch('./inventario.json');
        
        if (!respuesta.ok) throw new Error("No se pudo encontrar el archivo inventario.json");

        productosBaseDeDatos = await respuesta.json();
        console.log("Productos cargados con éxito:", productosBaseDeDatos);
        
        // Ejecutamos las funciones según la página donde estemos
        if (document.querySelector('.showroom')) {
            mostrarProductos(productosBaseDeDatos);
        }
        
        if (document.getElementById('track-promos') || document.getElementById('track-temporada')) {
            cargarCarruseles();
        }

        if (document.getElementById('carouselTrack')) {
            cargarIndex();
        }

    } catch (error) {
        console.error("Error detallado:", error);
    }
}

// --- 2. MOSTRAR EN CATÁLOGO (categorias.html) ---
function mostrarProductos(lista) {
    const contenedor = document.querySelector('.showroom');
    if (!contenedor) return; 

    contenedor.innerHTML = ''; 
    lista.forEach(producto => {
        const precioFinal = producto.promo ? producto.precio_oferta : producto.precio;
        
        contenedor.innerHTML += `
            <div class="product-card reveal active">
                <div class="img-container">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                    <button class="add-to-cart-btn" onclick="agregarAlCarrito(${producto.id})">Añadir +</button>
                    ${producto.promo ? '<span class="tag-promo">SALE</span>' : ''}
                </div>
                <div class="product-info">
                    <h3>${producto.nombre}</h3>
                    <p class="color-text">${producto.color || ''}</p>
                    <span class="price">$${precioFinal.toLocaleString('es-AR')}</span>
                </div>
            </div>
        `;
    });
}

// --- 3. LÓGICA DEL CARRITO ---
const toggleCart = () => {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;

    drawer.classList.toggle('open');
    overlay.style.display = drawer.classList.contains('open') ? 'block' : 'none';
};

function agregarAlCarrito(id) {
    const producto = productosBaseDeDatos.find(p => p.id === id);
    if (producto) {
        carrito.push(producto);
        renderizarCarrito();
        const drawer = document.getElementById('cart-drawer');
        if (drawer && !drawer.classList.contains('open')) toggleCart();
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

function renderizarCarrito() {
    const container = document.getElementById('cart-items-container');
    const totalDisplay = document.getElementById('cart-total-display');
    const countDisplay = document.getElementById('cart-count');
    const radioMetodo = document.querySelector('input[name="payment"]:checked');
    
    if (!container || !totalDisplay || !countDisplay) return;

    const metodoPago = radioMetodo ? radioMetodo.value : 'efectivo';
    container.innerHTML = '';
    let subtotal = 0;

    countDisplay.innerText = carrito.length;

    carrito.forEach((item, index) => {
        const precioItem = item.promo ? item.precio_oferta : item.precio;
        subtotal += precioItem;

        container.innerHTML += `
            <div class="cart-item">
                <img src="${item.imagen}">
                <div>
                    <h4>${item.nombre}</h4>
                    <span>$${precioItem.toLocaleString('es-AR')}</span>
                    <button onclick="eliminarDelCarrito(${index})" class="btn-remove" style="color:red; background:none; border:none; cursor:pointer; font-size:9px; text-transform:uppercase;">[ Quitar ]</button>
                </div>
            </div>
        `;
    });

    let totalFinal = subtotal;
    if (descuentoCupon > 0) totalFinal *= (1 - descuentoCupon);
    if (metodoPago === 'efectivo') totalFinal *= 0.9;

    totalDisplay.innerText = `$${totalFinal.toLocaleString('es-AR')}`;
}

function aplicarCupon() {
    const codigo = prompt("Ingresá tu código de descuento:");
    if (codigo && codigo.toUpperCase() === "BIENVENIDA5") {
        descuentoCupon = 0.05;
        const msg = document.getElementById('coupon-applied-msg');
        const btn = document.getElementById('btn-cupon');
        if (msg) msg.style.display = 'block';
        if (btn) btn.style.display = 'none';
        renderizarCarrito();
    } else {
        alert("El código ingresado no es válido.");
    }
}

// --- 4. CARRUSELES E INDEX ---
function moveCarousel(trackId, direction) {
    const track = document.getElementById(trackId);
    if (!track) return;
    const cardWidth = track.querySelector('.product-card').clientWidth + 20;
    track.scrollLeft += (cardWidth * direction);
}

async function cargarCarruseles() {
    const trackPromos = document.getElementById('track-promos');
    const trackTemporada = document.getElementById('track-temporada');

    productosBaseDeDatos.forEach(p => {
        const cuotaValor = Math.round(p.precio / 3);
        const html = `
            <div class="product-card">
                <img src="${p.imagen}" alt="${p.nombre}">
                <div class="product-info" style="text-align:left;">
                    <p style="font-size:0.7rem; text-transform:uppercase;">${p.nombre}</p>
                    <div class="price-box">
                        <span class="old-price-carousel">$${p.precio.toLocaleString()}</span>
                        <span class="cuotas">3 cuotas de $${cuotaValor.toLocaleString()} sin interés</span>
                        <span class="price-transfer">$${(p.precio * 0.9).toLocaleString()} por Transferencia</span>
                    </div>
                    <button class="btn-comprar-mini" onclick="agregarAlCarrito(${p.id})">Comprar</button>
                </div>
            </div>
        `;
        if (p.promo && trackPromos) trackPromos.innerHTML += html;
        if (p.categorias && p.categorias.includes('invierno') && trackTemporada) trackTemporada.innerHTML += html;
    });
}

async function cargarIndex() {
    const track = document.getElementById('carouselTrack');
    if (!track) return;
    
    const tendencias = productosBaseDeDatos.filter(p => p.promo === true || p.id <= 4);
    tendencias.forEach(p => {
        track.innerHTML += `
            <div class="product-card">
                <div class="img-container">
                    <img src="${p.imagen}" alt="${p.nombre}">
                </div>
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <span class="price">$${p.precio.toLocaleString()}</span>
                </div>
            </div>
        `;
    });
}

// --- 5. EVENTOS Y LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    // Filtros
    document.querySelectorAll('.filter-item').forEach(boton => {
        boton.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const cat = e.target.getAttribute('data-categoria');
            if (cat === 'todos') mostrarProductos(productosBaseDeDatos);
            else mostrarProductos(productosBaseDeDatos.filter(p => p.categorias && p.categorias.includes(cat)));
        });
    });

    // Botones Carrito
    const btnCerrar = document.getElementById('close-cart');
    const overlay = document.getElementById('cart-overlay');
    const btnOpenNav = document.getElementById('open-cart-nav');
    const btnFinalizar = document.getElementById('btn-finalizar');

    if (btnCerrar) btnCerrar.onclick = toggleCart;
    if (overlay) overlay.onclick = toggleCart;
    if (btnOpenNav) btnOpenNav.onclick = (e) => { e.preventDefault(); toggleCart(); };
    
    if (btnFinalizar) {
        btnFinalizar.onclick = () => {
            if (carrito.length === 0) return alert("Tu carrito está vacío");
            const metodo = document.querySelector('input[name="payment"]:checked').value;
            const total = document.getElementById('cart-total-display').innerText;
            if (metodo === 'efectivo') alert(`¡Gracias! Pagarás ${total} en el showroom.`);
            else window.location.href = "https://www.mercadopago.com.ar/";
        };
    }

    // Métodos de pago
    document.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener('change', renderizarCarrito);
    });

    // Pop-up
    setTimeout(() => {
        const popup = document.getElementById('newsletter-popup');
        if(popup && !localStorage.getItem('popupShown')) {
            popup.style.display = 'flex';
        }
    }, 3000);

    const btnClosePopup = document.getElementById('close-popup');
    if (btnClosePopup) {
        btnClosePopup.onclick = () => {
            document.getElementById('newsletter-popup').style.display = 'none';
            localStorage.setItem('popupShown', 'true');
        };
    }
});