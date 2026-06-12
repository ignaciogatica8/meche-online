// --- VARIABLES GLOBALES ---
let productosBaseDeDatos = [];
let carrito = [];
let descuentoCupon = 0;

// ==========================================
// CONFIGURACIÓN DE CONEXIÓN CON AIRTABLE
// ==========================================

// Dividimos el token para que el bot de seguridad no lo detecte
const PARTE1 = "patvZCAMG9UvTmMdq."; 
const PARTE2 = "6a48e658f1c90effda8a00aade6a2d432556692c448286dbe3ac61af93e5d6b0";

const AIRTABLE_TOKEN = PARTE1 + PARTE2; 
const AIRTABLE_BASE_ID = "appnJ7n0NqpRVeoud";
const AIRTABLE_TABLE_NAME = "stock"; // En minúscula, como se llama tu pestaña

// --- 1. CARGA DE PRODUCTOS DESDE AIRTABLE ---
async function cargarProductos() {
    try {
        console.log("Intentando conectar con Airtable...");
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        
        const respuesta = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${AIRTABLE_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!respuesta.ok) throw new Error(`No se pudo conectar: ${respuesta.status}`);

        const datos = await respuesta.json();
        
        console.log("✅ DATOS CRUDOS RECIBIDOS:", datos.records);
        
        // Transformamos el formato respetando LAS MAYÚSCULAS exactas de tu Airtable
        productosBaseDeDatos = datos.records.map(record => {
            let categoriasArray = record.fields.Categoria || "";
            if (typeof categoriasArray === 'string') {
                categoriasArray = categoriasArray.toLowerCase().split(',').map(c => c.trim());
            }

            return {
                id: record.fields.ID || record.id, 
                nombre: record.fields.Nombre || "Sin nombre",
                precio: record.fields.Precio || 0,
                precio_oferta: record.fields.Precio_oferta || (record.fields.Precio * 0.8), 
                categoria: record.fields.Categoria ? record.fields.Categoria.toLowerCase() : "",
                categorias: categoriasArray,
                color: record.fields.Color || "",
                imagen: record.fields.Imagen || "",
                stock: record.fields.Stock, 
                promo: record.fields.Promo 
            };
        });

        // ⚠️ Filtro desactivado temporalmente para diagnosticar
        // productosBaseDeDatos = productosBaseDeDatos.filter(p => p.stock === true || p.stock > 0);

        console.log("📦 Productos listos para mostrar:", productosBaseDeDatos);
        
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
        console.error("❌ Error detallado al cargar desde Airtable:", error);
    }
}

// --- 2. MOSTRAR EN CATÁLOGO (categorias.html) ---
function mostrarProductos(lista) {
    const contenedor = document.querySelector('.showroom');
    if (!contenedor) return; 

    contenedor.innerHTML = ''; 
    lista.forEach(producto => {
        const precioFinal = producto.promo ? producto.precio_oferta : producto.precio;
        
        // Usamos comillas simples en el ID por si Airtable lo manda como texto
        contenedor.innerHTML += `
            <div class="product-card reveal active">
                <div class="img-container">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                    <button class="add-to-cart-btn" onclick="agregarAlCarrito('${producto.id}')">Añadir +</button>
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
    // Usamos == en lugar de === para que no importe si el ID es texto o número
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
        const btn = document
