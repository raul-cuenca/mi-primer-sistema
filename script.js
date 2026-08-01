/* ==========================================================================
   RCS MERCHANDISING - LÓGICA CON CONEXIÓN A SUPABASE (v1.2.3-db)
   ========================================================================== */

/* 1. CONFIGURACIÓN DEL CLIENTE DE SUPABASE */
const SUPABASE_URL = 'https://rfgdcktnzdbyslinobai.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZ2Rja3RuemRieXNsaW5vYmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTIwNDIsImV4cCI6MjEwMTEyODA0Mn0.yx9s_k6gdTNGObcwVO6Jg5PcsiVtInc8y1KpZUfr9NM';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* 2. MAPEO HEX PARA MUESTRAS VISUALES DE COLOR */
const MAPA_COLORES = {
    'blanco': { hex: '#FFFFFF', borde: true },
    'rojo': { hex: '#DC2626' },
    'verde': { hex: '#16A34A' },
    'amarillo': { hex: '#FACC15' },
    'celeste': { hex: '#38BDF8' },
    'negro': { hex: '#18181B' },
    'azul marino': { hex: '#1E3A8A' },
    'azul': { hex: '#2563EB' },
    'naranja': { hex: '#F97316' },
    'beige': { hex: '#F5F5DC', borde: true },
    'gris': { hex: '#6B7280' }
};

/* 3. VARIABLES GLOBALES Y ELEMENTOS DEL DOM */
let tarifasRCS = null;
let timerToast = null;
let timerDebounceToast = null;
let ultimaEscalaNotificada = '';

const categoriaSelect = document.getElementById('categoria');
const productoSelect = document.getElementById('tipo-producto');
const contenedorTrabajo = document.getElementById('contenedor-trabajo');
const contenedorAdicionales = document.getElementById('contenedor-adicionales');
const cantidadInput = document.getElementById('cantidad');
const estadoDisenoSelect = document.getElementById('estado-diseno');
const pantallaPrecio = document.getElementById('pantalla-precio');
const toastContainer = document.getElementById('toast-container');

/* 4. CARGA ASÍNCRONA DESDE LA BASE DE DATOS (SUPABASE) */
async function cargarTarifas() {
    console.group('⚡ DIAGNÓSTICO DE CONEXIÓN SUPABASE');
    console.log('📡 1. Iniciando petición HTTP a Supabase...');
    console.time('⏱️ Tiempo de respuesta de la Base de Datos');

    try {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select(`
                slug,
                nombre,
                productos (
                    slug,
                    nombre,
                    precio_unidad,
                    precio_docenas,
                    precio_ciento,
                    adicionales (
                        clave,
                        label,
                        opciones_adicionales (
                            clave,
                            nombre,
                            extra
                        )
                    )
                )
            `)
            .order('id', { ascending: true })
            .order('id', { foreignTable: 'productos', ascending: true })
            .order('id', { foreignTable: 'productos.adicionales', ascending: true })
            .order('id', { foreignTable: 'productos.adicionales.opciones_adicionales', ascending: true });

        console.timeEnd('⏱️ Tiempo de respuesta de la Base de Datos');

        if (error) throw error;

        console.log('✅ 2. Respuesta recibida desde Supabase:', data);

        tarifasRCS = transformarRespuestaSupabase(data);
        
        console.log('🔄 3. Estructura adaptada para la interfaz:', tarifasRCS);
        console.groupEnd();
        
        poblarCategorias();
        
        if (pantallaPrecio) {
            pantallaPrecio.innerHTML = `
                <p class="text-slate-400 text-sm text-center py-8">
                    Selecciona los detalles de tu producto para visualizar la cotización.
                </p>
            `;
        }
    } catch (error) {
        console.timeEnd('⏱️ Tiempo de respuesta de la Base de Datos');
        console.error('❌ Error al conectar con Supabase:', error);
        console.groupEnd();

        if (pantallaPrecio) {
            pantallaPrecio.innerHTML = `
                <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center space-y-2">
                    <p class="font-bold">❌ Error al cargar los precios</p>
                    <p class="text-xs text-slate-300">Verifica tus credenciales o conexión en script.js</p>
                </div>
            `;
        }
    }
}

function transformarRespuestaSupabase(dataSupabase) {
    const estructuraOriginal = {};

    dataSupabase.forEach(cat => {
        estructuraOriginal[cat.slug] = {
            nombre: cat.nombre,
            productos: {}
        };

        if (cat.productos && Array.isArray(cat.productos)) {
            cat.productos.forEach(prod => {
                const productoObj = {
                    nombre: prod.nombre,
                    precios: {
                        unidad: parseFloat(prod.precio_unidad),
                        docenas: parseFloat(prod.precio_docenas),
                        ciento: parseFloat(prod.precio_ciento)
                    },
                    adicionales: {}
                };

                if (prod.adicionales && Array.isArray(prod.adicionales)) {
                    prod.adicionales.forEach(adic => {
                        const adicionalObj = {
                            label: adic.label,
                            opciones: {}
                        };

                        if (adic.opciones_adicionales && Array.isArray(adic.opciones_adicionales)) {
                            adic.opciones_adicionales.forEach(op => {
                                adicionalObj.opciones[op.clave] = {
                                    nombre: op.nombre,
                                    extra: parseFloat(op.extra)
                                };
                            });
                        }

                        productoObj.adicionales[adic.clave] = adicionalObj;
                    });
                }

                estructuraOriginal[cat.slug].productos[prod.slug] = productoObj;
            });
        }
    });

    return estructuraOriginal;
}

function poblarCategorias() {
    categoriaSelect.innerHTML = '<option value="" disabled selected>-- Selecciona Categoría --</option>';

    for (const keyCat in tarifasRCS) {
        const option = document.createElement('option');
        option.value = keyCat;
        option.textContent = tarifasRCS[keyCat].nombre;
        categoriaSelect.appendChild(option);
    }
}

function actualizarProductos() {
    const catSeleccionada = categoriaSelect.value;

    productoSelect.innerHTML = '<option value="" disabled selected>-- Selecciona Modelo --</option>';
    if (contenedorTrabajo) contenedorTrabajo.innerHTML = '';
    if (contenedorAdicionales) contenedorAdicionales.innerHTML = '';

    if (!catSeleccionada || !tarifasRCS[catSeleccionada]) {
        productoSelect.disabled = true;
        renderizarMuestrasColor(null);
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

/* 5. RENDERIZADO DE ADICIONALES Y REGLAS DE NEGOCIO */
function renderizarAdicionales() {
    if (contenedorTrabajo) contenedorTrabajo.innerHTML = '';
    if (contenedorAdicionales) contenedorAdicionales.innerHTML = '';

    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;

    if (!catKey || !prodKey || !tarifasRCS[catKey] || !tarifasRCS[catKey].productos[prodKey]) {
        renderizarMuestrasColor(null);
        return;
    }

    const datosProducto = tarifasRCS[catKey].productos[prodKey];
    let objetoColorAdicional = null;

    if (datosProducto.adicionales) {
        for (const keyAdicional in datosProducto.adicionales) {
            const adic = datosProducto.adicionales[keyAdicional];
            const keyLower = keyAdicional.toLowerCase();
            const labelLower = (adic.label || '').toLowerCase();

            // Detectar si es el campo de Color
            if (keyLower.includes('color') || labelLower.includes('color')) {
                objetoColorAdicional = adic;
                continue;
            }

            const divCampo = crearSelectAdicional(keyAdicional, adic);

            // Si es "Tipo de Trabajo", colocarlo en el contenedor superior
            if (keyLower.includes('trabajo') || labelLower.includes('trabajo')) {
                if (contenedorTrabajo) contenedorTrabajo.appendChild(divCampo);
            } else {
                // El resto (Tallas, Empaques, etc.) van al contenedor inferior
                if (contenedorAdicionales) contenedorAdicionales.appendChild(divCampo);
            }
        }
    }

    renderizarMuestrasColor(objetoColorAdicional);
    actualizarVisibilidadColores();
}

/**
 * Crea dinámicamente un elemento SELECT para los adicionales.
 */
function crearSelectAdicional(keyAdicional, adic) {
    const divCampo = document.createElement('div');

    const label = document.createElement('label');
    label.htmlFor = `adic-${keyAdicional}`;
    label.className = 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2';
    label.textContent = adic.label;

    const select = document.createElement('select');
    select.id = `adic-${keyAdicional}`;
    select.className = 'w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition font-medium select-adicional';

    const opcionInicial = document.createElement('option');
    opcionInicial.value = '';
    opcionInicial.disabled = true;
    opcionInicial.selected = true;
    opcionInicial.textContent = `-- Selecciona ${(adic.label || '').replace(':', '').trim()} --`;
    select.appendChild(opcionInicial);

    for (const keyOp in adic.opciones) {
        const op = adic.opciones[keyOp];
        const option = document.createElement('option');
        option.value = keyOp;
        option.dataset.extra = op.extra;
        option.textContent = op.nombre;
        select.appendChild(option);
    }

    select.addEventListener('change', () => {
        actualizarVisibilidadColores();
        calcularEnTiempoReal();
    });

    divCampo.appendChild(label);
    divCampo.appendChild(select);
    return divCampo;
}

/**
 * Renderiza los botones circulares con muestras de color.
 */
function renderizarMuestrasColor(adicionalColor) {
    const contenedor = document.getElementById('contenedor-colores');
    const grid = document.getElementById('grid-muestras-color');
    const inputOculto = document.getElementById('color-seleccionado');
    const labelColores = document.getElementById('label-colores');

    if (!contenedor || !grid || !inputOculto) return;

    deseleccionarColor();
    grid.innerHTML = '';

    if (!adicionalColor || !adicionalColor.opciones) {
        contenedor.classList.add('hidden');
        return;
    }

    if (labelColores && adicionalColor.label) {
        const textoLimpio = adicionalColor.label.replace(':', '').trim();
        labelColores.innerHTML = `🎨 ${textoLimpio} <span class="text-blue-900">*</span>`;
    }

    const opciones = adicionalColor.opciones;

    for (const keyColor in opciones) {
        const op = opciones[keyColor];
        const nombreLimpio = (op.nombre || keyColor).toLowerCase().trim();

        let infoColor = null;
        for (const colKey in MAPA_COLORES) {
            if (nombreLimpio.includes(colKey) || keyColor.toLowerCase().includes(colKey)) {
                infoColor = MAPA_COLORES[colKey];
                break;
            }
        }
        if (!infoColor) {
            infoColor = { hex: '#CBD5E1' };
        }

        const btnSwatch = document.createElement('button');
        btnSwatch.type = 'button';
        btnSwatch.className = `muestra-color w-7 h-7 rounded-full transition-all duration-200 transform hover:scale-110 focus:outline-none flex items-center justify-center relative shadow-sm ${
            infoColor.borde ? 'border border-slate-400' : 'border border-transparent'
        }`;
        btnSwatch.style.backgroundColor = infoColor.hex;
        btnSwatch.title = op.nombre;

        const checkIcon = document.createElement('span');
        checkIcon.className = 'check-indicador text-[10px] font-bold hidden ' + (infoColor.hex === '#FFFFFF' ? 'text-slate-900' : 'text-white');
        checkIcon.innerHTML = '✓';
        btnSwatch.appendChild(checkIcon);

        btnSwatch.addEventListener('click', function() {
            seleccionarColor(this, keyColor, op.extra, op.nombre);
        });

        grid.appendChild(btnSwatch);
    }
}

/**
 * Controla la visibilidad de los colores según el "Tipo de trabajo" elegido.
 */
function actualizarVisibilidadColores() {
    const contenedorColores = document.getElementById('contenedor-colores');
    const swatches = document.querySelectorAll('.muestra-color');

    if (!contenedorColores) return;

    if (swatches.length === 0) {
        contenedorColores.classList.add('hidden');
        return;
    }

    // Buscar si existe selector de "Tipo de trabajo"
    const selectores = document.querySelectorAll('.select-adicional');
    let selectTrabajo = null;

    selectores.forEach(select => {
        const labelText = select.previousElementSibling ? select.previousElementSibling.textContent.toLowerCase() : '';
        const idText = select.id.toLowerCase();
        if (labelText.includes('trabajo') || idText.includes('trabajo')) {
            selectTrabajo = select;
        }
    });

    if (selectTrabajo) {
        const valor = selectTrabajo.value;
        const opcionTexto = selectTrabajo.options[selectTrabajo.selectedIndex] 
            ? selectTrabajo.options[selectTrabajo.selectedIndex].textContent.toLowerCase() 
            : '';

        // Si no ha elegido Tipo de Trabajo, el color se oculta
        if (!valor || selectTrabajo.selectedIndex === 0) {
            contenedorColores.classList.add('hidden');
            deseleccionarColor();
            return;
        }

        // Mostrar selector de color
        contenedorColores.classList.remove('hidden');

        const esSublimado = opcionTexto.includes('sublimado');
        let btnBlanco = null;

        swatches.forEach(btn => {
            const nombreColor = (btn.title || '').toLowerCase();
            const esBlanco = nombreColor.includes('blanco');

            if (esBlanco) btnBlanco = btn;

            if (esSublimado) {
                if (esBlanco) {
                    btn.classList.remove('hidden');
                } else {
                    btn.classList.add('hidden');
                    btn.classList.remove('ring-4', 'ring-blue-800', 'scale-110');
                    const check = btn.querySelector('.check-indicador');
                    if (check) check.classList.add('hidden');
                }
            } else {
                btn.classList.remove('hidden');
            }
        });

        // Si es sublimado, seleccionar Blanco automáticamente
        if (esSublimado && btnBlanco) {
            const inputOculto = document.getElementById('color-seleccionado');
            const colorActual = (inputOculto.dataset.nombre || '').toLowerCase();

            if (!colorActual.includes('blanco')) {
                btnBlanco.click();
            }
        }
    } else {
        // Producto sin selector de trabajo (ej. Tazas): mostrar todos los colores normalmente
        contenedorColores.classList.remove('hidden');
        swatches.forEach(btn => btn.classList.remove('hidden'));
    }
}

function deseleccionarColor() {
    const inputOculto = document.getElementById('color-seleccionado');
    const notaCosto = document.getElementById('nota-costo-color');
    if (inputOculto) {
        inputOculto.value = '';
        inputOculto.dataset.extra = '0';
        inputOculto.dataset.nombre = '';
    }
    if (notaCosto) notaCosto.classList.add('hidden');

    document.querySelectorAll('.muestra-color').forEach(btn => {
        btn.classList.remove('ring-4', 'ring-blue-800', 'scale-110');
        const check = btn.querySelector('.check-indicador');
        if (check) check.classList.add('hidden');
    });
}

function seleccionarColor(elementoSeleccionado, keyColor, extraCosto, nombreCompleto) {
    const inputOculto = document.getElementById('color-seleccionado');
    const errorMsg = document.getElementById('error-color');
    const notaCosto = document.getElementById('nota-costo-color');

    document.querySelectorAll('.muestra-color').forEach(btn => {
        btn.classList.remove('ring-4', 'ring-blue-800', 'scale-110');
        const check = btn.querySelector('.check-indicador');
        if (check) check.classList.add('hidden');
    });

    elementoSeleccionado.classList.add('ring-4', 'ring-blue-800', 'scale-110');
    const checkActivo = elementoSeleccionado.querySelector('.check-indicador');
    if (checkActivo) checkActivo.classList.remove('hidden');

    inputOculto.value = keyColor;
    inputOculto.dataset.extra = extraCosto || 0;
    inputOculto.dataset.nombre = nombreCompleto || keyColor;

    if (notaCosto) {
        const extra = parseFloat(extraCosto) || 0;
        if (extra > 0) {
            notaCosto.textContent = `+S/ ${extra.toFixed(2)} por unidad`;
            notaCosto.classList.remove('hidden');
        } else {
            notaCosto.classList.add('hidden');
        }
    }

    if (errorMsg) errorMsg.classList.add('hidden');

    if (typeof calcularEnTiempoReal === 'function') {
        calcularEnTiempoReal();
    }
}

/* 6. SISTEMA DE NOTIFICACIONES TOAST */
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

/* 7. CÁLCULO DE TIEMPO Y FECHA DE ENTREGA */
function sumarDiasHabiles(fechaInicial, diasAñadir) {
    let fecha = new Date(fechaInicial);
    let diasSumados = 0;

    while (diasSumados < diasAñadir) {
        fecha.setDate(fecha.getDate() + 1);
        const diaSemana = fecha.getDay();
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

    if (cantidad < 24) {
        diasBaseMin = 2; diasBaseMax = 2;
    } else if (cantidad >= 24 && cantidad <= 60) {
        diasBaseMin = 4; diasBaseMax = 4;
    } else if (cantidad > 60 && cantidad <= 100) {
        diasBaseMin = 6; diasBaseMax = 7;
    } else {
        diasBaseMin = 8; diasBaseMax = 10;
    }

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

    const horaActual = new Date();
    let fechaInicioConteo = new Date();
    const esDespuesDeLasTres = horaActual.getHours() >= 15;

    if (esDespuesDeLasTres) {
        fechaInicioConteo.setDate(fechaInicioConteo.getDate() + 1);
    }

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

/* 8. MOTOR DE CÁLCULO EN TIEMPO REAL */
function calcularEnTiempoReal() {
    if (!tarifasRCS) return;

    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;
    const cantidad = parseInt(cantidadInput.value);
    const estadoDiseno = estadoDisenoSelect ? estadoDisenoSelect.value : 'listo';

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
    let htmlAdicionalesVista = '';

    const selectoresAdicionales = document.querySelectorAll('.select-adicional');
    selectoresAdicionales.forEach(select => {
        const opcionSeleccionada = select.options[select.selectedIndex];
        if (opcionSeleccionada && !opcionSeleccionada.disabled) {
            const extra = parseFloat(opcionSeleccionada.dataset.extra) || 0;
            costoAdicionalesUnitario += extra;

            const labelTexto = select.previousElementSibling ? select.previousElementSibling.textContent.replace(':', '') : '';

            htmlAdicionalesVista += `
                <div class="flex justify-between items-center text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                    <span class="font-medium">${labelTexto}:</span>
                    <span class="font-semibold text-emerald-400">${opcionSeleccionada.textContent}</span>
                </div>
            `;
        }
    });

    const inputColor = document.getElementById('color-seleccionado');
    if (inputColor && inputColor.value) {
        const extraColor = parseFloat(inputColor.dataset.extra) || 0;
        costoAdicionalesUnitario += extraColor;
        const nombreColorVisual = inputColor.dataset.nombre || inputColor.value;

        htmlAdicionalesVista += `
            <div class="flex justify-between items-center text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <span class="font-medium">Color:</span>
                <span class="font-semibold text-amber-400">${nombreColorVisual}</span>
            </div>
        `;
    }

    const precioUnitarioFinal = precioBaseUnitario + costoAdicionalesUnitario;

    let costoDisenoExtra = 0;
    if (estadoDiseno === 'creacion') {
        costoDisenoExtra = 15.00;
    }

    const subtotalProductos = cantidad * precioUnitarioFinal;
    const totalFinal = subtotalProductos + costoDisenoExtra;

    const infoEntrega = calcularTiempoEntrega(cantidad, estadoDiseno);

    /* UPSELLING */
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
                <div class="font-bold flex items-center gap-1.5 text-amber-400">💡 ¡Aprovecha la Tarifa por Docena!</div>
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
                <div class="font-bold flex items-center gap-1.5 text-blue-400">ℹ️ Tarifa Especial por Ciento</div>
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
                <div class="font-bold flex items-center gap-1.5 text-amber-400">🔥 ¡Descuento por Ciento Cercano!</div>
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

    const nombreCat = tarifasRCS[catKey].nombre;
    const nombreProd = datosProducto.nombre;

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

            ${htmlBannerUpsell}

            <div class="bg-slate-800 p-4 rounded-xl border border-slate-700/80 text-center my-3">
                <span class="block text-xs uppercase tracking-wider text-slate-400 mb-1">Monto Total Estimado</span>
                <span class="text-3xl font-black text-emerald-400">S/ ${totalFinal.toFixed(2)}</span>
            </div>

            <button onclick="abrirModalWhatsApp()" 
               class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 text-sm text-center">
                <svg class="w-5 h-5 fill-current inline" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                Pedir esta cotización por WhatsApp
            </button>
        </div>
    `;
}

/* 9. MODAL DE CLIENTE Y VALIDACIONES */
function abrirModalWhatsApp() {
    const modal = document.getElementById('modal-cliente');
    if (modal) modal.classList.remove('hidden');
}

function cerrarModalWhatsApp() {
    const modal = document.getElementById('modal-cliente');
    if (modal) modal.classList.add('hidden');
}

function actualizarPlaceholderDoc() {
    const tipo = document.getElementById('cliente-tipo-doc').value;
    const inputDoc = document.getElementById('cliente-documento');

    if (tipo === 'dni') {
        inputDoc.placeholder = "Ej: 71234567 (8 dígitos)";
    } else if (tipo === 'ce') {
        inputDoc.placeholder = "Ej: 001234567 (9 caracteres)";
    } else if (tipo === 'ruc') {
        inputDoc.placeholder = "Ej: 20600000000 (11 dígitos)";
    }
}

function validarYEnviarWhatsApp() {
    const inputNombre = document.getElementById('cliente-nombre');
    const selectTipoDoc = document.getElementById('cliente-tipo-doc');
    const inputDoc = document.getElementById('cliente-documento');
    const inputTel = document.getElementById('cliente-telefono');
    const inputCorreo = document.getElementById('cliente-correo');

    const errNombre = document.getElementById('error-nombre');
    const errDoc = document.getElementById('error-documento');
    const errTel = document.getElementById('error-telefono');
    const errCorreo = document.getElementById('error-correo');

    if (errNombre) errNombre.classList.add('hidden');
    if (errDoc) errDoc.classList.add('hidden');
    if (errTel) errTel.classList.add('hidden');
    if (errCorreo) errCorreo.classList.add('hidden');

    let esValido = true;

    const nombreVal = inputNombre.value.trim();
    if (nombreVal.length < 3) {
        if (errNombre) errNombre.classList.remove('hidden');
        esValido = false;
    }

    const tipoDoc = selectTipoDoc.value;
    const docVal = inputDoc.value.trim();

    if (tipoDoc === 'dni') {
        const regexDNI = /^\d{8}$/;
        if (!regexDNI.test(docVal)) {
            if (errDoc) {
                errDoc.textContent = '⚠️ El DNI debe tener exactamente 8 dígitos numéricos.';
                errDoc.classList.remove('hidden');
            }
            esValido = false;
        }
    } else if (tipoDoc === 'ce') {
        const regexCE = /^[a-zA-Z0-9]{9}$/;
        if (!regexCE.test(docVal)) {
            if (errDoc) {
                errDoc.textContent = '⚠️ El Carnet de Extranjería debe tener exactamente 9 caracteres alfanuméricos.';
                errDoc.classList.remove('hidden');
            }
            esValido = false;
        }
    } else if (tipoDoc === 'ruc') {
        const regexRUC = /^\d{11}$/;
        if (!regexRUC.test(docVal)) {
            if (errDoc) {
                errDoc.textContent = '⚠️ El RUC debe tener exactamente 11 dígitos numéricos.';
                errDoc.classList.remove('hidden');
            }
            esValido = false;
        }
    }

    const telVal = inputTel.value.trim();
    const regexTel = /^[0-9\s+]{9,9}$/;
    if (!regexTel.test(telVal)) {
        if (errTel) errTel.classList.remove('hidden');
        esValido = false;
    }

    const correoVal = inputCorreo.value.trim();
    if (correoVal !== "") {
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexCorreo.test(correoVal)) {
            if (errCorreo) errCorreo.classList.remove('hidden');
            esValido = false;
        }
    }

    if (!esValido) return;

    const etiquetaTipoDoc = tipoDoc === 'dni' ? 'DNI' : (tipoDoc === 'ce' ? 'Carnet de Extranjería' : 'RUC');

    ejecutarEnvioWhatsApp(nombreVal, `${etiquetaTipoDoc}: ${docVal}`, telVal, correoVal);
    cerrarModalWhatsApp();
}

function ejecutarEnvioWhatsApp(nombre, documento, telefono, correo) {
    const catKey = categoriaSelect.value;
    const prodKey = productoSelect.value;
    const cantidad = parseInt(cantidadInput.value);
    const estadoDiseno = estadoDisenoSelect ? estadoDisenoSelect.value : 'listo';

    if (!catKey || !prodKey || isNaN(cantidad)) return;

    const datosProducto = tarifasRCS[catKey].productos[prodKey];
    const escalasPrecios = datosProducto.precios;

    let precioBaseUnitario = 0;
    if (cantidad >= 100) precioBaseUnitario = escalasPrecios.ciento;
    else if (cantidad >= 24) precioBaseUnitario = escalasPrecios.docenas;
    else precioBaseUnitario = escalasPrecios.unidad;

    let costoAdicionalesUnitario = 0;
    let textoAdicionalesMensaje = '';

    const selectoresAdicionales = document.querySelectorAll('.select-adicional');
    selectoresAdicionales.forEach(select => {
        const opcionSeleccionada = select.options[select.selectedIndex];
        if (opcionSeleccionada && !opcionSeleccionada.disabled) {
            const extra = parseFloat(opcionSeleccionada.dataset.extra) || 0;
            costoAdicionalesUnitario += extra;
            const labelTexto = select.previousElementSibling ? select.previousElementSibling.textContent.replace(':', '') : '';
            textoAdicionalesMensaje += `🔹 *${labelTexto}:* ${opcionSeleccionada.textContent}\n`;
        }
    });

    const inputColor = document.getElementById('color-seleccionado');
    if (inputColor && inputColor.value) {
        const extraColor = parseFloat(inputColor.dataset.extra) || 0;
        costoAdicionalesUnitario += extraColor;
        const nombreColorVisual = inputColor.dataset.nombre || inputColor.value;
        textoAdicionalesMensaje += `🎨 *Color:* ${nombreColorVisual}\n`;
    }

    const precioUnitarioFinal = precioBaseUnitario + costoAdicionalesUnitario;

    let costoDisenoExtra = 0;
    let textoEstadoDiseno = "Diseño listo para sublimar";
    if (estadoDiseno === 'retoque') {
        textoEstadoDiseno = "Requiere retoque (+1 día hábil)";
    } else if (estadoDiseno === 'creacion') {
        costoDisenoExtra = 15.00;
        textoEstadoDiseno = "Creación desde cero (+2 días hábiles | +S/ 15.00)";
    }

    const totalFinal = (cantidad * precioUnitarioFinal) + costoDisenoExtra;
    const infoEntrega = calcularTiempoEntrega(cantidad, estadoDiseno);

    const telefonoRCS = "51959562867";
    const nombreCat = tarifasRCS[catKey].nombre;
    const nombreProd = datosProducto.nombre;

    const mensajeTexto =
        `✨ *¡NUEVA COTIZACIÓN DESDE LA WEB!* ✨\n\n` +
        `👤 *DATOS DEL CLIENTE*\n` +
        `📛 *Cliente:* ${nombre}\n` +
        `🆔 *${documento}*\n` +
        `📞 *Teléfono:* ${telefono}\n` +
        `✉️ *Correo:* ${correo ? correo : 'No especificado'}\n\n` +
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

    window.open(urlWhatsApp, '_blank');
    limpiarFormulario();
}

/* 10. REINICIO Y LIMPIEZA */
function limpiarFormulario() {
    const inputNombre = document.getElementById('cliente-nombre');
    const selectTipoDoc = document.getElementById('cliente-tipo-doc');
    const inputDoc = document.getElementById('cliente-documento');
    const inputTel = document.getElementById('cliente-telefono');
    const inputCorreo = document.getElementById('cliente-correo');

    if (inputNombre) inputNombre.value = '';
    if (selectTipoDoc) selectTipoDoc.value = 'dni';
    if (inputDoc) inputDoc.value = '';
    if (inputTel) inputTel.value = '';
    if (inputCorreo) inputCorreo.value = '';

    actualizarPlaceholderDoc();

    if (categoriaSelect) categoriaSelect.selectedIndex = 0;
    if (categoriaSelect) categoriaSelect.dispatchEvent(new Event('change'));

    if (productoSelect) productoSelect.selectedIndex = 0;
    if (cantidadInput) cantidadInput.value = '';
    if (estadoDisenoSelect) estadoDisenoSelect.selectedIndex = 0;

    if (contenedorTrabajo) contenedorTrabajo.innerHTML = '';
    if (contenedorAdicionales) contenedorAdicionales.innerHTML = '';

    deseleccionarColor();

    const contenedorColores = document.getElementById('contenedor-colores');
    if (contenedorColores) contenedorColores.classList.add('hidden');
}

/* 11. INICIALIZACIÓN DE ESCUCHADORES */
window.addEventListener('DOMContentLoaded', cargarTarifas);

categoriaSelect.addEventListener('change', () => {
    cantidadInput.value = '';
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