/* ==========================================================================
   1. VARIABLES GLOBALES Y CAPTURA DEL DOM
   ========================================================================== */
// Inicia nulo porque ahora los precios se cargarán desde el archivo JSON
let tarifasRCS = null; 

const tipoTaza = document.getElementById('tipo-taza');
const cantidadInput = document.getElementById('cantidad');
const pantallaPrecio = document.getElementById('pantalla-precio');

/* ==========================================================================
   2. CARGA ASÍNCRONA DE DATOS (FETCH + JSON)
   ========================================================================== */
async function cargarTarifas() {
    try {
        // Pedimos el archivo JSON a la red
        const respuesta = await fetch('precios.json');
        
        if (!respuesta.ok) throw new Error("No se pudo cargar el archivo JSON");

        // Convertimos la respuesta en un objeto de JavaScript usable
        tarifasRCS = await respuesta.json();

        // Una vez que los precios están listos en memoria, restauramos lo guardado en localStorage
        restaurarDatosGuardados();

    } catch (error) {
        console.error('Error al obtener los precios:', error);
        pantallaPrecio.innerHTML = `
            <p style="color: #d90429; font-weight: 600;">
                ❌ No se pudieron cargar las tarifas de precios. Por favor recarga la página.
            </p>
        `;
    }
}

/* ==========================================================================
   3. FUNCIÓN REUTILIZABLE DE CÁLCULO
   ========================================================================== */
function calcularEnTiempoReal() {
    // Control de seguridad: Si el JSON aún no ha terminado de cargar, no hace nada
    if (!tarifasRCS) return;

    const modelo = tipoTaza.value;
    const cantidad = parseInt(cantidadInput.value);

    if (modelo) localStorage.setItem('rcs_modelo', modelo);
    if (!isNaN(cantidad)) localStorage.setItem('rcs_cantidad', cantidad);

    if (!modelo || isNaN(cantidad) || cantidad < 1) {
        pantallaPrecio.innerHTML = `
            <p style="color: #2d6a4f; font-weight: 600; margin-bottom: 0;">
                Selecciona tus opciones para calcular el total.
            </p>
        `;
        return;
    }

    let precioUnitario = 0;
    if (cantidad >= 100) {
        precioUnitario = tarifasRCS[modelo].ciento;
    } else if (cantidad >= 24) {
        precioUnitario = tarifasRCS[modelo].docenas;
    } else {
        precioUnitario = tarifasRCS[modelo].unidad;
    }

    const total = cantidad * precioUnitario;

    const telefonoRCS = "51959562867"; // Tu número real aquí
    const nombreModelo = tipoTaza.options[tipoTaza.selectedIndex].text;

    const mensajeTexto = 
        `✨ *¡NUEVA COTIZACIÓN DESDE LA WEB!* ✨\n\n` +
        `👋 Hola *RCS Merchandising*, acabo de calcular una cotización en su sistema y me gustaría coordinar mi pedido:\n\n` +
        `🎨 *DETALLES DEL PRODUCTO*\n` +
        `☕ *Modelo:* ${nombreModelo}\n` +
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
                <strong>Modelo:</strong> ${nombreModelo}
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
   4. RESTAURAR DATOS DESDE LOCALSTORAGE
   ========================================================================== */
function restaurarDatosGuardados() {
    const modeloGuardado = localStorage.getItem('rcs_modelo');
    const cantidadGuardada = localStorage.getItem('rcs_cantidad');

    if (modeloGuardado) tipoTaza.value = modeloGuardado;
    if (cantidadGuardada) cantidadInput.value = cantidadGuardada;

    if (modeloGuardado && cantidadGuardada) {
        calcularEnTiempoReal();
    }
}

/* ==========================================================================
   5. ESCUCHADORES DE EVENTOS
   ========================================================================== */
// Iniciamos la descarga del JSON tan pronto se cargue el DOM
window.addEventListener('DOMContentLoaded', cargarTarifas);

tipoTaza.addEventListener('change', calcularEnTiempoReal);
cantidadInput.addEventListener('input', calcularEnTiempoReal);
cantidadInput.addEventListener('keyup', calcularEnTiempoReal);