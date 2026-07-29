/* ==========================================================================
   1. VARIABLES GLOBALES Y CAPTURA DEL DOM
   ========================================================================== */
let tarifasRCS = null; 
let timerToast = null;
let timerDebounceToast = null;
let ultimaEscalaNotificada = ''; 

const categoriaSelect = document.getElementById('categoria');
const productoSelect = document.getElementById('tipo-producto');
const contenedorAdicionales = document.getElementById('contenedor-adicionales');
const cantidadInput = document.getElementById('cantidad');
const estadoDisenoSelect = document.getElementById('estado-diseno');
const pantallaPrecio = document.getElementById('pantalla-precio');
const toastContainer = document.getElementById('toast-container');

/* ==========================================================================
   2. CARGA ASÍNCRONA DE DATOS (ANTI-CACHÉ)
   ========================================================================== */
async function cargarTarifas() {
    try {
        const respuesta = await fetch('precios.json?v=' + new Date().getTime());
        if (!respuesta.ok) throw new Error("No se pudo cargar el JSON");

        tarifasRCS = await respuesta.json();
        poblarCategorias();
        restaurarDatosGuardados();

    } catch (error) {
        console.error('Error al obtener el catálogo:', error);
        pantallaPrecio.innerHTML = `
            <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                ❌ No se pudieron cargar los productos. Por favor recarga la página.
            </div>
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
    contenedorAdicionales.innerHTML = ''; 

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

            const label = document.createElement('label');
            label.htmlFor = `adic-${keyAdicional}`;
            label.className = 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2';
            label.textContent = adic.label;

            const select = document.createElement('select');
            select.id = `adic-${keyAdicional}`;
            select.className = 'w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition font-medium select-adicional';

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
   4. SISTEMA DE NOTIFICACIONES TOAST (VENTANA EMERGENTE ELEGANTE)
   ========================================================================== */
function lanzarToastNotificacion(titulo, mensaje, tipo = 'amber') {
    if (!toastContainer) return;

    toastContainer.innerHTML = '';

    const colorBorde = tipo === 'blue' ? 'border-blue-500/40' : 'border-amber-500/40';
    const colorIconoBg = tipo === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    const colorTitulo = tipo === 'blue' ? 'text-blue-400' : 'text-amber-400';

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border ${colorBorde} flex items-start gap-3 transform transition-all duration-500 translate-y-8 opacity-0 backdrop-blur-md`;
    
    toast.innerHTML = `
        <div class="${colorIconoBg} p-2 rounded-xl border flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
        </div>
        <div class="flex-1 pr-1">
            <h4 class="text-xs font-bold uppercase tracking-wider ${colorTitulo} mb-1">${titulo}</h4>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">${mensaje}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition text-xs font-bold p-1">✕</button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-8', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 50);

    if (timerToast) clearTimeout(timerToast);
    timerToast = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-8', 'opacity-0');
        setTimeout(() => toast.remove(), 500);
    }, 4500);
}

/* ==========================================================================
   5. FUNCIONES AUXILIARES DE CÁLCULO Y FORMATO DE FECHAS HÁBILES
   ========================================================================== */
function sumarDiasHabiles(fechaInicial, diasAñadir) {
    let fecha = new Date(fechaInicial);
    let diasSumados = 0;
    
    while (diasSumados < diasAñadir) {
        fecha.setDate(fecha.getDate() + 1);
        const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasSumados++;
        }
    }
    return fecha;
}

function formatearFechaElegante(fecha) {
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    let str = fecha.toLocaleDateString('es-ES', opciones);
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calcularTiempoEntrega(cantidad, estadoDiseno) {
    let diasBaseMin = 0;
    let diasBaseMax = 0;

    // 1. Días base según la cantidad
    if (cantidad < 24) {
        diasBaseMin = 2;
        diasBaseMax = 2;
    } else if (cantidad >= 24 && cantidad <= 60) {
        diasBaseMin = 4;
        diasBaseMax = 4;
    } else if (cantidad > 60 && cantidad <= 100) {
        diasBaseMin = 6;
        diasBaseMax = 7;
    } else {
        diasBaseMin = 8;
        diasBaseMax = 10;
    }

    // 2. Días adicionales por diseño
    let diasAdicionales = 0;
    if (estadoDiseno === 'retoque') {
        diasAdicionales = 1;
    } else if (estadoDiseno === 'creacion') {
        diasAdicionales = 2;
    }

    const totalMin = diasBaseMin + diasAdicionales;
    const totalMax = diasBaseMax + diasAdicionales;

    const textoDias = (totalMin === totalMax) 
        ? `${totalMin} días hábiles` 
        : `${totalMin} a ${totalMax} días hábiles`;

    // 3. Evaluar horario de corte (3:00 PM / 15:00 hrs)
    const horaActual = new Date();
    let fechaInicioConteo = new Date();
    const esDespuesDeLasTres = horaActual.getHours() >= 15;

    if (esDespuesDeLasTres) {
        fechaInicioConteo.setDate(fechaInicioConteo.getDate() + 1);
    }

    // 4. Calcular fechas exactas omitiendo fines de semana
    const fechaMin = sumarDiasHabiles(fechaInicioConteo, totalMin);
    const fechaMax = sumarDiasHabiles(fechaInicioConteo, totalMax);

    let textoFechas = '';
    if (totalMin === totalMax) {
        textoFechas = formatearFechaElegante(fechaMin);
    } else {
        textoFechas = `Del ${formatearFechaElegante(fechaMin)} al ${formatearFechaElegante(fechaMax)}`;
    }

    return {
        textoDias: textoDias,
        textoFechas: textoFechas,
        esDespuesDeLasTres: esDespuesDeLasTres
    };
}

/* ==========================================================================
   6. CÁLCULO EN TIEMPO REAL + UPSELLING + ENTREGA + WHATSAPP
   ========================================================================== */
function calcularEnTiempoReal() {
    if (!tarifasRCS) return;

    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;
    const cantidad = parseInt(cantidadInput.value);
    const estadoDiseno = estadoDisenoSelect ? estadoDisenoSelect.value : 'listo';

    if (catKey) localStorage.setItem('rcs_categoria', catKey);
    if (prodKey) localStorage.setItem('rcs_producto', prodKey);
    if (!isNaN(cantidad)) localStorage.setItem('rcs_cantidad', cantidad);
    if (estadoDiseno) localStorage.setItem('rcs_diseno', estadoDiseno);

    if (!catKey || !prodKey || isNaN(cantidad) || cantidad < 1) {
        pantallaPrecio.innerHTML = `
            <div class="text-center py-8">
                <p class="text-slate-400 text-sm">
                    Selecciona los datos y escribe una cantidad válida para ver el cálculo.
                </p>
            </div>
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
    let htmlAdicionalesVista = '';

    const selectoresAdicionales = document.querySelectorAll('.select-adicional');
    selectoresAdicionales.forEach(select => {
        const opcionSeleccionada = select.options[select.selectedIndex];
        const extra = parseFloat(opcionSeleccionada.dataset.extra) || 0;
        costoAdicionalesUnitario += extra;

        const labelTexto = select.previousElementSibling.textContent.replace(':', '');
        
        textoAdicionalesMensaje += `🔹 *${labelTexto}:* ${opcionSeleccionada.textContent}\n`;

        htmlAdicionalesVista += `
            <div class="flex justify-between items-center text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <span class="font-medium">${labelTexto}:</span>
                <span class="font-semibold text-emerald-400">${opcionSeleccionada.textContent}</span>
            </div>
        `;
    });

    const precioUnitarioFinal = precioBaseUnitario + costoAdicionalesUnitario;
    
    // Costo por servicio de creación de diseño
    let costoDisenoExtra = 0;
    let textoEstadoDiseno = "Diseño listo para sublimar";
    if (estadoDiseno === 'retoque') {
        textoEstadoDiseno = "Requiere retoque (+1 día hábil)";
    } else if (estadoDiseno === 'creacion') {
        costoDisenoExtra = 15.00;
        textoEstadoDiseno = "Creación desde cero (+2 días hábiles | +S/ 15.00)";
    }

    const subtotalProductos = cantidad * precioUnitarioFinal;
    const totalFinal = subtotalProductos + costoDisenoExtra;

    // Cálculo completo del Tiempo y Fecha de Entrega
    const infoEntrega = calcularTiempoEntrega(cantidad, estadoDiseno);

    /* ----------------------------------------------------------------------
       LÓGICA DE UPSELLING Y MENSAJES INFORMATIVOS POR RANGOS DE CANTIDAD
       ---------------------------------------------------------------------- */
    let htmlBannerUpsell = '';
    let tituloToast = '';
    let mensajeToast = '';
    let idEscalaActual = '';
    let tipoToast = 'amber';
    let dispararToast = false;

    if (cantidad < 24) {
        const faltantes = 24 - cantidad;
        const nuevoPrecioUnitario = escalasPrecios.docenas + costoAdicionalesUnitario;
        const ahorroPorUnidad = (precioUnitarioFinal - nuevoPrecioUnitario).toFixed(2);
        idEscalaActual = `docena-${prodKey}-${cantidad}`;

        htmlBannerUpsell = `
            <div class="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs text-amber-300 space-y-1 my-3">
                <div class="font-bold flex items-center gap-1.5 text-amber-400">
                    💡 ¡Aprovecha la Tarifa por Docena!
                </div>
                <p class="text-slate-300 leading-snug">
                    Agrega <strong class="text-white font-bold">${faltantes} u.</strong> más para pagar solo <strong class="text-amber-400 font-bold">S/ ${nuevoPrecioUnitario.toFixed(2)}</strong> c/u (Ahorras S/ ${ahorroPorUnidad} por unidad).
                </p>
            </div>
        `;

        tituloToast = "💡 Oportunidad de Ahorro";
        mensajeToast = `¡Estás a solo <strong>${faltantes} unidades</strong> de activar la tarifa por docena! El precio baja a <strong>S/ ${nuevoPrecioUnitario.toFixed(2)}</strong> c/u.`;
        tipoToast = 'amber';
        dispararToast = true;

    } else if (cantidad >= 24 && cantidad <= 49) {
        const precioCientoUnitario = escalasPrecios.ciento + costoAdicionalesUnitario;
        idEscalaActual = `info-ciento-${prodKey}`;

        htmlBannerUpsell = `
            <div class="bg-blue-500/10 border border-blue-500/30 p-3.5 rounded-xl text-xs text-blue-300 space-y-1 my-3">
                <div class="font-bold flex items-center gap-1.5 text-blue-400">
                    ℹ️ Tarifa Especial por Ciento
                </div>
                <p class="text-slate-300 leading-snug">
                    Contamos con un precio preferencial de <strong class="text-blue-400 font-bold">S/ ${precioCientoUnitario.toFixed(2)}</strong> c/u a partir de 100 unidades.
                </p>
            </div>
        `;

        tituloToast = "ℹ️ Precio Especial por Ciento";
        mensajeToast = `Contamos con una tarifa especial de <strong>S/ ${precioCientoUnitario.toFixed(2)}</strong> c/u a partir de 100 unidades.`;
        tipoToast = 'blue';
        dispararToast = true;

    } else if (cantidad >= 50 && cantidad < 100) {
        const faltantes = 100 - cantidad;
        const nuevoPrecioUnitario = escalasPrecios.ciento + costoAdicionalesUnitario;
        idEscalaActual = `ciento-${prodKey}-${cantidad}`;

        htmlBannerUpsell = `
            <div class="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs text-amber-300 space-y-1 my-3">
                <div class="font-bold flex items-center gap-1.5 text-amber-400">
                    🔥 ¡Descuento por Ciento Cercano!
                </div>
                <p class="text-slate-300 leading-snug">
                    Agrega <strong class="text-white font-bold">${faltantes} u.</strong> más para activar la tarifa al ciento: <strong class="text-amber-400 font-bold">S/ ${nuevoPrecioUnitario.toFixed(2)}</strong> c/u.
                </p>
            </div>
        `;

        tituloToast = "🔥 ¡A un paso del Ciento!";
        mensajeToast = `Agrega <strong>${faltantes} unidades</strong> más para desbloquear la tarifa por ciento (<strong>S/ ${nuevoPrecioUnitario.toFixed(2)}</strong> c/u).`;
        tipoToast = 'amber';
        dispararToast = true;

    } else {
        idEscalaActual = `maximo-${prodKey}`;
        htmlBannerUpsell = `
            <div class="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 text-center font-semibold my-3">
                🎉 ¡Felicidades! Tienes activada la tarifa de Máximo Descuento por Ciento.
            </div>
        `;
        dispararToast = false;
    }

    if (dispararToast && idEscalaActual !== ultimaEscalaNotificada) {
        clearTimeout(timerDebounceToast);
        timerDebounceToast = setTimeout(() => {
            lanzarToastNotificacion(tituloToast, mensajeToast, tipoToast);
            ultimaEscalaNotificada = idEscalaActual;
        }, 600);
    }

    /* ----------------------------------------------------------------------
       WHATSAPP Y RENDERIZADO FINAL EN PANTALLA
       ---------------------------------------------------------------------- */
    const telefonoRCS = "51959562867"; 
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
        `🖼️ *Estado del Diseño:* ${textoEstadoDiseno}\n` +
        `🚚 *Tiempo Estimado:* ${infoEntrega.textoDias}\n` +
        `📅 *Fecha de Entrega Prometida:* ${infoEntrega.textoFechas}\n\n` +
        `💳 *RESUMEN DE PAGO*\n` +
        `🏷️ *Precio Unitario:* S/ ${precioUnitarioFinal.toFixed(2)}\n` +
        (costoDisenoExtra > 0 ? `✏️ *Diseño desde Cero:* S/ ${costoDisenoExtra.toFixed(2)}\n` : '') +
        `💰 *Total Estimado:* S/ ${totalFinal.toFixed(2)}\n\n` +
        `🚀 ¿Cuáles son los pasos para realizar el abono? ¡Quedo atento! 🙌`;

    const mensajeCodificado = encodeURIComponent(mensajeTexto);
    const urlWhatsApp = `https://wa.me/${telefonoRCS}?text=${mensajeCodificado}`;

    pantallaPrecio.innerHTML = `
        <div class="space-y-4">
            <div class="space-y-2">
                <div class="flex justify-between items-center text-xs text-slate-400">
                    <span>Categoría:</span>
                    <span class="font-semibold text-white">${nombreCat}</span>
                </div>
                <div class="flex justify-between items-center text-xs text-slate-400">
                    <span>Modelo:</span>
                    <span class="font-semibold text-white">${nombreProd}</span>
                </div>
            </div>

            ${htmlAdicionalesVista ? `<div class="space-y-2 pt-1 border-t border-slate-800">${htmlAdicionalesVista}</div>` : ''}

            <div class="pt-2 border-t border-slate-800 space-y-1.5">
                <div class="flex justify-between items-center text-xs text-slate-400">
                    <span>Cantidad:</span>
                    <span class="font-bold text-white">${cantidad} unidades</span>
                </div>
                <div class="flex justify-between items-center text-xs text-slate-400">
                    <span>Precio Unitario:</span>
                    <span class="font-bold text-white">S/ ${precioUnitarioFinal.toFixed(2)}</span>
                </div>
                ${costoDisenoExtra > 0 ? `
                <div class="flex justify-between items-center text-xs text-amber-300">
                    <span>Servicio de Diseño:</span>
                    <span class="font-bold">+ S/ ${costoDisenoExtra.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>

            <!-- TARJETA DESTACADA DE TIEMPO Y FECHA EXACTA DE ENTREGA -->
            <div class="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div class="flex justify-between items-center text-slate-300">
                    <span class="font-medium flex items-center gap-1.5">🚚 Tiempo estimado:</span>
                    <span class="font-bold text-blue-400">${infoEntrega.textoDias}</span>
                </div>
                <div class="pt-2 border-t border-slate-700/60 flex justify-between items-center">
                    <span class="text-slate-400 font-medium">📅 Fecha de entrega:</span>
                    <span class="font-bold text-amber-300 text-right">${infoEntrega.textoFechas}</span>
                </div>
                <p class="text-[10px] text-slate-400 italic text-right pt-0.5">
                    * Pedido ${infoEntrega.esDespuesDeLasTres ? 'después de las 3:00 PM (conteo desde mañana)' : 'antes de las 3:00 PM (conteo desde hoy)'}
                </p>
            </div>

            <!-- Banner de Upselling o Informativo -->
            ${htmlBannerUpsell}

            <div class="bg-slate-800 p-4 rounded-xl border border-slate-700/80 text-center my-3">
                <span class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Monto Total Estimado</span>
                <span class="text-3xl font-black text-emerald-400">S/ ${totalFinal.toFixed(2)}</span>
            </div>

            <a href="${urlWhatsApp}" target="_blank" rel="noopener noreferrer" 
               class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 text-sm text-center">
                <svg class="w-5 h-5 fill-current inline" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                Pedir esta cotización por WhatsApp
            </a>
        </div>
    `;
}

/* ==========================================================================
   7. RESTAURAR DATOS DESDE LOCALSTORAGE
   ========================================================================== */
function restaurarDatosGuardados() {
    const catGuardada = localStorage.getItem('rcs_categoria');
    const prodGuardado = localStorage.getItem('rcs_producto');
    const cantidadGuardada = localStorage.getItem('rcs_cantidad');
    const disenoGuardado = localStorage.getItem('rcs_diseno');

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

    if (disenoGuardado && estadoDisenoSelect) {
        estadoDisenoSelect.value = disenoGuardado;
    }

    calcularEnTiempoReal();
}

/* ==========================================================================
   8. ESCUCHADORES DE EVENTOS
   ========================================================================== */
window.addEventListener('DOMContentLoaded', cargarTarifas);

categoriaSelect.addEventListener('change', () => {
    cantidadInput.value = '';
    localStorage.removeItem('rcs_cantidad');
    localStorage.removeItem('rcs_producto');
    ultimaEscalaNotificada = '';
    actualizarProductos();
});

productoSelect.addEventListener('change', () => {
    ultimaEscalaNotificada = '';
    renderizarAdicionales();
    calcularEnTiempoReal();
});

cantidadInput.addEventListener('input', calcularEnTiempoReal);
cantidadInput.addEventListener('keyup', calcularEnTiempoReal);

if (estadoDisenoSelect) {
    estadoDisenoSelect.addEventListener('change', calcularEnTiempoReal);
}