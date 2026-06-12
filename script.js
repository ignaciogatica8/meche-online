// --- VARIABLES GLOBALES ---
let productosBaseDeDatos = [];
let carrito = [];
let descuentoCupon = 0;

// ==========================================
// CONFIGURACIÓN DE CONEXIÓN CON AIRTABLE
// ==========================================
const PARTE1 = "patvZCAMG9UvTmMdq."; 
const PARTE2 = "6a48e658f1c90effda8a00aade6a2d432556692c448286dbe3ac61af93e5d6b0";

const AIRTABLE_TOKEN = PARTE1 + PARTE2; 
const AIRTABLE_BASE_ID = "appnJ7n0NqpRVeoud";
const AIRTABLE_TABLE_NAME = "stock"; 

// --- 1. CARGA DE PRODUCTOS DESDE AIRTABLE ---
async function cargarProductos() {
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        
        const respuesta = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!respuesta.ok) throw new Error(`Error: ${respuesta.status}`);

        const datos = await respuesta.json();
        
        productosBaseDeDatos = datos.records.map(record => {
            let catRaw = record.fields.Categoria;
            let categoriaPrincipal = "";
            let categoriasArray = [];

            if (Array.isArray(catRaw)) {
                categoriasArray = catRaw.map(c => String(c).toLowerCase().trim());
                categoriaPrincipal = categoriasArray[0] || "";
            } else if (typeof catRaw === 'string') {
                categoriasArray = catRaw.toLowerCase().split(',').map(c => c.trim());
                categoriaPrincipal = categoriasArray[0] || "";
            }

            let precioRegular = record.fields.Precio || 0;
            let precioOferta = record.fields['Precio Oferta'];
            if (precioOferta === undefined || precioOferta === null || precioOferta === "") {
                precioOferta = precioRegular;
            }

            return {
                id: record.fields.ID || record.id, 
                nombre: record.fields.Nombre || "Sin nombre",
                descripcion: record.fields.Descripcion || "Sin descripción adicional.",
                precio: precioRegular,
                precio_oferta: precioOferta, 
                categoria: categoriaPrincipal,
                categorias: categoriasArray,
                color: record.fields.Color || "",
                imagen: record.fields.Imagen || "",
                stock: record.fields.Stock, 
                promo: record.fields.Promo,
                temporada: record.fields.Temporada || false
            };
        });

        // Filtrar solo los que tienen stock
        productosBaseDeDatos = productosBaseDeDatos.filter(p => p.stock === true || p.stock > 0);
        
        // Ejecutar vistas
        if (document.querySelector('.showroom')) mostrarProductos(productosBaseDeDatos);
        if (document.getElementById('track-promos') || document.getElementById('track-temporada')) cargarCarruseles();

    } catch (error) {
        console.error("❌ Error al cargar Airtable:", error);
    }
}

// --- 2. MOSTRAR EN CATÁLOGO ---
function mostrarProductos(lista) {
    const contenedor = document.querySelector('.showroom');
    if (!contenedor) return; 

    contenedor.innerHTML = ''; 
    lista.forEach(producto => {
        const precioFinal = producto.precio_oferta < producto.precio ? producto.precio_oferta : producto.precio;
        
        // La imagen ya NO abre el modal. Ahora hay un botón "+ Info" abajo.
        contenedor.innerHTML += `
            <div class="product-card reveal active">
                <div class="img-container">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                    <button class="add-to-cart-btn" onclick="agregarAlCarrito('${producto.id}')">Añadir +</button>
                    ${producto.precio_oferta < producto.precio ? '<span class="tag-promo">SALE</span>' : ''}
                </div>
                <div class="product-info">
                    <h3>${producto.nombre}</h3>
                    <p class="color-text">${producto.color || ''}</p>
                    <span class="price">$${precioFinal.toLocaleString('es-AR')}</span>
                    <button class="btn-info" onclick="abrirModalProducto('${producto.id}')">+ INFO</button>
                </div>
            </div>
        `;
    });
}

// --- 3. LÓGICA DEL POP-UP (MODAL) ---
function abrirModalProducto(id) {
    const producto = productosBaseDeDatos.find(p => p.id == id);
    if(!producto) return;

    document.getElementById('modal-img').src = producto.imagen;
    document.getElementById('modal-title').innerText = producto.nombre;
    document.getElementById('modal-desc').innerText = producto.descripcion;
    
    const precioFinal = producto.precio_oferta < producto.precio ? producto.precio_oferta : producto.precio;
    let precioHTML = `$${precioFinal.toLocaleString('es-AR')}`;
    
    if (producto.precio_oferta < producto.precio) {
        precioHTML = `<span style="text-decoration: line-through; color: #999; font-size:1.1rem; margin-right:10px;">$${producto.precio.toLocaleString('es-AR')}</span> <span style="color:#d4a373;">$${precioFinal.toLocaleString('es-AR')}</span>`;
    }
    document.getElementById('modal-price').innerHTML = precioHTML;

    const stockEl = document.getElementById('modal-stock');
    if (producto.stock === true) {
        stockEl.innerText = "✓ Disponible en Stock";
        stockEl.className = "stock-status in-stock";
    } else if (producto.stock > 0) {
        stockEl.innerText = `✓ ${producto.stock} Disponibles`;
        stockEl.className = "stock-status in-stock";
    } else {
        stockEl.innerText = "✗ Sin Stock";
        stockEl.className = "stock-status out-stock";
    }

    const btnAdd = document.getElementById('modal-btn-add');
    btnAdd.onclick = () => {
        agregarAlCarrito(producto.id);
        cerrarModalProducto();
    };

    document.getElementById('product-modal').style.display = "flex";
}

function cerrarModalProducto() {
    document.getElementById('product-modal').style.display = "none";
}

document.addEventListener('click', function(event) {
    const modal = document.getElementById('product-modal');
    if (event.target === modal) cerrarModalProducto();
});

// --- 4. LÓGICA DEL CARRITO ---
const toggleCart = () => {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;

    drawer.classList.toggle('open');
    overlay.style.display = drawer.classList.contains('open') ? 'block' : 'none';
};

function agregarAlCarrito(id) {
    const producto = productosBaseDeDatos.find(p => p.id == id);
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
        const precioItem = item.precio_oferta < item.precio ? item.precio_oferta : item.precio;
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

// --- 5. CARRUSELES ---
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
        const precioFinal = p.precio_oferta < p.precio ? p.precio_oferta : p.precio;

        // Carrusel ahora tiene el botón + Info
        const html = `
            <div class="product-card reveal active" style="min-width: 280px; flex-shrink: 0; margin-right: 20px;">
                <div class="img-container">
                    <img src="${p.imagen}" alt="${p.nombre}">
                    <button class="add-to-cart-btn" onclick="agregarAlCarrito('${p.id}')">Añadir +</button>
                    ${p.precio_oferta < p.precio ? '<span class="tag-promo">SALE</span>' : ''}
                </div>
                <div class="product-info">
                    <h3>${p.nombre}</h3>
                    <p class="color-text">${p.color || ''}</p>
                    <span class="price">$${precioFinal.toLocaleString('es-AR')}</span>
                    <button class="btn-info" onclick="abrirModalProducto('${p.id}')">+ INFO</button>
                </div>
            </div>
        `;
        
        if (p.promo && trackPromos) trackPromos.innerHTML += html;
        if (p.temporada && trackTemporada) trackTemporada.innerHTML += html;
    });
}

// --- 6. EVENTOS Y LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    // Filtros de Categorías arreglados
    document.querySelectorAll('.filter-item').forEach(boton => {
        boton.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const cat = e.target.getAttribute('data-categoria');
            
            if (cat === 'todos') {
                mostrarProductos(productosBaseDeDatos);
            } else if (cat === 'promociones') {
                // Filtro especial para Promociones
                mostrarProductos(productosBaseDeDatos.filter(p => p.promo === true));
            } else {
                // Filtro para el resto (Pantalones, Vestidos, etc.)
                mostrarProductos(productosBaseDeDatos.filter(p => p.categoria === cat || p.categorias.includes(cat)));
            }
        });
    });

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

    document.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener('change', renderizarCarrito);
    });

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
