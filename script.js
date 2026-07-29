/* ==========================================================================
   1. VARIABLES GLOBALES Y CAPTURA DEL DOM
   ========================================================================== */
let tarifasRCS = null; 

const categoriaSelect = document.getElementById('categoria');
const productoSelect = document.getElementById('tipo-producto');
const cantidadInput = document.getElementById('cantidad');
const pantallaPrecio = document.getElementById('pantalla-precio');

/* ==========================================================================
   2. CARGA ASÍNCRONA DE DATOS (FETCH) Y POBLADO DE CATEGORÍAS
   ========================================================================== */
async function cargarTarifas() {
    try {
        const respuesta = await fetch('precios.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar el JSON");

        tarifasRCS = await respuesta.json();

        // Llenar el selector de Categorías dinámicamente
        poblarCategorias();

        // Intentar restaurar datos previos de localStorage
        restaurarDatosGuardados();

    } catch (error) {
        console.error('Error al obtener el catálogo:', error);
        pantallaPrecio.innerHTML = `
            <p style="color: #d90429; font-weight: 600;">
                ❌ No se pudieron cargar los productos. Por favor intenta recargar.
            </p>
        `;
    }
}

function poblarCategorias() {
    categoriaSelect.innerHTML = '<option value="">-- Selecciona Categoría --</option>';

    // Iteramos sobre las llaves del JSON (tazas, polos)
    for (const keyCat in tarifasRCS) {
        const option = document.createElement('option');
        option.value = keyCat;
        option.textContent = tarifasRCS[keyCat].nombre;
        categoriaSelect.appendChild(option);
    }
}

function actualizarProductos() {
    const catSeleccionada = categoriaSelect.value;
    productoSelect.innerHTML = '<option value="">-- Selecciona Modelo --</option>';

    if (!catSeleccionada || !tarifasRCS[catSeleccionada]) {
        productoSelect.disabled = true;
        calcularEnTiempoReal();
        return;
    }

    productoSelect.disabled = false;
    const productos = tarifasRCS[catSeleccionada].productos;

    for (const keyProd in productos) {
        const option = document.createElement('option');
        option.value = keyProd;
        option.textContent = productos[keyProd].nombre;
        productoSelect.appendChild(option);
    }

    calcularEnTiempoReal();
}

/* ==========================================================================
   3. FUNCIÓN REUTILIZABLE DE CÁLCULO Y WHATSAPP
   ========================================================================== */
function calcularEnTiempoReal() {
    if (!tarifasRCS) return;

    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;
    const cantidad = parseInt(cantidadInput.value);

    // Guardar estado en localStorage
    if (catKey) localStorage.setItem('rcs_categoria', catKey);
    if (prodKey) localStorage.setItem('rcs_producto', prodKey);
    if (!isNaN(cantidad)) localStorage.setItem('rcs_cantidad', cantidad);

    // Validación
    if (!catKey || !prodKey || isNaN(cantidad) || cantidad < 1) {
        pantallaPrecio.innerHTML = `
            <p style="color: #2d6a4f; font-weight: 600; margin-bottom: 0;">
                Selecciona la categoría, modelo y cantidad para ver el cálculo.
            </p>
        `;
        return;
    }

    // Extraer datos del producto seleccionado
    const datosProducto = tarifasRCS[catKey].productos[prodKey];
    const escalasPrecios = datosProducto.precios;

    let precioUnitario = 0;
    if (cantidad >= 100) {
        precioUnitario = escalasPrecios.ciento;
    } else if (cantidad >= 24) {
        precioUnitario = escalasPrecios.docenas;
    } else {
        precioUnitario = escalasPrecios.unidad;
    }

    const total = cantidad * precioUnitario;

    // Mensaje para WhatsApp
    const telefonoRCS = "51959562867"; // Tu número real aquí
    const nombreCat = tarifasRCS[catKey].nombre;
    const nombreProd = datosProducto.nombre;

    const mensajeTexto = 
        `✨ *¡NUEVA COTIZACIÓN DESDE LA WEB!* ✨\n\n` +
        `👋 Hola *RCS Merchandising*, me gustaría coordinar el siguiente pedido:\n\n` +
        `🎨 *DETALLES DEL PRODUCTO*\n` +
        `📁 *Categoría:* ${nombreCat}\n` +
        `🛍️ *Modelo:* ${nombreProd}\n` +
        `📦 *Cantidad:* ${cantidad} unidades\n` +
        `🏷️ *Precio Unitario:* S/ ${precioUnitario.toFixed(2)}\n\n` +
        `💳 *RESUMEN DE PAGO*\n` +
        `💰 *Total Estimado:* S/ ${total.toFixed(2)}\n\n` +
        `🚀 ¿Cuáles son los pasos para realizar el abono y el tiempo estimado de entrega? ¡Quedo atento! 🙌`;

    const mensajeCodificado = encodeURIComponent(mensajeTexto);
    const urlWhatsApp = `https://wa.me/${telefonoRCS}?text=${mensajeCodificado}`;

    pantallaPrecio.innerHTML = `
        <div style="animation: fadeIn 0.3s ease;">
            <h3 style="color: #2d6a4f; margin-bottom: 15px; font-size: 1.2rem;">¡Cotización al Instante!</h3>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Categoría:</strong> ${nombreCat}
            </p>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Modelo:</strong> ${nombreProd}
            </p>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Cantidad solicitada:</strong> ${cantidad} unidades
            </p>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Precio Unitario:</strong> S/ ${precioUnitario.toFixed(2)}
            </p>
            <hr style="border: 0; border-top: 1px solid #c8e6c9; margin: 12px 0;">
            <p style="color: #2d6a4f; font-size: 1.4rem; font-weight: 700; margin-bottom: 10px;">
                <strong>Total Estimado:</strong> S/ ${total.toFixed(2)}
            </p>

            <a href="${urlWhatsApp}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                📲 Pedir esta cotización por WhatsApp
            </a>
        </div>
    `;
}

/* ==========================================================================
   4. RESTAURAR LOCALSTORAGE
   ========================================================================== */
function restaurarDatosGuardados() {
    const catGuardada = localStorage.getItem('rcs_categoria');
    const prodGuardado = localStorage.getItem('rcs_producto');
    const cantidadGuardada = localStorage.getItem('rcs_cantidad');

    if (catGuardada && tarifasRCS[catGuardada]) {
        categoriaSelect.value = catGuardada;
        actualizarProductos(); // Llena los productos de esa categoría

        if (prodGuardado && tarifasRCS[catGuardada].productos[prodGuardado]) {
            productoSelect.value = prodGuardado;
        }
    }

    if (cantidadGuardada) {
        cantidadInput.value = cantidadGuardada;
    }

    calcularEnTiempoReal();
}

/* ==========================================================================
   5. ESCUCHADORES DE EVENTOS
   ========================================================================== */
window.addEventListener('DOMContentLoaded', cargarTarifas);

// 🔄 AL CAMBIAR DE CATEGORÍA: Limpiamos la cantidad y el producto anterior
categoriaSelect.addEventListener('change', () => {
    cantidadInput.value = ''; // Resetea el input de cantidad
    localStorage.removeItem('rcs_cantidad'); // Borra la cantidad antigua de la memoria
    localStorage.removeItem('rcs_producto'); // Borra el producto antiguo de la memoria
    
    actualizarProductos(); // Vuelve a llenar la lista de productos de la nueva categoría
});

productoSelect.addEventListener('change', calcularEnTiempoReal);
cantidadInput.addEventListener('input', calcularEnTiempoReal);
cantidadInput.addEventListener('keyup', calcularEnTiempoReal);