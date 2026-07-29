/* ==========================================================================
   1. VARIABLES GLOBALES Y CAPTURA DEL DOM
   ========================================================================== */
let tarifasRCS = null; 

const categoriaSelect = document.getElementById('categoria');
const productoSelect = document.getElementById('tipo-producto');
const contenedorAdicionales = document.getElementById('contenedor-adicionales');
const cantidadInput = document.getElementById('cantidad');
const pantallaPrecio = document.getElementById('pantalla-precio');

/* ==========================================================================
   2. CARGA ASÍNCRONA DE DATOS (CON CACHE BUSTING ANTI-MEMORIA VIEJA)
   ========================================================================== */
async function cargarTarifas() {
    try {
        // ⚡ Agregamos ?v=timestamp para obligar a descargar el JSON más fresco siempre
        const respuesta = await fetch('precios.json?v=' + new Date().getTime());
        if (!respuesta.ok) throw new Error("No se pudo cargar el JSON");

        tarifasRCS = await respuesta.json();
        poblarCategorias();
        restaurarDatosGuardados();

    } catch (error) {
        console.error('Error al obtener el catálogo:', error);
        pantallaPrecio.innerHTML = `
            <p style="color: #d90429; font-weight: 600;">
                ❌ No se pudieron cargar los productos. Por favor recarga la página.
            </p>
        `;
    }
}

function poblarCategorias() {
    categoriaSelect.innerHTML = '<option value="">-- Selecciona Categoría --</option>';

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
    contenedorAdicionales.innerHTML = ''; // Limpia adicionales anteriores

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

    renderizarAdicionales();
    calcularEnTiempoReal();
}

/* ==========================================================================
   3. RENDERIZADO DINÁMICO DE OPCIONES ADICIONALES
   ========================================================================== */
function renderizarAdicionales() {
    contenedorAdicionales.innerHTML = '';

    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;

    if (!catKey || !prodKey || !tarifasRCS[catKey] || !tarifasRCS[catKey].productos[prodKey]) return;

    const datosProducto = tarifasRCS[catKey].productos[prodKey];

    if (datosProducto.adicionales) {
        for (const keyAdicional in datosProducto.adicionales) {
            const adic = datosProducto.adicionales[keyAdicional];

            const divCampo = document.createElement('div');
            divCampo.className = 'campo';

            const label = document.createElement('label');
            label.htmlFor = `adic-${keyAdicional}`;
            label.textContent = adic.label;

            const select = document.createElement('select');
            select.id = `adic-${keyAdicional}`;
            select.className = 'select-adicional';

            for (const keyOp in adic.opciones) {
                const op = adic.opciones[keyOp];
                const option = document.createElement('option');
                option.value = keyOp;
                option.dataset.extra = op.extra;
                option.textContent = op.nombre;
                select.appendChild(option);
            }

            select.addEventListener('change', calcularEnTiempoReal);

            divCampo.appendChild(label);
            divCampo.appendChild(select);
            contenedorAdicionales.appendChild(divCampo);
        }
    }
}

/* ==========================================================================
   4. CÁLCULO Y MENSAJE DE WHATSAPP
   ========================================================================== */
function calcularEnTiempoReal() {
    if (!tarifasRCS) return;

    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;
    const cantidad = parseInt(cantidadInput.value);

    if (catKey) localStorage.setItem('rcs_categoria', catKey);
    if (prodKey) localStorage.setItem('rcs_producto', prodKey);
    if (!isNaN(cantidad)) localStorage.setItem('rcs_cantidad', cantidad);

    if (!catKey || !prodKey || isNaN(cantidad) || cantidad < 1) {
        pantallaPrecio.innerHTML = `
            <p style="color: #2d6a4f; font-weight: 600; margin-bottom: 0;">
                Selecciona la categoría, modelo y cantidad para ver el cálculo.
            </p>
        `;
        return;
    }

    const datosProducto = tarifasRCS[catKey].productos[prodKey];
    const escalasPrecios = datosProducto.precios;

    let precioBaseUnitario = 0;
    if (cantidad >= 100) {
        precioBaseUnitario = escalasPrecios.ciento;
    } else if (cantidad >= 24) {
        precioBaseUnitario = escalasPrecios.docenas;
    } else {
        precioBaseUnitario = escalasPrecios.unidad;
    }

    let costoAdicionalesUnitario = 0;
    let textoAdicionalesMensaje = '';

    const selectoresAdicionales = document.querySelectorAll('.select-adicional');
    selectoresAdicionales.forEach(select => {
        const opcionSeleccionada = select.options[select.selectedIndex];
        const extra = parseFloat(opcionSeleccionada.dataset.extra) || 0;
        costoAdicionalesUnitario += extra;

        const labelTexto = select.previousElementSibling.textContent.replace(':', '');
        textoAdicionalesMensaje += `🔹 *${labelTexto}:* ${opcionSeleccionada.textContent}\n`;
    });

    const precioUnitarioFinal = precioBaseUnitario + costoAdicionalesUnitario;
    const total = cantidad * precioUnitarioFinal;

    const telefonoRCS = "51959562867"; // Tu número aquí
    const nombreCat = tarifasRCS[catKey].nombre;
    const nombreProd = datosProducto.nombre;

    const mensajeTexto = 
        `✨ *¡NUEVA COTIZACIÓN DESDE LA WEB!* ✨\n\n` +
        `👋 Hola *RCS Merchandising*, me gustaría coordinar el siguiente pedido:\n\n` +
        `🎨 *DETALLES DEL PRODUCTO*\n` +
        `📁 *Categoría:* ${nombreCat}\n` +
        `🛍️ *Modelo:* ${nombreProd}\n` +
        (textoAdicionalesMensaje ? textoAdicionalesMensaje : '') +
        `📦 *Cantidad:* ${cantidad} unidades\n` +
        `🏷️ *Precio Unitario Total:* S/ ${precioUnitarioFinal.toFixed(2)}\n\n` +
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
                <strong>Precio Unitario Final:</strong> S/ ${precioUnitarioFinal.toFixed(2)}
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
   5. RESTAURAR LOCALSTORAGE
   ========================================================================== */
function restaurarDatosGuardados() {
    const catGuardada = localStorage.getItem('rcs_categoria');
    const prodGuardado = localStorage.getItem('rcs_producto');
    const cantidadGuardada = localStorage.getItem('rcs_cantidad');

    if (catGuardada && tarifasRCS[catGuardada]) {
        categoriaSelect.value = catGuardada;
        actualizarProductos();

        if (prodGuardado && tarifasRCS[catGuardada].productos[prodGuardado]) {
            productoSelect.value = prodGuardado;
            renderizarAdicionales();
        }
    }

    if (cantidadGuardada) {
        cantidadInput.value = cantidadGuardada;
    }

    calcularEnTiempoReal();
}

/* ==========================================================================
   6. ESCUCHADORES DE EVENTOS
   ========================================================================== */
window.addEventListener('DOMContentLoaded', cargarTarifas);

categoriaSelect.addEventListener('change', () => {
    cantidadInput.value = '';
    localStorage.removeItem('rcs_cantidad');
    localStorage.removeItem('rcs_producto');
    
    actualizarProductos();
});

productoSelect.addEventListener('change', () => {
    renderizarAdicionales();
    calcularEnTiempoReal();
});

cantidadInput.addEventListener('input', calcularEnTiempoReal);
cantidadInput.addEventListener('keyup', calcularEnTiempoReal);