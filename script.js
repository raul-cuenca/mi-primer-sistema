/* ==========================================================================
   1. ESTRUCTURA DE DATOS (TARIFAS REALES DE RCS)
   ========================================================================== */
const tarifasRCS = {
    blanca_11oz: { unidad: 7.00, docenas: 6.50, ciento: 5.90 },
    conica_15oz: { unidad: 11.90, docenas: 10.50, ciento: 9.90 },
    magica:      { unidad: 14.90, docenas: 13.90, ciento: 12.90 }
};

/* ==========================================================================
   2. CAPTURA DE ELEMENTOS DE LA INTERFAZ (DOM)
   ========================================================================== */
const tipoTaza = document.getElementById('tipo-taza');
const cantidadInput = document.getElementById('cantidad');
const pantallaPrecio = document.getElementById('pantalla-precio');

/* ==========================================================================
   3. FUNCIÓN REUTILIZABLE DE CÁLCULO
   ========================================================================== */
function calcularEnTiempoReal() {
    const modelo = tipoTaza.value;
    const cantidad = parseInt(cantidadInput.value);

    // Guardar los valores ingresados en la memoria del navegador
    if (modelo) localStorage.setItem('rcs_modelo', modelo);
    if (!isNaN(cantidad)) localStorage.setItem('rcs_cantidad', cantidad);

    // Control de seguridad si el campo está vacío
    if (!modelo || isNaN(cantidad) || cantidad < 1) {
        pantallaPrecio.innerHTML = `
            <p style="color: #2d6a4f; font-weight: 600; margin-bottom: 0;">
                Selecciona tus opciones para calcular el total.
            </p>
        `;
        return;
    }

    // Aplicación de reglas de negocio
    let precioUnitario = 0;
    if (cantidad >= 100) {
        precioUnitario = tarifasRCS[modelo].ciento;
    } else if (cantidad >= 24) {
        precioUnitario = tarifasRCS[modelo].docenas;
    } else {
        precioUnitario = tarifasRCS[modelo].unidad;
    }

    const total = cantidad * precioUnitario;

    // Mensaje para WhatsApp
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

    // Inyección en el HTML
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
   4. RESTAURAR DATOS AL CARGAR LA PÁGINA
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    const modeloGuardado = localStorage.getItem('rcs_modelo');
    const cantidadGuardada = localStorage.getItem('rcs_cantidad');

    if (modeloGuardado) {
        tipoTaza.value = modeloGuardado;
    }
    if (cantidadGuardada) {
        cantidadInput.value = cantidadGuardada;
    }

    // Si ya teníamos datos guardados, calculamos la cotización de inmediato
    if (modeloGuardado && cantidadGuardada) {
        calcularEnTiempoReal();
    }
});

/* ==========================================================================
   5. ESCUCHADORES DE EVENTOS EN TIEMPO REAL
   ========================================================================== */
tipoTaza.addEventListener('change', calcularEnTiempoReal);
cantidadInput.addEventListener('input', calcularEnTiempoReal);
cantidadInput.addEventListener('keyup', calcularEnTiempoReal);