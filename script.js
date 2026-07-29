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
   3. FUNCIÓN REUTILIZABLE DE CÁLCULO (EL "MOTOR")
   ========================================================================== */
function calcularEnTiempoReal() {
    const modelo = tipoTaza.value;
    const cantidad = parseInt(cantidadInput.value);

    /* 🔴 CONTROL DE SEGURIDAD: 
       Si el usuario borra el número, deja el campo vacío o no ha elegido modelo,
       reiniciamos el panel de resultados con el mensaje original y salimos. */
    if (!modelo || isNaN(cantidad) || cantidad < 1) {
        pantallaPrecio.innerHTML = `
            <p style="color: #2d6a4f; font-weight: 600; margin-bottom: 0;">
                Selecciona tus opciones para calcular el total.
            </p>
        `;
        return; // El "return" detiene la función de inmediato
    }

    // 4. APLICACIÓN DE REGLAS DE NEGOCIO POR ESCALAS
    let precioUnitario = 0;

    if (cantidad >= 100) {
        precioUnitario = tarifasRCS[modelo].ciento;
    } else if (cantidad >= 24) {
        precioUnitario = tarifasRCS[modelo].docenas;
    } else {
        precioUnitario = tarifasRCS[modelo].unidad;
    }

    // 5. CÁLCULO MATEMÁTICO
    const total = cantidad * precioUnitario;

    // 6. CONSTRUCCIÓN DEL MENSAJE PARA WHATSAPP (FORMATO COMERCIAL MEJORADO)
    const telefonoRCS = "51959562867"; // ⚠️ Tu número real aquí
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

    // Convertimos el mensaje en un formato seguro para URLs
    const mensajeCodificado = encodeURIComponent(mensajeTexto);
    const urlWhatsApp = `https://wa.me/${telefonoRCS}?text=${mensajeCodificado}`;

    // 7. INYECCIÓN DINÁMICA EN EL HTML CON EL BOTÓN DE WHATSAPP
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

            <!-- Botón interactivo de WhatsApp -->
            <a href="${urlWhatsApp}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                📲 Pedir esta cotización por WhatsApp
            </a>
        </div>
    `;
}

/* ==========================================================================
   4. ESCUCHADORES DE EVENTOS EN TIEMPO REAL (HÍBRIDO COMPU/MÓVIL)
   ========================================================================== */
// Detecta cuando cambias de modelo de taza
tipoTaza.addEventListener('change', calcularEnTiempoReal);

// Detecta cambios en computadoras, flechas numéricas y copy-paste
cantidadInput.addEventListener('input', calcularEnTiempoReal);

// 🚀 EL TRUCO PARA CELULARES: Detecta instantáneamente cada vez que levantas el dedo del teclado virtual
cantidadInput.addEventListener('keyup', calcularEnTiempoReal);