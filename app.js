// CONFIGURACIÓN - Sistema BA Language

const SUPABASE_URL = ‘https://nqidcovrjzywiilzdffy.supabase.co’;
const SUPABASE_KEY = ‘eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaWRjb3Zyanp5d2lpbHpkZmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjczMjEsImV4cCI6MjA4Njc0MzMyMX0.bbj4aBkoKKP64oS_4gVQlIdNXIhnj4dWSk7FxOC0Dpo’;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let isAdmin = false;
let editingId = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener(‘DOMContentLoaded’, async () => {
const today = new Date().toISOString().split(‘T’)[0];
if (document.getElementById(‘fechaClase’)) {
document.getElementById(‘fechaClase’).value = today;
}

```
// Configurar mes actual para reportes
const currentMonth = new Date().toISOString().slice(0, 7);
if (document.getElementById('reporteMes')) {
    document.getElementById('reporteMes').value = currentMonth;
}
if (document.getElementById('reporteProfesoraMes')) {
    document.getElementById('reporteProfesoraMes').value = currentMonth;
}

checkAuth();
```

});

// ==================== AUTENTICACIÓN ====================
async function checkAuth() {
// Verificar si hay un token de recuperación en la URL (desde el email)
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const type = hashParams.get(‘type’);

```
if (type === 'recovery') {
    // Usuario viene desde el email de recuperación
    showScreen('resetPasswordScreen');
    return;
}

// Verificar si hay sesión activa en Supabase Auth
const { data: { session } } = await supabase.auth.getSession();

if (session) {
    // Usuario ya está logueado
    await loadUser(session.user.email);
} else {
    // No hay sesión, mostrar login
    showScreen('loginScreen');
}
```

}

async function login() {
const email = document.getElementById(‘loginEmail’).value.trim();
const password = document.getElementById(‘loginPassword’).value;

```
if (!email || !password) {
    showError('loginError', 'Por favor ingresá tu email y contraseña');
    return;
}

// Intentar login con Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
});

if (error) {
    console.error('Error de login:', error);
    if (error.message.includes('Invalid login credentials')) {
        showError('loginError', 'Email o contraseña incorrectos');
    } else if (error.message.includes('Email not confirmed')) {
        showError('loginError', 'Por favor confirmá tu email antes de ingresar');
    } else {
        showError('loginError', 'Error al iniciar sesión: ' + error.message);
    }
    return;
}

// Login exitoso, verificar que existe en la tabla profesoras
const { data: profesora, error: profError } = await supabase
    .from('profesoras')
    .select('*')
    .eq('email', email)
    .eq('activo', true)
    .single();

if (profError || !profesora) {
    showError('loginError', 'Usuario no autorizado o inactivo');
    await supabase.auth.signOut();
    return;
}

// Todo OK, cargar usuario
await loadUser(email);
```

}

async function forgotPassword() {
const email = document.getElementById(‘loginEmail’).value.trim();

```
if (!email) {
    showError('loginError', 'Por favor ingresá tu email para recuperar la contraseña');
    return;
}

const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
});

if (error) {
    showError('loginError', 'Error al enviar email: ' + error.message);
} else {
    showError('loginError', '✅ Te enviamos un email con instrucciones para recuperar tu contraseña', 'success');
}
```

}

async function resetPassword() {
const newPassword = document.getElementById(‘newPassword’).value;
const confirmPassword = document.getElementById(‘confirmPassword’).value;

```
if (!newPassword || !confirmPassword) {
    showError('resetError', 'Por favor completá ambos campos');
    return;
}

if (newPassword.length < 6) {
    showError('resetError', 'La contraseña debe tener al menos 6 caracteres');
    return;
}

if (newPassword !== confirmPassword) {
    showError('resetError', 'Las contraseñas no coinciden');
    return;
}

const { error } = await supabase.auth.updateUser({
    password: newPassword
});

if (error) {
    showError('resetError', 'Error al cambiar la contraseña: ' + error.message);
} else {
    showError('resetError', '✅ Contraseña cambiada exitosamente. Redirigiendo...', 'success');
    
    // Esperar 2 segundos y hacer logout para que ingrese con la nueva contraseña
    setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = window.location.origin; // Recargar sin hash
    }, 2000);
}
```

}

async function loadUser(email) {
const { data, error } = await supabase
.from(‘profesoras’)
.select(’*’)
.eq(‘email’, email)
.single();

```
if (data) {
    currentUser = data;
    isAdmin = data.es_admin;
    document.getElementById('userName').textContent = data.nombre;
    
    if (!isAdmin) {
        document.getElementById('adminMenu').style.display = 'none';
    }
    
    showScreen('mainMenu');
}
```

}

async function logout() {
await supabase.auth.signOut();
currentUser = null;
isAdmin = false;
showScreen(‘loginScreen’);
document.getElementById(‘loginEmail’).value = ‘’;
document.getElementById(‘loginPassword’).value = ‘’;
}

// ==================== NAVEGACIÓN ====================
function showScreen(screenId) {
const screens = [
‘loginScreen’, ‘mainMenu’, ‘registroAsistencia’, ‘adminPanel’,
‘clientesPanel’, ‘cursosPanel’, ‘profesorasPanel’, ‘participantesPanel’,
‘reportesPanel’, ‘reporteClienteScreen’, ‘reporteProfesoraScreen’, ‘reporteFacturacionScreen’,
‘resetPasswordScreen’, ‘agendaScreen’, ‘buscarDisponibilidadScreen’
];
screens.forEach(screen => {
const element = document.getElementById(screen);
if (element) element.classList.add(‘hidden’);
});
const element = document.getElementById(screenId);
if (element) element.classList.remove(‘hidden’);
}

function backToMenu() {
showScreen(‘mainMenu’);
}

// ==================== REGISTRO DE ASISTENCIA ====================
async function showRegistroAsistencia() {
showScreen(‘registroAsistencia’);
await loadCursosProfesor();
}

async function loadCursosProfesor() {
const select = document.getElementById(‘cursoSelect’);
select.innerHTML = ‘<option value="">– Seleccione un curso –</option>’;

```
const { data, error } = await supabase
    .from('cursos_profesoras')
    .select(`
        curso_id,
        cursos (
            id,
            codigo_curso,
            idioma,
            nivel,
            duracion_horas,
            clientes (nombre)
        )
    `)
    .eq('profesora_id', currentUser.id)
    .eq('activo', true);

if (data) {
    data.forEach(item => {
        const curso = item.cursos;
        const option = document.createElement('option');
        option.value = curso.id;
        option.textContent = `${curso.codigo_curso} - ${curso.idioma} ${curso.nivel} - ${curso.clientes.nombre}`;
        option.dataset.duracion = curso.duracion_horas;
        select.appendChild(option);
    });
}
```

}

async function loadParticipantes() {
const cursoId = document.getElementById(‘cursoSelect’).value;

```
if (!cursoId) {
    document.getElementById('claseForm').classList.add('hidden');
    return;
}

document.getElementById('claseForm').classList.remove('hidden');

const select = document.getElementById('cursoSelect');
const duracion = select.options[select.selectedIndex].dataset.duracion;
document.getElementById('duracionClase').value = duracion;

const { data, error } = await supabase
    .from('cursos_participantes')
    .select(`
        participante_id,
        participantes (
            id,
            nombre
        )
    `)
    .eq('curso_id', cursoId)
    .eq('activo', true);

const container = document.getElementById('participantesList');
container.innerHTML = '';

if (data && data.length > 0) {
    document.getElementById('participantesSection').classList.remove('hidden');
    
    data.forEach(item => {
        const participante = item.participantes;
        const div = document.createElement('div');
        div.className = 'participante-asistencia';
        div.style.cssText = 'padding: 1rem; margin: 0.5rem 0; background: white; border-radius: 5px; border: 1px solid var(--light); max-width: 500px;';
        div.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.75rem;">${participante.nombre}</div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 5px; background: #f8f9fa;">
                    <input type="radio" name="asist_${participante.id}" value="presente" checked style="margin-right: 0.75rem; width: 18px; height: 18px; flex-shrink: 0;">
                    <span>Presente</span>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 5px; background: #f8f9fa;">
                    <input type="radio" name="asist_${participante.id}" value="ausente_con_aviso" style="margin-right: 0.75rem; width: 18px; height: 18px; flex-shrink: 0;">
                    <span>Ausente con aviso</span>
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 5px; background: #f8f9fa;">
                    <input type="radio" name="asist_${participante.id}" value="ausente_sin_aviso" style="margin-right: 0.75rem; width: 18px; height: 18px; flex-shrink: 0;">
                    <span>Ausente sin aviso</span>
                </label>
            </div>
        `;
        container.appendChild(div);
    });
} else {
    document.getElementById('participantesSection').classList.add('hidden');
}
```

}

function toggleCancelacion() {
const estado = document.getElementById(‘estadoClase’).value;
const motivoDiv = document.getElementById(‘motivoCancelacion’);
const temasDiv = document.getElementById(‘temasSection’);
const partDiv = document.getElementById(‘participantesSection’);

```
if (estado === 'cancelada_profesora') {
    motivoDiv.classList.remove('hidden');
    temasDiv.classList.add('hidden');
    partDiv.classList.add('hidden');
} else if (estado === 'cancelada_feriado' || estado === 'cancelada_empresa') {
    motivoDiv.classList.add('hidden');
    temasDiv.classList.add('hidden');
    partDiv.classList.add('hidden');
} else {
    motivoDiv.classList.add('hidden');
    temasDiv.classList.remove('hidden');
    const cursoId = document.getElementById('cursoSelect').value;
    if (cursoId) {
        partDiv.classList.remove('hidden');
    }
}
```

}

function toggleRecuperacion() {
const esRecup = document.getElementById(‘esRecuperacion’).checked;
const recupDiv = document.getElementById(‘recuperacionInfo’);

```
if (esRecup) {
    recupDiv.classList.remove('hidden');
} else {
    recupDiv.classList.add('hidden');
}
```

}

async function guardarAsistencia() {
const cursoId = document.getElementById(‘cursoSelect’).value;
const fecha = document.getElementById(‘fechaClase’).value;
const hora = document.getElementById(‘horaClase’).value;
const duracion = document.getElementById(‘duracionClase’).value;
const estado = document.getElementById(‘estadoClase’).value;
const temas = document.getElementById(‘temasTratados’).value;
const esRecup = document.getElementById(‘esRecuperacion’).checked;
const fechaRecup = document.getElementById(‘fechaRecuperada’).value;
const motivo = document.getElementById(‘motivoText’).value;

```
if (!cursoId || !fecha || !hora || !duracion) {
    showAlert('asistenciaAlert', 'Por favor completá todos los campos obligatorios', 'error');
    return;
}

if (estado === 'dictada' && !temas) {
    showAlert('asistenciaAlert', 'Por favor ingresá los temas tratados', 'error');
    return;
}

if (estado === 'cancelada_profesora' && !motivo) {
    showAlert('asistenciaAlert', 'Por favor ingresá el motivo de cancelación', 'error');
    return;
}

const { data: claseData, error: claseError } = await supabase
    .from('clases')
    .insert({
        curso_id: cursoId,
        profesora_id: currentUser.id,
        fecha: fecha,
        hora_inicio: hora,
        duracion_horas: duracion,
        estado: estado,
        motivo_cancelacion: estado === 'cancelada_profesora' ? motivo : null,
        es_recuperacion: esRecup,
        fecha_clase_recuperada: esRecup ? fechaRecup : null,
        temas_tratados: estado === 'dictada' ? temas : null,
        created_by: currentUser.id
    })
    .select()
    .single();

if (claseError) {
    showAlert('asistenciaAlert', 'Error al guardar la clase: ' + claseError.message, 'error');
    return;
}

if (estado === 'dictada') {
    const participantesContainers = document.querySelectorAll('#participantesList .participante-asistencia');
    const asistencias = [];
    
    participantesContainers.forEach(container => {
        const radioChecked = container.querySelector('input[type="radio"]:checked');
        if (radioChecked) {
            const participanteId = radioChecked.name.replace('asist_', '');
            const estadoAsistencia = radioChecked.value;
            asistencias.push({
                clase_id: claseData.id,
                participante_id: participanteId,
                estado_asistencia: estadoAsistencia,
                presente: estadoAsistencia === 'presente'
            });
        }
    });
    
    // Verificar si TODOS los participantes están ausentes con aviso
    if (asistencias.length > 0) {
        const todosAusentesConAviso = asistencias.every(a => a.estado_asistencia === 'ausente_con_aviso');
        
        if (todosAusentesConAviso && !esRecup) {
            // Alerta importante: todos ausentes con aviso
            const confirmar = confirm(
                '⚠️ ATENCIÓN: Todos los participantes están marcados como "Ausentes con aviso".\n\n' +
                'Recordá que según el contrato con el cliente, estos participantes tienen DERECHO a recuperar esta clase.\n\n' +
                'Es importante que coordines la recuperación de esta clase con los participantes.\n\n' +
                '¿Querés continuar guardando esta clase de todas formas?'
            );
            
            if (!confirmar) {
                // Si cancela, borrar la clase que se creó
                await supabase.from('clases').delete().eq('id', claseData.id);
                return;
            }
        }
        
        const { error: asistError } = await supabase
            .from('asistencias')
            .insert(asistencias);
        
        if (asistError) {
            showAlert('asistenciaAlert', 'Error al guardar asistencias: ' + asistError.message, 'error');
            return;
        }
    }
}

showAlert('asistenciaAlert', '✓ Asistencia guardada correctamente', 'success');

setTimeout(() => {
    document.getElementById('cursoSelect').value = '';
    document.getElementById('claseForm').classList.add('hidden');
    document.getElementById('asistenciaAlert').classList.add('hidden');
    document.getElementById('temasTratados').value = '';
    document.getElementById('motivoText').value = '';
    document.getElementById('esRecuperacion').checked = false;
    document.getElementById('fechaRecuperada').value = '';
    document.getElementById('estadoClase').value = 'dictada';
    toggleCancelacion();
    toggleRecuperacion();
}, 2000);
```

}

// ==================== ADMINISTRACIÓN ====================
function showAdmin() {
if (!isAdmin) {
alert(‘No tenés permisos de administrador’);
return;
}
showScreen(‘adminPanel’);
}

// ==================== CLIENTES ====================
async function showClientesPanel() {
showScreen(‘clientesPanel’);
await loadClientes();
}

async function loadClientes() {
const { data, error } = await supabase
.from(‘clientes’)
.select(’*’)
.order(‘nombre’);

```
const tbody = document.querySelector('#clientesTable tbody');
tbody.innerHTML = '';

if (data && data.length > 0) {
    data.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cliente.codigo}</strong></td>
            <td>${cliente.nombre}</td>
            <td><span class="badge ${cliente.activo ? 'badge-success' : 'badge-danger'}">${cliente.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-small" onclick="editCliente('${cliente.id}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteCliente('${cliente.id}', '${cliente.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
} else {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-state-icon">📋</div>No hay clientes registrados</td></tr>';
}
```

}

function showClienteModal(id = null) {
editingId = id;
const modal = document.getElementById(‘clienteModal’);
const title = document.getElementById(‘clienteModalTitle’);

```
document.getElementById('clienteNombre').value = '';
document.getElementById('clienteCodigo').value = '';
document.getElementById('clienteActivo').checked = true;
document.getElementById('clienteModalAlert').classList.add('hidden');

if (id) {
    title.textContent = 'Editar Cliente';
    loadClienteData(id);
} else {
    title.textContent = 'Nuevo Cliente';
}

modal.classList.add('active');
```

}

async function loadClienteData(id) {
const { data, error } = await supabase
.from(‘clientes’)
.select(’*’)
.eq(‘id’, id)
.single();

```
if (data) {
    document.getElementById('clienteNombre').value = data.nombre;
    document.getElementById('clienteCodigo').value = data.codigo;
    document.getElementById('clienteActivo').checked = data.activo;
}
```

}

async function saveCliente() {
const nombre = document.getElementById(‘clienteNombre’).value.trim();
const codigo = document.getElementById(‘clienteCodigo’).value.trim().toUpperCase();
const activo = document.getElementById(‘clienteActivo’).checked;

```
if (!nombre || !codigo) {
    showModalAlert('clienteModalAlert', 'Por favor completá todos los campos obligatorios', 'error');
    return;
}

if (codigo.length !== 2) {
    showModalAlert('clienteModalAlert', 'El código debe tener exactamente 2 letras', 'error');
    return;
}

const clienteData = { nombre, codigo, activo };

let result;
if (editingId) {
    result = await supabase
        .from('clientes')
        .update(clienteData)
        .eq('id', editingId);
} else {
    result = await supabase
        .from('clientes')
        .insert(clienteData);
}

if (result.error) {
    if (result.error.code === '23505') {
        showModalAlert('clienteModalAlert', 'Ya existe un cliente con ese código', 'error');
    } else {
        showModalAlert('clienteModalAlert', 'Error al guardar: ' + result.error.message, 'error');
    }
    return;
}

closeModal('clienteModal');
await loadClientes();
```

}

async function editCliente(id) {
showClienteModal(id);
}

async function deleteCliente(id, nombre) {
if (!confirm(`¿Estás seguro de eliminar el cliente "${nombre}"?\n\nEsto también eliminará todos sus cursos asociados.`)) {
return;
}

```
const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
}

await loadClientes();
```

}

// ==================== CURSOS ====================
async function showCursosPanel() {
showScreen(‘cursosPanel’);
await loadFilterClientes();
await loadCursos();
}

async function loadFilterClientes() {
const { data, error } = await supabase
.from(‘clientes’)
.select(’*’)
.eq(‘activo’, true)
.order(‘nombre’);

```
const select = document.getElementById('filterCliente');
select.innerHTML = '<option value="">Todos los clientes</option>';

if (data) {
    data.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}
```

}

async function loadCursos() {
const filtroCliente = document.getElementById(‘filterCliente’).value;

```
let query = supabase
    .from('cursos')
    .select(`
        *,
        clientes (nombre)
    `)
    .order('codigo_curso');

if (filtroCliente) {
    query = query.eq('cliente_id', filtroCliente);
}

const { data, error } = await query;

const tbody = document.querySelector('#cursosTable tbody');
tbody.innerHTML = '';

if (data && data.length > 0) {
    data.forEach(curso => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${curso.codigo_curso}</strong></td>
            <td>${curso.clientes.nombre}</td>
            <td>${curso.idioma}</td>
            <td><span class="badge badge-info">${curso.nivel}</span></td>
            <td>${curso.tipo === 'individual' ? 'Individual' : 'Grupal'}</td>
            <td>${curso.duracion_horas}h</td>
            <td>${curso.frecuencia_semanal}x semana</td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-small" onclick="editCurso('${curso.id}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteCurso('${curso.id}', '${curso.codigo_curso}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
} else {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state-icon">📚</div>No hay cursos registrados</td></tr>';
}
```

}

async function showCursoModal(id = null) {
editingId = id;
const modal = document.getElementById(‘cursoModal’);
const title = document.getElementById(‘cursoModalTitle’);

```
// Limpiar formulario
document.getElementById('cursoCliente').value = '';
document.getElementById('cursoIdioma').value = 'inglés';
document.getElementById('cursoNivel').value = 'A0';
document.getElementById('cursoCodigo').value = '';
document.getElementById('cursoTipo').value = 'grupal';
document.getElementById('cursoDuracion').value = '';
document.getElementById('cursoFrecuencia').value = '';
document.getElementById('cursoProfesora').value = '';
document.getElementById('cursoModalAlert').classList.add('hidden');
limpiarHorarios();

// Cargar clientes
await loadClientesForCurso();
// Cargar profesoras
await loadProfesorasForCurso();

if (id) {
    title.textContent = 'Editar Curso';
    const participantesAsignados = await loadCursoData(id);
    // Cargar participantes DESPUÉS de cargar los datos (ya tiene cliente seleccionado)
    await loadParticipantesForCurso();
    // AHORA sí marcar los participantes que estaban asignados
    if (participantesAsignados && participantesAsignados.length > 0) {
        participantesAsignados.forEach(p => {
            const checkbox = document.getElementById(`cursopart_${p.participante_id}`);
            if (checkbox) checkbox.checked = true;
        });
    }
} else {
    title.textContent = 'Nuevo Curso';
    // Para curso nuevo, mostrar mensaje inicial
    await loadParticipantesForCurso();
}

modal.classList.add('active');
```

}

async function loadClientesForCurso() {
const { data, error } = await supabase
.from(‘clientes’)
.select(’*’)
.eq(‘activo’, true)
.order(‘nombre’);

```
const select = document.getElementById('cursoCliente');
select.innerHTML = '<option value="">-- Seleccione un cliente --</option>';

if (data) {
    data.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        option.dataset.codigo = cliente.codigo;
        select.appendChild(option);
    });
}
```

}

async function loadProfesorasForCurso() {
const { data, error } = await supabase
.from(‘profesoras’)
.select(’*’)
.eq(‘activo’, true)
.order(‘nombre’);

```
const select = document.getElementById('cursoProfesora');
select.innerHTML = '<option value="">-- Sin asignar --</option>';

if (data) {
    data.forEach(profesora => {
        const option = document.createElement('option');
        option.value = profesora.id;
        option.textContent = profesora.nombre;
        select.appendChild(option);
    });
}
```

}

async function loadParticipantesForCurso() {
const clienteId = document.getElementById(‘cursoCliente’).value;
console.log(‘loadParticipantesForCurso - Cliente ID:’, clienteId);

```
// Si no hay cliente seleccionado, no mostrar participantes
if (!clienteId) {
    const container = document.getElementById('cursoParticipantes');
    container.innerHTML = '<p style="color: #999; padding: 1rem;">Primero seleccioná un cliente</p>';
    return;
}

const { data, error } = await supabase
    .from('participantes')
    .select('*')
    .eq('activo', true)
    .eq('cliente_id', clienteId)
    .order('nombre');

console.log('Participantes encontrados:', data);
console.log('Error (si hay):', error);

const container = document.getElementById('cursoParticipantes');
container.innerHTML = '';

if (data && data.length > 0) {
    data.forEach(participante => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="cursopart_${participante.id}" value="${participante.id}">
            <label for="cursopart_${participante.id}">${participante.nombre}</label>
        `;
        container.appendChild(div);
    });
} else {
    container.innerHTML = '<p style="color: #999; padding: 1rem;">No hay participantes asignados a este cliente</p>';
}
```

}

async function generateCodigoCurso() {
const clienteSelect = document.getElementById(‘cursoCliente’);
const nivel = document.getElementById(‘cursoNivel’).value;

```
if (!clienteSelect.value || !nivel) {
    document.getElementById('cursoCodigo').value = '';
    return;
}

const codigoCliente = clienteSelect.options[clienteSelect.selectedIndex].dataset.codigo;

// Obtener el siguiente número consecutivo
const { data, error } = await supabase
    .from('cursos')
    .select('codigo_curso')
    .eq('cliente_id', clienteSelect.value)
    .like('codigo_curso', `${codigoCliente}-${nivel}-%`);

let consecutivo = 1;
if (data && data.length > 0) {
    const numeros = data.map(c => {
        const partes = c.codigo_curso.split('-');
        return parseInt(partes[2]) || 0;
    });
    consecutivo = Math.max(...numeros) + 1;
}

const codigo = `${codigoCliente}-${nivel}-${consecutivo.toString().padStart(2, '0')}`;
document.getElementById('cursoCodigo').value = codigo;
```

}

async function loadCursoData(id) {
const { data: curso, error } = await supabase
.from(‘cursos’)
.select(’*’)
.eq(‘id’, id)
.single();

```
if (curso) {
    document.getElementById('cursoCliente').value = curso.cliente_id;
    document.getElementById('cursoIdioma').value = curso.idioma;
    document.getElementById('cursoNivel').value = curso.nivel;
    document.getElementById('cursoCodigo').value = curso.codigo_curso;
    document.getElementById('cursoTipo').value = curso.tipo;
    document.getElementById('cursoDuracion').value = curso.duracion_horas;
    document.getElementById('cursoFrecuencia').value = curso.frecuencia_semanal;
    
    // Cargar horarios desde horarios_cursos
    const { data: horarios } = await supabase
        .from('horarios_cursos')
        .select('*')
        .eq('curso_id', id)
        .order('dia_semana');
    
    if (horarios && horarios.length > 0) {
        horarios.forEach(horario => {
            agregarHorario(horario);
        });
    }
    
    // Cargar profesora asignada
    const { data: profesora } = await supabase
        .from('cursos_profesoras')
        .select('profesora_id')
        .eq('curso_id', id)
        .eq('activo', true)
        .single();
    
    if (profesora) {
        document.getElementById('cursoProfesora').value = profesora.profesora_id;
    }
    
    // Devolver los participantes asignados para marcarlos después
    const { data: participantes } = await supabase
        .from('cursos_participantes')
        .select('participante_id')
        .eq('curso_id', id)
        .eq('activo', true);
    
    return participantes || [];
}
return [];
```

}

let horariosCount = 0;
let horariosData = [];

function agregarHorario(horario = null) {
const container = document.getElementById(‘horariosContainer’);
const index = horariosCount++;

```
const dia = horario ? horario.dia_semana : '';
const inicio = horario ? horario.hora_inicio : '';
const fin = horario ? horario.hora_fin : '';
const horarioId = horario ? horario.id : null;

const div = document.createElement('div');
div.className = 'form-row';
div.id = `horario_${index}`;
div.style.alignItems = 'flex-end';
div.style.marginBottom = '0.5rem';
div.innerHTML = `
    <div class="form-group">
        <label>Día</label>
        <select class="horario-dia" data-index="${index}">
            <option value="">-- Día --</option>
            <option value="1" ${dia == 1 ? 'selected' : ''}>Lunes</option>
            <option value="2" ${dia == 2 ? 'selected' : ''}>Martes</option>
            <option value="3" ${dia == 3 ? 'selected' : ''}>Miércoles</option>
            <option value="4" ${dia == 4 ? 'selected' : ''}>Jueves</option>
            <option value="5" ${dia == 5 ? 'selected' : ''}>Viernes</option>
            <option value="6" ${dia == 6 ? 'selected' : ''}>Sábado</option>
            <option value="0" ${dia == 0 ? 'selected' : ''}>Domingo</option>
        </select>
    </div>
    <div class="form-group">
        <label>Hora inicio</label>
        <input type="time" class="horario-inicio" data-index="${index}" value="${inicio}" placeholder="09:15" onchange="calcularHoraFin(${index})">
    </div>
    <div class="form-group">
        <label>Hora fin</label>
        <input type="time" class="horario-fin" data-index="${index}" value="${fin}" placeholder="10:45" readonly style="background: #f0f0f0;">
    </div>
    <div class="form-group">
        <button type="button" class="btn btn-danger btn-small" onclick="eliminarHorario(${index})" style="padding: 0.5rem 0.75rem;">×</button>
    </div>
`;

container.appendChild(div);

if (horarioId) {
    horariosData[index] = { id: horarioId };
}

// Si ya tiene hora inicio, calcular hora fin
if (inicio && !fin) {
    calcularHoraFin(index);
}
```

}

function calcularHoraFin(index) {
const duracion = parseFloat(document.getElementById(‘cursoDuracion’).value);
const horaInicio = document.querySelector(`.horario-inicio[data-index="${index}"]`).value;

```
if (!duracion || !horaInicio) {
    return;
}

// Convertir hora inicio a minutos
const [h, m] = horaInicio.split(':').map(Number);
const minutosInicio = h * 60 + m;

// Sumar duración
const minutosFin = minutosInicio + (duracion * 60);

// Convertir de vuelta a formato HH:MM
const horaFin = Math.floor(minutosFin / 60);
const minutoFin = minutosFin % 60;

const horaFinStr = `${String(horaFin).padStart(2, '0')}:${String(minutoFin).padStart(2, '0')}`;

document.querySelector(`.horario-fin[data-index="${index}"]`).value = horaFinStr;
```

}

function eliminarHorario(index) {
const div = document.getElementById(`horario_${index}`);
if (div) {
div.remove();
}
}

function limpiarHorarios() {
document.getElementById(‘horariosContainer’).innerHTML = ‘’;
horariosCount = 0;
horariosData = [];
}

function getHorariosFromForm() {
const horarios = [];
const dias = document.querySelectorAll(’.horario-dia’);

```
dias.forEach(select => {
    const index = select.dataset.index;
    const dia = select.value;
    const inicio = document.querySelector(`.horario-inicio[data-index="${index}"]`).value;
    const fin = document.querySelector(`.horario-fin[data-index="${index}"]`).value;
    
    if (dia && inicio && fin) {
        const horarioObj = {
            dia_semana: parseInt(dia),
            hora_inicio: inicio,
            hora_fin: fin
        };
        
        // Si existe ID (editando), agregarlo
        if (horariosData[index] && horariosData[index].id) {
            horarioObj.id = horariosData[index].id;
        }
        
        horarios.push(horarioObj);
    }
});

return horarios;
```

}

function verificarSolapamientoInterno(horarios) {
const diasNombre = [‘Domingo’, ‘Lunes’, ‘Martes’, ‘Miércoles’, ‘Jueves’, ‘Viernes’, ‘Sábado’];

```
// Comparar cada horario con todos los demás
for (let i = 0; i < horarios.length; i++) {
    for (let j = i + 1; j < horarios.length; j++) {
        const h1 = horarios[i];
        const h2 = horarios[j];
        
        // Mismo día?
        if (h1.dia_semana !== h2.dia_semana) {
            continue;
        }
        
        // Verificar solapamiento
        if (h1.hora_inicio < h2.hora_fin && h1.hora_fin > h2.hora_inicio) {
            return {
                dia: diasNombre[h1.dia_semana],
                horario1: `${h1.hora_inicio}-${h1.hora_fin}`,
                horario2: `${h2.hora_inicio}-${h2.hora_fin}`
            };
        }
    }
}

return null;
```

}

async function verificarSolapamientoHorarios(profesoraId, nuevosHorarios, cursoIdActual = null) {
// Obtener todos los cursos de esta profesora (excepto el que estamos editando)
const { data: cursosProfe } = await supabase
.from(‘cursos_profesoras’)
.select(‘curso_id, cursos(codigo_curso)’)
.eq(‘profesora_id’, profesoraId)
.eq(‘activo’, true);

```
if (!cursosProfe || cursosProfe.length === 0) {
    return null; // No hay otros cursos, no hay conflicto
}

// Obtener IDs de cursos (excluyendo el actual si estamos editando)
const cursosIds = cursosProfe
    .map(c => c.curso_id)
    .filter(id => id !== cursoIdActual);

if (cursosIds.length === 0) {
    return null; // No hay otros cursos
}

// Obtener horarios de esos cursos
const { data: horariosExistentes } = await supabase
    .from('horarios_cursos')
    .select('*, cursos(codigo_curso)')
    .in('curso_id', cursosIds);

if (!horariosExistentes || horariosExistentes.length === 0) {
    return null; // No hay horarios definidos
}

// Verificar solapamiento
const diasNombre = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

for (const nuevoHorario of nuevosHorarios) {
    for (const existente of horariosExistentes) {
        // Mismo día?
        if (nuevoHorario.dia_semana !== existente.dia_semana) {
            continue;
        }
        
        // Verificar solapamiento de horarios
        // Dos horarios se solapan si:
        // nuevo.inicio < existente.fin Y nuevo.fin > existente.inicio
        if (nuevoHorario.hora_inicio < existente.hora_fin && 
            nuevoHorario.hora_fin > existente.hora_inicio) {
            
            return {
                curso: existente.cursos.codigo_curso,
                dia: diasNombre[existente.dia_semana],
                hora_inicio: existente.hora_inicio,
                hora_fin: existente.hora_fin
            };
        }
    }
}

return null; // No hay solapamiento
```

}

async function saveCurso() {
const clienteId = document.getElementById(‘cursoCliente’).value;
const idioma = document.getElementById(‘cursoIdioma’).value;
const nivel = document.getElementById(‘cursoNivel’).value;
const codigo = document.getElementById(‘cursoCodigo’).value;
const tipo = document.getElementById(‘cursoTipo’).value;
const duracion = document.getElementById(‘cursoDuracion’).value;
const frecuencia = document.getElementById(‘cursoFrecuencia’).value;
const profesoraId = document.getElementById(‘cursoProfesora’).value;

```
// Obtener horarios del formulario dinámico
const horarios = getHorariosFromForm();

if (!clienteId || !codigo || !duracion || !frecuencia) {
    showModalAlert('cursoModalAlert', 'Por favor completá todos los campos obligatorios', 'error');
    return;
}

// VALIDAR SOLAPAMIENTO DENTRO DEL MISMO CURSO
if (horarios.length > 1) {
    const solapamientoInterno = verificarSolapamientoInterno(horarios);
    if (solapamientoInterno) {
        showModalAlert('cursoModalAlert', `⚠️ Conflicto de horarios: Este curso tiene horarios que se solapan el ${solapamientoInterno.dia}: ${solapamientoInterno.horario1} y ${solapamientoInterno.horario2}`, 'error');
        return;
    }
}

// VALIDAR SOLAPAMIENTO CON OTROS CURSOS DE LA PROFESORA
if (profesoraId && horarios.length > 0) {
    const solapamiento = await verificarSolapamientoHorarios(profesoraId, horarios, editingId);
    if (solapamiento) {
        showModalAlert('cursoModalAlert', `⚠️ Conflicto de horarios: Esta profesora ya tiene asignado "${solapamiento.curso}" el ${solapamiento.dia} de ${solapamiento.hora_inicio} a ${solapamiento.hora_fin}`, 'error');
        return;
    }
}

const cursoData = {
    cliente_id: clienteId,
    codigo_curso: codigo,
    idioma: idioma,
    nivel: nivel,
    tipo: tipo,
    duracion_horas: parseFloat(duracion),
    frecuencia_semanal: parseInt(frecuencia),
    activo: true
};

let cursoId;
if (editingId) {
    const { error } = await supabase
        .from('cursos')
        .update(cursoData)
        .eq('id', editingId);
    
    if (error) {
        showModalAlert('cursoModalAlert', 'Error al actualizar: ' + error.message, 'error');
        return;
    }
    cursoId = editingId;
} else {
    const { data, error } = await supabase
        .from('cursos')
        .insert(cursoData)
        .select()
        .single();
    
    if (error) {
        showModalAlert('cursoModalAlert', 'Error al crear: ' + error.message, 'error');
        return;
    }
    cursoId = data.id;
}

// Guardar horarios
if (horarios.length > 0) {
    // Eliminar horarios anteriores
    await supabase
        .from('horarios_cursos')
        .delete()
        .eq('curso_id', cursoId);
    
    // Insertar nuevos horarios
    const horariosToInsert = horarios.map(h => ({
        curso_id: cursoId,
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin
    }));
    
    const { error: horarioError } = await supabase
        .from('horarios_cursos')
        .insert(horariosToInsert);
    
    if (horarioError) {
        showModalAlert('cursoModalAlert', 'Error al guardar horarios: ' + horarioError.message, 'error');
        return;
    }
}

// Asignar profesora
if (profesoraId) {
    // Eliminar asignaciones anteriores
    await supabase
        .from('cursos_profesoras')
        .delete()
        .eq('curso_id', cursoId);
    
    // Crear nueva asignación
    await supabase
        .from('cursos_profesoras')
        .insert({
            curso_id: cursoId,
            profesora_id: profesoraId,
            activo: true
        });
}

// Asignar participantes
const checkboxes = document.querySelectorAll('#cursoParticipantes input[type="checkbox"]:checked');

// Eliminar asignaciones anteriores
await supabase
    .from('cursos_participantes')
    .delete()
    .eq('curso_id', cursoId);

// Crear nuevas asignaciones
const participantesData = [];
checkboxes.forEach(checkbox => {
    participantesData.push({
        curso_id: cursoId,
        participante_id: checkbox.value,
        activo: true
    });
});

if (participantesData.length > 0) {
    await supabase
        .from('cursos_participantes')
        .insert(participantesData);
}

closeModal('cursoModal');
await loadCursos();
```

}

async function editCurso(id) {
await showCursoModal(id);
}

async function deleteCurso(id, codigo) {
if (!confirm(`¿Estás seguro de eliminar el curso "${codigo}"?\n\nEsto también eliminará todas las clases y asistencias asociadas.`)) {
return;
}

```
const { error } = await supabase
    .from('cursos')
    .delete()
    .eq('id', id);

if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
}

await loadCursos();
```

}

// ==================== PROFESORAS ====================
async function showProfesorasPanel() {
showScreen(‘profesorasPanel’);
await loadProfesoras();
}

async function loadProfesoras() {
const { data, error } = await supabase
.from(‘profesoras’)
.select(’*’)
.order(‘nombre’);

```
const tbody = document.querySelector('#profesorasTable tbody');
tbody.innerHTML = '';

if (data && data.length > 0) {
    data.forEach(profesora => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${profesora.nombre}</td>
            <td>${profesora.email}</td>
            <td>${profesora.telefono || '-'}</td>
            <td><span class="badge ${profesora.es_admin ? 'badge-warning' : 'badge-info'}">${profesora.es_admin ? 'Sí' : 'No'}</span></td>
            <td><span class="badge ${profesora.activo ? 'badge-success' : 'badge-danger'}">${profesora.activo ? 'Activa' : 'Inactiva'}</span></td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-small" onclick="editProfesora('${profesora.id}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteProfesora('${profesora.id}', '${profesora.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
} else {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">👩‍🏫</div>No hay profesoras registradas</td></tr>';
}
```

}

function showProfesoraModal(id = null) {
editingId = id;
const modal = document.getElementById(‘profesoraModal’);
const title = document.getElementById(‘profesoraModalTitle’);

```
document.getElementById('profesoraNombre').value = '';
document.getElementById('profesoraEmail').value = '';
document.getElementById('profesoraTelefono').value = '';
document.getElementById('profesoraAdmin').checked = false;
document.getElementById('profesoraActivo').checked = true;
document.getElementById('profesoraModalAlert').classList.add('hidden');

if (id) {
    title.textContent = 'Editar Profesora';
    loadProfesoraData(id);
} else {
    title.textContent = 'Nueva Profesora';
}

modal.classList.add('active');
```

}

async function loadProfesoraData(id) {
const { data, error } = await supabase
.from(‘profesoras’)
.select(’*’)
.eq(‘id’, id)
.single();

```
if (data) {
    document.getElementById('profesoraNombre').value = data.nombre;
    document.getElementById('profesoraEmail').value = data.email;
    document.getElementById('profesoraTelefono').value = data.telefono || '';
    document.getElementById('profesoraAdmin').checked = data.es_admin;
    document.getElementById('profesoraActivo').checked = data.activo;
}
```

}

async function saveProfesora() {
const nombre = document.getElementById(‘profesoraNombre’).value.trim();
const email = document.getElementById(‘profesoraEmail’).value.trim();
const telefono = document.getElementById(‘profesoraTelefono’).value.trim();
const esAdmin = document.getElementById(‘profesoraAdmin’).checked;
const activo = document.getElementById(‘profesoraActivo’).checked;

```
if (!nombre || !email) {
    showModalAlert('profesoraModalAlert', 'Por favor completá todos los campos obligatorios', 'error');
    return;
}

const profesoraData = {
    nombre: nombre,
    email: email,
    telefono: telefono || null,
    es_admin: esAdmin,
    activo: activo
};

let result;
if (editingId) {
    result = await supabase
        .from('profesoras')
        .update(profesoraData)
        .eq('id', editingId);
} else {
    result = await supabase
        .from('profesoras')
        .insert(profesoraData);
}

if (result.error) {
    if (result.error.code === '23505') {
        showModalAlert('profesoraModalAlert', 'Ya existe una profesora con ese email', 'error');
    } else {
        showModalAlert('profesoraModalAlert', 'Error al guardar: ' + result.error.message, 'error');
    }
    return;
}

closeModal('profesoraModal');
await loadProfesoras();
```

}

async function editProfesora(id) {
showProfesoraModal(id);
}

async function deleteProfesora(id, nombre) {
if (!confirm(`¿Estás seguro de eliminar a la profesora "${nombre}"?`)) {
return;
}

```
const { error } = await supabase
    .from('profesoras')
    .delete()
    .eq('id', id);

if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
}

await loadProfesoras();
```

}

// ==================== PARTICIPANTES ====================
async function showParticipantesPanel() {
showScreen(‘participantesPanel’);
await loadParticipantesAdmin();
}

async function loadClientesForParticipante() {
const { data, error } = await supabase
.from(‘clientes’)
.select(’*’)
.eq(‘activo’, true)
.order(‘nombre’);

```
const select = document.getElementById('participanteCliente');
select.innerHTML = '<option value="">-- Sin asignar --</option>';

if (data) {
    data.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}
```

}

async function loadParticipantesAdmin() {
const { data, error } = await supabase
.from(‘participantes’)
.select(`*, clientes (nombre)`)
.order(‘nombre’);

```
const tbody = document.querySelector('#participantesTable tbody');
tbody.innerHTML = '';

if (data && data.length > 0) {
    data.forEach(participante => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${participante.nombre}</td>
            <td>${participante.clientes ? participante.clientes.nombre : '-'}</td>
            <td>${participante.email || '-'}</td>
            <td>${participante.telefono || '-'}</td>
            <td><span class="badge ${participante.activo ? 'badge-success' : 'badge-danger'}">${participante.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-small" onclick="editParticipante('${participante.id}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deleteParticipante('${participante.id}', '${participante.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
} else {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">👥</div>No hay participantes registrados</td></tr>';
}
```

}

function showParticipanteModal(id = null) {
editingId = id;
const modal = document.getElementById(‘participanteModal’);
const title = document.getElementById(‘participanteModalTitle’);

```
document.getElementById('participanteNombre').value = '';
document.getElementById('participanteEmail').value = '';
document.getElementById('participanteTelefono').value = '';
document.getElementById('participanteCliente').value = '';
document.getElementById('participanteActivo').checked = true;
document.getElementById('participanteModalAlert').classList.add('hidden');

loadClientesForParticipante();

if (id) {
    title.textContent = 'Editar Participante';
    loadParticipanteData(id);
} else {
    title.textContent = 'Nuevo Participante';
}

modal.classList.add('active');
```

}

async function loadParticipanteData(id) {
const { data, error } = await supabase
.from(‘participantes’)
.select(’*’)
.eq(‘id’, id)
.single();

```
if (data) {
    document.getElementById('participanteNombre').value = data.nombre;
    document.getElementById('participanteEmail').value = data.email || '';
    document.getElementById('participanteTelefono').value = data.telefono || '';
    document.getElementById('participanteCliente').value = data.cliente_id || '';
    document.getElementById('participanteActivo').checked = data.activo;
}
```

}

async function saveParticipante() {
const nombre = document.getElementById(‘participanteNombre’).value.trim();
const email = document.getElementById(‘participanteEmail’).value.trim();
const telefono = document.getElementById(‘participanteTelefono’).value.trim();
const clienteId = document.getElementById(‘participanteCliente’).value;
const activo = document.getElementById(‘participanteActivo’).checked;

```
if (!nombre) {
    showModalAlert('participanteModalAlert', 'Por favor ingresá el nombre del participante', 'error');
    return;
}

// VALIDAR DUPLICADOS POR NOMBRE Y EMAIL
let query = supabase
    .from('participantes')
    .select('id, nombre, email');

// Si estamos editando, excluir el registro actual
if (editingId) {
    query = query.neq('id', editingId);
}

const { data: existentes } = await query;

if (existentes && existentes.length > 0) {
    // Verificar duplicado por nombre (case insensitive)
    const duplicadoNombre = existentes.find(p => 
        p.nombre.toLowerCase() === nombre.toLowerCase()
    );
    
    if (duplicadoNombre) {
        showModalAlert('participanteModalAlert', `⚠️ Ya existe un participante con el nombre "${duplicadoNombre.nombre}"`, 'error');
        return;
    }
    
    // Si tiene email, verificar duplicado por email
    if (email) {
        const duplicadoEmail = existentes.find(p => 
            p.email && p.email.toLowerCase() === email.toLowerCase()
        );
        
        if (duplicadoEmail) {
            showModalAlert('participanteModalAlert', `⚠️ Ya existe un participante con el email "${duplicadoEmail.email}" (${duplicadoEmail.nombre})`, 'error');
            return;
        }
    }
}

const participanteData = {
    nombre: nombre,
    email: email || null,
    telefono: telefono || null,
    cliente_id: clienteId || null,
    activo: activo
};

let result;
if (editingId) {
    result = await supabase
        .from('participantes')
        .update(participanteData)
        .eq('id', editingId);
} else {
    result = await supabase
        .from('participantes')
        .insert(participanteData);
}

if (result.error) {
    showModalAlert('participanteModalAlert', 'Error al guardar: ' + result.error.message, 'error');
    return;
}

closeModal('participanteModal');
await loadParticipantes();
```

}

async function editParticipante(id) {
showParticipanteModal(id);
}

async function deleteParticipante(id, nombre) {
if (!confirm(`¿Estás seguro de eliminar al participante "${nombre}"?`)) {
return;
}

```
const { error } = await supabase
    .from('participantes')
    .delete()
    .eq('id', id);

if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
}

await loadParticipantes();
```

}

// ==================== REPORTES ====================
function showReportes() {
showScreen(‘reportesPanel’);

```
// Mostrar reporte de facturación solo si es admin
const facturacionMenu = document.getElementById('facturacionMenu');
if (facturacionMenu) {
    if (isAdmin) {
        facturacionMenu.style.display = 'flex';
    } else {
        facturacionMenu.style.display = 'none';
    }
}
```

}

async function showReporteClienteScreen() {
showScreen(‘reporteClienteScreen’);

```
let query = supabase
    .from('clientes')
    .select('*')
    .eq('activo', true);

// Si NO es admin, filtrar solo clientes que tienen cursos asignados a esta profesora
if (!isAdmin) {
    // Obtener IDs de clientes de los cursos de la profesora
    const { data: cursosProf } = await supabase
        .from('cursos_profesoras')
        .select('cursos(cliente_id)')
        .eq('profesora_id', currentUser.id)
        .eq('activo', true);
    
    if (cursosProf && cursosProf.length > 0) {
        const clienteIds = [...new Set(cursosProf.map(c => c.cursos.cliente_id))];
        query = query.in('id', clienteIds);
    } else {
        // Si la profesora no tiene cursos, no mostrar nada
        document.getElementById('reporteClienteSelect').innerHTML = '<option value="">No tenés clientes asignados</option>';
        return;
    }
}

const { data, error } = await query.order('nombre');

const select = document.getElementById('reporteClienteSelect');
select.innerHTML = '<option value="">-- Seleccione un cliente --</option>';

if (data) {
    data.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}
```

}

async function generarReporteCliente() {
const clienteId = document.getElementById(‘reporteClienteSelect’).value;
const mes = document.getElementById(‘reporteMes’).value;

```
console.log('=== GENERANDO REPORTE CLIENTE ===');
console.log('Cliente ID:', clienteId);
console.log('Mes:', mes);

if (!clienteId || !mes) {
    alert('Por favor seleccioná un cliente y un mes');
    return;
}

const [anio, mesNum] = mes.split('-');
const fechaInicio = `${anio}-${mesNum}-01`;
const fechaFin = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split('T')[0];

console.log('Fecha inicio:', fechaInicio);
console.log('Fecha fin:', fechaFin);

// Obtener nombre del cliente
const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre')
    .eq('id', clienteId)
    .single();

console.log('Cliente encontrado:', cliente);

// Obtener cursos del cliente
const { data: cursos, error } = await supabase
    .from('cursos')
    .select(`
        id,
        codigo_curso,
        idioma,
        nivel
    `)
    .eq('cliente_id', clienteId)
    .eq('activo', true);

console.log('Cursos encontrados:', cursos);
console.log('Error cursos:', error);

if (!cursos || cursos.length === 0) {
    document.getElementById('reporteClienteContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>No hay cursos registrados para este cliente</p>
        </div>
    `;
    return;
}

let html = `
    <div class="card" style="margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="color: var(--primary);">Reporte: ${cliente.nombre} - ${getMesNombre(mesNum)} ${anio}</h3>
            <button class="btn btn-success" onclick="exportarReporteClienteExcel('${clienteId}', '${mes}')">📊 Exportar a Excel</button>
        </div>
`;

let tieneClases = false;

for (const curso of cursos) {
    console.log('--- Procesando curso:', curso.codigo_curso);
    
    // Obtener clases del curso en el mes
    const { data: clases, error: errorClases } = await supabase
        .from('clases')
        .select(`
            id,
            fecha,
            hora_inicio,
            duracion_horas,
            estado,
            motivo_cancelacion,
            es_recuperacion,
            temas_tratados,
            profesoras!profesora_id (nombre)
        `)
        .eq('curso_id', curso.id)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');
    
    console.log('Clases encontradas para curso', curso.codigo_curso, ':', clases);
    console.log('Error clases:', errorClases);
    
    if (clases && clases.length > 0) {
        tieneClases = true;
        console.log('✅ Curso', curso.codigo_curso, 'tiene', clases.length, 'clases');
        html += `
            <h4 style="color: var(--secondary); margin-top: 1.5rem;">${curso.codigo_curso} - ${curso.idioma} ${curso.nivel}</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Duración</th>
                            <th>Profesora</th>
                            <th>Estado</th>
                            <th>Temas Tratados</th>
                            <th>Asistencia</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const clase of clases) {
            let estadoHtml = '';
            if (clase.estado === 'dictada') {
                estadoHtml = '<span class="badge badge-success">Dictada</span>';
            } else if (clase.estado === 'cancelada_feriado') {
                estadoHtml = '<span class="badge badge-warning">Feriado</span>';
            } else if (clase.estado === 'cancelada_empresa') {
                estadoHtml = '<span class="badge badge-warning">Cancelada empresa</span>';
            } else if (clase.estado === 'cancelada_profesora') {
                estadoHtml = '<span class="badge badge-danger">Cancelada profesora</span>';
            }
            
            let asistenciaHtml = '-';
            if (clase.estado === 'dictada') {
                const { data: asistencias } = await supabase
                    .from('asistencias')
                    .select('estado_asistencia, presente')
                    .eq('clase_id', clase.id);
                
                if (asistencias && asistencias.length > 0) {
                    const presentes = asistencias.filter(a => a.estado_asistencia === 'presente').length;
                    const ausentesConAviso = asistencias.filter(a => a.estado_asistencia === 'ausente_con_aviso').length;
                    const ausentesSinAviso = asistencias.filter(a => a.estado_asistencia === 'ausente_sin_aviso').length;
                    const total = asistencias.length;
                    asistenciaHtml = `${presentes}/${total} presentes`;
                    if (ausentesConAviso > 0 || ausentesSinAviso > 0) {
                        asistenciaHtml += `<br><small>${ausentesConAviso} aus. c/aviso, ${ausentesSinAviso} aus. s/aviso</small>`;
                    }
                }
            }
            
            html += `
                <tr>
                    <td>${formatFecha(clase.fecha)}</td>
                    <td>${clase.hora_inicio}</td>
                    <td>${clase.duracion_horas}h</td>
                    <td>${clase.profesoras.nombre}</td>
                    <td>${estadoHtml}</td>
                    <td>${clase.temas_tratados || '-'}</td>
                    <td>${asistenciaHtml}</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Detalle de participantes
        const { data: participantes } = await supabase
            .from('cursos_participantes')
            .select(`
                participantes (
                    id,
                    nombre
                )
            `)
            .eq('curso_id', curso.id)
            .eq('activo', true);
        
        if (participantes && participantes.length > 0) {
            html += `
                <h5 style="margin-top: 1rem; color: var(--dark);">Detalle por Participante:</h5>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Participante</th>
                                <th>Clases Asistidas</th>
                                <th>Clases Totales</th>
                                <th>% Asistencia</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            for (const part of participantes) {
                const { data: asist } = await supabase
                    .from('asistencias')
                    .select('estado_asistencia, presente, clases!inner(fecha, estado)')
                    .eq('participante_id', part.participantes.id)
                    .gte('clases.fecha', fechaInicio)
                    .lte('clases.fecha', fechaFin)
                    .in('clases.curso_id', [curso.id]);
                
                const totalClases = asist ? asist.length : 0;
                const clasesPresentes = asist ? asist.filter(a => a.estado_asistencia === 'presente').length : 0;
                const ausentesConAviso = asist ? asist.filter(a => a.estado_asistencia === 'ausente_con_aviso').length : 0;
                const ausentesSinAviso = asist ? asist.filter(a => a.estado_asistencia === 'ausente_sin_aviso').length : 0;
                const porcentaje = totalClases > 0 ? ((clasesPresentes / totalClases) * 100).toFixed(1) : 0;
                
                html += `
                    <tr>
                        <td>${part.participantes.nombre}</td>
                        <td>${clasesPresentes} presentes<br><small>${ausentesConAviso} aus. c/aviso, ${ausentesSinAviso} aus. s/aviso</small></td>
                        <td>${totalClases}</td>
                        <td><span class="badge ${porcentaje >= 80 ? 'badge-success' : porcentaje >= 60 ? 'badge-warning' : 'badge-danger'}">${porcentaje}%</span></td>
                    </tr>
                `;
            }
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
}

if (!tieneClases) {
    console.log('❌ No se encontraron clases en ningún curso');
    html += `
        <div class="empty-state">
            <div class="empty-state-icon">📅</div>
            <p>No hay clases registradas para este cliente en el mes seleccionado</p>
            <small style="color: var(--secondary);">Verificá que hayas registrado asistencias para ${getMesNombre(mesNum)} ${anio}</small>
        </div>
    `;
} else {
    console.log('✅ Reporte generado exitosamente');
}

html += '</div>';

console.log('=== FIN GENERANDO REPORTE ===');
document.getElementById('reporteClienteContent').innerHTML = html;
```

}

async function showReporteProfesoraScreen() {
showScreen(‘reporteProfesoraScreen’);

```
const selectContainer = document.getElementById('reporteProfesoraSelectContainer');
const infoContainer = document.getElementById('reporteProfesoraInfo');

if (isAdmin) {
    // Admin ve select de todas las profesoras
    selectContainer.classList.remove('hidden');
    if (infoContainer) infoContainer.classList.add('hidden');
    
    const { data, error } = await supabase
        .from('profesoras')
        .select('*')
        .eq('activo', true)
        .order('nombre');
    
    const select = document.getElementById('reporteProfesoraSelect');
    select.innerHTML = '<option value="">-- Seleccione una profesora --</option>';
    
    if (data) {
        data.forEach(profesora => {
            const option = document.createElement('option');
            option.value = profesora.id;
            option.textContent = profesora.nombre;
            select.appendChild(option);
        });
    }
} else {
    // Profesora solo ve su propio reporte
    selectContainer.classList.add('hidden');
    if (infoContainer) {
        infoContainer.classList.remove('hidden');
        infoContainer.innerHTML = `<p style="color: var(--dark); font-weight: 600;">Reporte de: ${currentUser.nombre}</p>`;
    }
}
```

}

async function generarReporteProfesora() {
let profesoraId;
const mes = document.getElementById(‘reporteProfesoraMes’).value;

```
if (isAdmin) {
    profesoraId = document.getElementById('reporteProfesoraSelect').value;
    if (!profesoraId) {
        alert('Por favor seleccioná una profesora');
        return;
    }
} else {
    // Profesora usa su propio ID
    profesoraId = currentUser.id;
}

if (!mes) {
    alert('Por favor seleccioná un mes');
    return;
}

const [anio, mesNum] = mes.split('-');
const fechaInicio = `${anio}-${mesNum}-01`;
const fechaFin = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split('T')[0];

// Obtener nombre de la profesora
const { data: profesora } = await supabase
    .from('profesoras')
    .select('nombre')
    .eq('id', profesoraId)
    .single();

// Obtener TODAS las clases (dictadas y canceladas)
const { data: clases, error } = await supabase
    .from('clases')
    .select(`
        id,
        fecha,
        hora_inicio,
        duracion_horas,
        estado,
        es_recuperacion,
        cursos (
            codigo_curso,
            clientes (nombre)
        )
    `)
    .eq('profesora_id', profesoraId)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha');

if (!clases || clases.length === 0) {
    document.getElementById('reporteProfesoraContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⏰</div>
            <p>No hay clases registradas para esta profesora en el mes seleccionado</p>
        </div>
    `;
    return;
}

const totalHoras = clases.reduce((sum, clase) => sum + parseFloat(clase.duracion_horas), 0);

// Calcular desglose de horas
let horasDictadasAPagar = 0;  // Clases efectivamente dictadas a participantes presentes O recuperaciones
let horasSuspendidasSinRecuperar = 0;  // Clases con todos ausentes con aviso que NO son recuperación
let horasCanceladasEmpresa = 0;
let horasCanceladasProfesora = 0;
let horasFeriado = 0;
let clasesDictadasAPagar = 0;
let clasesSuspendidasSinRecuperar = 0;
let clasesCanceladasEmpresa = 0;
let clasesCanceladasProfesora = 0;
let clasesFeriado = 0;

// Obtener asistencias para las clases dictadas
const clasesDictadasIds = clases.filter(c => c.estado === 'dictada').map(c => c.id);
let asistenciasPorClase = {};

if (clasesDictadasIds.length > 0) {
    const { data: asistencias } = await supabase
        .from('asistencias')
        .select('clase_id, estado_asistencia')
        .in('clase_id', clasesDictadasIds);
    
    if (asistencias) {
        asistencias.forEach(a => {
            if (!asistenciasPorClase[a.clase_id]) {
                asistenciasPorClase[a.clase_id] = [];
            }
            asistenciasPorClase[a.clase_id].push(a.estado_asistencia);
        });
    }
}

clases.forEach(clase => {
    const horas = parseFloat(clase.duracion_horas);
    
    if (clase.estado === 'dictada') {
        const asistencias = asistenciasPorClase[clase.id] || [];
        const todosAusentesConAviso = asistencias.length > 0 && 
            asistencias.every(a => a === 'ausente_con_aviso');
        
        // Solo cuenta como "a pagar" si:
        // - Es recuperación (se paga siempre), O
        // - NO todos están ausentes con aviso (hubo al menos un presente)
        if (clase.es_recuperacion || !todosAusentesConAviso) {
            horasDictadasAPagar += horas;
            clasesDictadasAPagar++;
        } else {
            // Clase suspendida (todos ausentes con aviso, no es recuperación)
            horasSuspendidasSinRecuperar += horas;
            clasesSuspendidasSinRecuperar++;
        }
    } else if (clase.estado === 'cancelada_empresa') {
        horasCanceladasEmpresa += horas;
        clasesCanceladasEmpresa++;
    } else if (clase.estado === 'cancelada_profesora') {
        horasCanceladasProfesora += horas;
        clasesCanceladasProfesora++;
    } else if (clase.estado === 'cancelada_feriado') {
        horasFeriado += horas;
        clasesFeriado++;
    }
});

// Horas que la profesora cobra = Solo las dictadas efectivamente (con participantes) o recuperaciones
const horasAPagar = horasDictadasAPagar;

let html = `
    <div class="card" style="margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="color: var(--primary);">Reporte: ${profesora.nombre} - ${getMesNombre(mesNum)} ${anio}</h3>
            <button class="btn btn-success" onclick="exportarReporteProfesoraExcel('${profesoraId}', '${mes}')">📊 Exportar a Excel</button>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card" style="background: linear-gradient(135deg, #27AE60, #2ECC71);">
                <div class="stat-label">Horas a Cobrar</div>
                <div class="stat-number">${horasAPagar.toFixed(1)}h</div>
                <small style="opacity: 0.9;">Clases efectivamente dictadas</small>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total de Clases</div>
                <div class="stat-number">${clases.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Clases Dictadas</div>
                <div class="stat-number">${clasesDictadasAPagar}</div>
                <small style="opacity: 0.9;">${horasDictadasAPagar.toFixed(1)}h</small>
            </div>
            <div class="stat-card">
                <div class="stat-label">Suspendidas</div>
                <div class="stat-number">${clasesSuspendidasSinRecuperar}</div>
                <small style="opacity: 0.9;">${horasSuspendidasSinRecuperar.toFixed(1)}h - Pendiente recuperar</small>
            </div>
        </div>
        
        <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 5px;">
            <strong>Desglose completo:</strong><br>
            • Clases dictadas (con participantes): ${horasDictadasAPagar.toFixed(1)}h (${clasesDictadasAPagar} clases)<br>
            • Clases suspendidas (todos ausentes): ${horasSuspendidasSinRecuperar.toFixed(1)}h (${clasesSuspendidasSinRecuperar} clases) - <em>Pendiente recuperar</em><br>
            • Canceladas por empresa: ${horasCanceladasEmpresa.toFixed(1)}h (${clasesCanceladasEmpresa} clases) - <em>No cobrables</em><br>
            • Canceladas por profesora: ${horasCanceladasProfesora.toFixed(1)}h (${clasesCanceladasProfesora} clases) - <em>No cobrables</em><br>
            • Feriados: ${horasFeriado.toFixed(1)}h (${clasesFeriado} clases) - <em>No cobrables</em><br>
            <strong>TOTAL A COBRAR: ${horasAPagar.toFixed(1)}h</strong>
        </div>
        
        <h4 style="color: var(--secondary); margin-top: 1.5rem;">Detalle de Clases</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Curso</th>
                        <th>Cliente</th>
                        <th>Hora</th>
                        <th>Duración</th>
                        <th>Estado</th>
                        <th>Recuperación</th>
                    </tr>
                </thead>
                <tbody>
`;

clases.forEach(clase => {
    let estadoBadge = '';
    if (clase.estado === 'dictada') {
        estadoBadge = '<span class="badge badge-success">Dictada</span>';
    } else if (clase.estado === 'cancelada_feriado') {
        estadoBadge = '<span class="badge badge-warning">Feriado</span>';
    } else if (clase.estado === 'cancelada_empresa') {
        estadoBadge = '<span class="badge badge-warning">Cancelada empresa</span>';
    } else if (clase.estado === 'cancelada_profesora') {
        estadoBadge = '<span class="badge badge-danger">Cancelada profesora</span>';
    }
    
    // Verificar si es clase suspendida (todos ausentes con aviso, no recuperación)
    const asistencias = asistenciasPorClase[clase.id] || [];
    const esSuspendida = clase.estado === 'dictada' && 
                        asistencias.length > 0 &&
                        asistencias.every(a => a === 'ausente_con_aviso') &&
                        !clase.es_recuperacion;
    
    if (esSuspendida) {
        estadoBadge += ' <span class="badge" style="background: #FFA500;">⚠️ Suspendida</span>';
    }
    
    html += `
        <tr>
            <td>${formatFecha(clase.fecha)}</td>
            <td>${clase.cursos.codigo_curso}</td>
            <td>${clase.cursos.clientes.nombre}</td>
            <td>${clase.hora_inicio}</td>
            <td><strong>${clase.duracion_horas}h</strong></td>
            <td>${estadoBadge}</td>
            <td>${clase.es_recuperacion ? '<span class="badge badge-info">Sí</span>' : '-'}</td>
        </tr>
    `;
});

html += `
                </tbody>
            </table>
        </div>
        </div>
    </div>
`;

document.getElementById('reporteProfesoraContent').innerHTML = html;
```

}

// ==================== EXPORTAR A EXCEL ====================
async function exportarReporteClienteExcel(clienteId, mes) {
const [anio, mesNum] = mes.split(’-’);
const fechaInicio = `${anio}-${mesNum}-01`;
const fechaFin = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split(‘T’)[0];

```
const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre')
    .eq('id', clienteId)
    .single();

const { data: cursos } = await supabase
    .from('cursos')
    .select(`
        id,
        codigo_curso,
        idioma,
        nivel
    `)
    .eq('cliente_id', clienteId)
    .eq('activo', true);

if (!cursos || cursos.length === 0) {
    alert('No hay cursos para exportar');
    return;
}

const workbook = new ExcelJS.Workbook();
let hojaAgregada = false;

for (const curso of cursos) {
    const { data: clases } = await supabase
        .from('clases')
        .select(`
            id,
            fecha,
            hora_inicio,
            duracion_horas,
            estado,
            motivo_cancelacion,
            es_recuperacion,
            temas_tratados,
            profesoras!profesora_id (nombre)
        `)
        .eq('curso_id', curso.id)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');
    
    if (clases && clases.length > 0) {
        // HOJA 1: Detalle de clases con estilos profesionales
        const worksheet = workbook.addWorksheet(curso.codigo_curso.substring(0, 31));
        
        // Configurar anchos de columna PRIMERO
        worksheet.getColumn(1).width = 15;  // Fecha / Logo
        worksheet.getColumn(2).width = 10;  // Hora
        worksheet.getColumn(3).width = 10;  // Duración
        worksheet.getColumn(4).width = 20;  // Profesora
        worksheet.getColumn(5).width = 20;  // Estado
        worksheet.getColumn(6).width = 40;  // Temas (más ancho)
        worksheet.getColumn(7).width = 30;  // Observaciones (más ancho)
        
        // Fila 1: Logo y Título
        worksheet.mergeCells('A1:A1');
        worksheet.getCell('A1').value = 'BA Language';
        worksheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF2C5F7C' } };
        worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        
        worksheet.mergeCells('B1:G1');
        const titleCell = worksheet.getCell('B1');
        titleCell.value = 'REGISTRO DE ASISTENCIA';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5F7C' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 30;
        
        // Filas 2-3: Espacio
        worksheet.getRow(2).height = 10;
        worksheet.getRow(3).height = 5;
        
        // Filas 4-7: Información del cliente
        worksheet.getCell('A4').value = 'Empresa:';
        worksheet.getCell('A4').font = { bold: true };
        worksheet.mergeCells('B4:G4');
        worksheet.getCell('B4').value = cliente.nombre;
        
        worksheet.getCell('A5').value = 'Curso:';
        worksheet.getCell('A5').font = { bold: true };
        worksheet.mergeCells('B5:G5');
        worksheet.getCell('B5').value = curso.codigo_curso;
        
        worksheet.getCell('A6').value = 'Idioma:';
        worksheet.getCell('A6').font = { bold: true };
        worksheet.mergeCells('B6:G6');
        worksheet.getCell('B6').value = `${curso.idioma} ${curso.nivel}`;
        
        worksheet.getCell('A7').value = 'Mes:';
        worksheet.getCell('A7').font = { bold: true };
        worksheet.mergeCells('B7:G7');
        worksheet.getCell('B7').value = `${getMesNombre(mesNum)} ${anio}`;
        
        // Fila 8: Espacio
        worksheet.getRow(8).height = 10;
        
        // Fila 9: Encabezados con estilo - SOLO en las celdas que tienen texto
        const headerRow = worksheet.getRow(9);
        const headers = ['Fecha', 'Hora', 'Duración', 'Profesora', 'Estado', 'Temas', 'Observaciones'];
        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        headerRow.height = 25;
        
        // Filas de datos
        let rowIndex = 10;
        clases.forEach((clase, index) => {
            let estadoTexto = '';
            let observaciones = '';
            let estadoColor = 'FF000000'; // Negro por defecto
            
            if (clase.estado === 'dictada') {
                estadoTexto = 'Dictada';
                estadoColor = 'FF70AD47'; // Verde
            } else if (clase.estado === 'cancelada_feriado') {
                estadoTexto = 'Cancelada - Feriado';
                estadoColor = 'FFFFC000'; // Naranja
            } else if (clase.estado === 'cancelada_empresa') {
                estadoTexto = 'Cancelada - Empresa';
                estadoColor = 'FFFFC000'; // Naranja
            } else if (clase.estado === 'cancelada_profesora') {
                estadoTexto = 'Cancelada - Profesora';
                estadoColor = 'FFFF0000'; // Rojo
                observaciones = clase.motivo_cancelacion || '';
            }
            
            if (clase.es_recuperacion) {
                observaciones += (observaciones ? ' | ' : '') + 'Recuperación';
            }
            
            const row = worksheet.getRow(rowIndex);
            row.values = [
                formatFecha(clase.fecha),
                clase.hora_inicio,
                `${clase.duracion_horas}h`,
                clase.profesoras.nombre,
                estadoTexto,
                clase.temas_tratados || '-',
                observaciones
            ];
            
            // Fondo alternado (cebra)
            const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2';
            
            // Aplicar estilos a cada celda
            for (let col = 1; col <= 7; col++) {
                const cell = row.getCell(col);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                };
                
                // Color para la columna de estado
                if (col === 5) {
                    cell.font = { color: { argb: estadoColor }, bold: true };
                }
            }
            
            // Altura automática basada en contenido
            const temasLength = (clase.temas_tratados || '-').length;
            const obsLength = observaciones.length;
            
            // Calcular líneas necesarias para Temas (columna de 40 caracteres de ancho)
            const lineasTemas = Math.ceil(temasLength / 40);
            // Calcular líneas necesarias para Observaciones (columna de 30 caracteres)
            const lineasObs = Math.ceil(obsLength / 30);
            
            // Usar el máximo de líneas necesarias
            const lineasMaximas = Math.max(lineasTemas, lineasObs, 1);
            
            // Altura: 20px base + 15px por cada línea adicional
            row.height = 20 + (lineasMaximas - 1) * 15;
            
            rowIndex++;
        });
        
        hojaAgregada = true;
        
        // HOJA 2: Detalle de asistencia por participante
        const { data: participantes } = await supabase
            .from('cursos_participantes')
            .select(`
                participantes (
                    id,
                    nombre
                )
            `)
            .eq('curso_id', curso.id)
            .eq('activo', true);
        
        if (participantes && participantes.length > 0) {
            const worksheetPart = workbook.addWorksheet(`${curso.codigo_curso}-Part`.substring(0, 31));
            
            // Configurar anchos de columna PRIMERO
            worksheetPart.getColumn(1).width = 25;  // Participante
            worksheetPart.getColumn(2).width = 12;  // Presentes
            worksheetPart.getColumn(3).width = 15;  // Aus. c/aviso
            worksheetPart.getColumn(4).width = 15;  // Aus. s/aviso
            worksheetPart.getColumn(5).width = 15;  // % Asistencia
            
            // Fila 1: Logo y Título
            worksheetPart.mergeCells('A1:A1');
            worksheetPart.getCell('A1').value = 'BA Language';
            worksheetPart.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF2C5F7C' } };
            worksheetPart.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            
            worksheetPart.mergeCells('B1:E1');
            const titleCellPart = worksheetPart.getCell('B1');
            titleCellPart.value = 'DETALLE POR PARTICIPANTE';
            titleCellPart.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCellPart.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5F7C' } };
            titleCellPart.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheetPart.getRow(1).height = 30;
            
            // Filas 2-3: Espacio
            worksheetPart.getRow(2).height = 10;
            worksheetPart.getRow(3).height = 5;
            
            // Filas 4-7: Información
            worksheetPart.getCell('A4').value = 'Empresa:';
            worksheetPart.getCell('A4').font = { bold: true };
            worksheetPart.mergeCells('B4:E4');
            worksheetPart.getCell('B4').value = cliente.nombre;
            
            worksheetPart.getCell('A5').value = 'Curso:';
            worksheetPart.getCell('A5').font = { bold: true };
            worksheetPart.mergeCells('B5:E5');
            worksheetPart.getCell('B5').value = curso.codigo_curso;
            
            worksheetPart.getCell('A6').value = 'Idioma:';
            worksheetPart.getCell('A6').font = { bold: true };
            worksheetPart.mergeCells('B6:E6');
            worksheetPart.getCell('B6').value = `${curso.idioma} ${curso.nivel}`;
            
            worksheetPart.getCell('A7').value = 'Mes:';
            worksheetPart.getCell('A7').font = { bold: true };
            worksheetPart.mergeCells('B7:E7');
            worksheetPart.getCell('B7').value = `${getMesNombre(mesNum)} ${anio}`;
            
            // Fila 8: Espacio
            worksheetPart.getRow(8).height = 10;
            
            // Fila 9: Encabezados - SOLO en las celdas que tienen texto
            const headerRowPart = worksheetPart.getRow(9);
            const headersPart = ['Participante', 'Presentes', 'Aus. c/aviso', 'Aus. s/aviso', '% Asistencia'];
            headersPart.forEach((header, index) => {
                const cell = headerRowPart.getCell(index + 1);
                cell.value = header;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            headerRowPart.height = 25;
            
            // Datos de participantes
            let rowIndexPart = 10;
            for (const part of participantes) {
                const { data: asist } = await supabase
                    .from('asistencias')
                    .select('estado_asistencia, presente, clases!inner(fecha, estado)')
                    .eq('participante_id', part.participantes.id)
                    .gte('clases.fecha', fechaInicio)
                    .lte('clases.fecha', fechaFin)
                    .in('clases.curso_id', [curso.id]);
                
                const totalClases = asist ? asist.length : 0;
                const clasesPresentes = asist ? asist.filter(a => a.estado_asistencia === 'presente').length : 0;
                const ausentesConAviso = asist ? asist.filter(a => a.estado_asistencia === 'ausente_con_aviso').length : 0;
                const ausentesSinAviso = asist ? asist.filter(a => a.estado_asistencia === 'ausente_sin_aviso').length : 0;
                const porcentaje = totalClases > 0 ? ((clasesPresentes / totalClases) * 100).toFixed(1) : 0;
                
                const rowPart = worksheetPart.getRow(rowIndexPart);
                rowPart.values = [
                    part.participantes.nombre,
                    clasesPresentes,
                    ausentesConAviso,
                    ausentesSinAviso,
                    `${porcentaje}%`
                ];
                
                const fillColorPart = (rowIndexPart - 10) % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2';
                
                for (let col = 1; col <= 5; col++) {
                    const cell = rowPart.getCell(col);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColorPart } };
                    cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                    };
                }
                
                rowPart.height = 20;
                rowIndexPart++;
            }
        }
    }
}

if (!hojaAgregada) {
    alert('No hay clases en el período seleccionado para exportar');
    return;
}

// Generar y descargar el archivo
const buffer = await workbook.xlsx.writeBuffer();
const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${cliente.nombre}_${getMesNombre(mesNum)}_${anio}.xlsx`;
a.click();
window.URL.revokeObjectURL(url);
```

}

async function exportarReporteProfesoraExcel(profesoraId, mes) {
const [anio, mesNum] = mes.split(’-’);
const fechaInicio = `${anio}-${mesNum}-01`;
const fechaFin = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split(‘T’)[0];

```
const { data: profesora } = await supabase
    .from('profesoras')
    .select('nombre')
    .eq('id', profesoraId)
    .single();

const { data: clases } = await supabase
    .from('clases')
    .select(`
        id,
        fecha,
        hora_inicio,
        duracion_horas,
        estado,
        es_recuperacion,
        cursos (
            codigo_curso,
            clientes (nombre)
        )
    `)
    .eq('profesora_id', profesoraId)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha');

if (!clases || clases.length === 0) {
    alert('No hay clases en el período seleccionado para exportar');
    return;
}

// Obtener asistencias para las clases dictadas
const clasesDictadasIds = clases.filter(c => c.estado === 'dictada').map(c => c.id);
let asistenciasPorClase = {};

if (clasesDictadasIds.length > 0) {
    const { data: asistencias } = await supabase
        .from('asistencias')
        .select('clase_id, estado_asistencia')
        .in('clase_id', clasesDictadasIds);
    
    if (asistencias) {
        asistencias.forEach(a => {
            if (!asistenciasPorClase[a.clase_id]) {
                asistenciasPorClase[a.clase_id] = [];
            }
            asistenciasPorClase[a.clase_id].push(a.estado_asistencia);
        });
    }
}

let horasDictadasAPagar = 0;
let horasSuspendidasSinRecuperar = 0;
let horasCanceladasEmpresa = 0;
let horasCanceladasProfesora = 0;
let horasFeriado = 0;
let totalHoras = 0;

clases.forEach(clase => {
    const horas = parseFloat(clase.duracion_horas);
    totalHoras += horas;
    
    if (clase.estado === 'dictada') {
        const asistencias = asistenciasPorClase[clase.id] || [];
        const todosAusentesConAviso = asistencias.length > 0 && 
            asistencias.every(a => a === 'ausente_con_aviso');
        
        if (clase.es_recuperacion || !todosAusentesConAviso) {
            horasDictadasAPagar += horas;
        } else {
            horasSuspendidasSinRecuperar += horas;
        }
    } else if (clase.estado === 'cancelada_empresa') {
        horasCanceladasEmpresa += horas;
    } else if (clase.estado === 'cancelada_profesora') {
        horasCanceladasProfesora += horas;
    } else if (clase.estado === 'cancelada_feriado') {
        horasFeriado += horas;
    }
});

const horasAPagar = horasDictadasAPagar;

const wsData = [
    [`Reporte de Horas - ${profesora.nombre}`, '', '', '', '', ''],
    [`${getMesNombre(mesNum)} ${anio}`, '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['RESUMEN:', '', '', '', '', ''],
    ['Clases dictadas (cobrables):', horasDictadasAPagar.toFixed(1), '', '', '', ''],
    ['Clases suspendidas:', horasSuspendidasSinRecuperar.toFixed(1), '(Pendiente recuperar)', '', '', ''],
    ['Canc. por empresa:', horasCanceladasEmpresa.toFixed(1), '(No cobrables)', '', '', ''],
    ['Canc. por profesora:', horasCanceladasProfesora.toFixed(1), '(No cobrables)', '', '', ''],
    ['Feriados:', horasFeriado.toFixed(1), '(No cobrables)', '', '', ''],
    ['HORAS A COBRAR:', horasAPagar.toFixed(1), '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Fecha', 'Curso', 'Cliente', 'Hora', 'Duración', 'Estado'],
];

clases.forEach(clase => {
    let estadoTexto = '';
    if (clase.estado === 'dictada') {
        estadoTexto = 'Dictada';
    } else if (clase.estado === 'cancelada_feriado') {
        estadoTexto = 'Cancelada - Feriado';
    } else if (clase.estado === 'cancelada_empresa') {
        estadoTexto = 'Cancelada - Empresa';
    } else if (clase.estado === 'cancelada_profesora') {
        estadoTexto = 'Cancelada - Profesora';
    }
    
    // Verificar si es clase suspendida
    const asistencias = asistenciasPorClase[clase.id] || [];
    const esSuspendida = clase.estado === 'dictada' && 
                        asistencias.length > 0 &&
                        asistencias.every(a => a === 'ausente_con_aviso') &&
                        !clase.es_recuperacion;
    
    if (esSuspendida) {
        estadoTexto = 'Dictada - SUSPENDIDA (Pendiente recuperar)';
    }
    
    wsData.push([
        formatFecha(clase.fecha),
        clase.cursos.codigo_curso,
        clase.cursos.clientes.nombre,
        clase.hora_inicio,
        clase.duracion_horas,
        estadoTexto
    ]);
});

const ws = XLSX.utils.aoa_to_sheet(wsData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

XLSX.writeFile(wb, `${profesora.nombre}_${getMesNombre(mesNum)}_${anio}.xlsx`);
```

}

// ==================== REPORTE DE FACTURACIÓN ====================
function showReporteFacturacionScreen() {
showScreen(‘reporteFacturacionScreen’);

```
// Setear mes actual
const currentMonth = new Date().toISOString().slice(0, 7);
if (document.getElementById('reporteFacturacionMes')) {
    document.getElementById('reporteFacturacionMes').value = currentMonth;
}
```

}

async function generarReporteFacturacion() {
const mes = document.getElementById(‘reporteFacturacionMes’).value;

```
if (!mes) {
    alert('Por favor seleccioná un mes');
    return;
}

const [anio, mesNum] = mes.split('-');
const fechaInicio = `${anio}-${mesNum}-01`;
const fechaFin = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split('T')[0];

// Obtener todos los clientes activos
const { data: clientes, error: errorClientes } = await supabase
    .from('clientes')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('nombre');

if (!clientes || clientes.length === 0) {
    document.getElementById('reporteFacturacionContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>No hay clientes activos</p>
        </div>
    `;
    return;
}

let resumenGeneral = [];

for (const cliente of clientes) {
    // Obtener cursos del cliente
    const { data: cursos } = await supabase
        .from('cursos')
        .select('id, codigo_curso, idioma, nivel')
        .eq('cliente_id', cliente.id)
        .eq('activo', true);
    
    if (!cursos || cursos.length === 0) continue;
    
    for (const curso of cursos) {
        // Obtener clases del curso en el mes
        const { data: clases } = await supabase
            .from('clases')
            .select(`
                id,
                duracion_horas,
                estado,
                es_recuperacion
            `)
            .eq('curso_id', curso.id)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .eq('estado', 'dictada');
        
        if (!clases || clases.length === 0) continue;
        
        // Obtener asistencias para determinar clases facturables
        const clasesIds = clases.map(c => c.id);
        const { data: asistencias } = await supabase
            .from('asistencias')
            .select('clase_id, estado_asistencia')
            .in('clase_id', clasesIds);
        
        // Agrupar asistencias por clase
        let asistenciasPorClase = {};
        if (asistencias) {
            asistencias.forEach(a => {
                if (!asistenciasPorClase[a.clase_id]) {
                    asistenciasPorClase[a.clase_id] = [];
                }
                asistenciasPorClase[a.clase_id].push(a.estado_asistencia);
            });
        }
        
        // Calcular horas facturables (excluir clases suspendidas sin recuperar)
        let horasFacturables = 0;
        
        clases.forEach(clase => {
            const asists = asistenciasPorClase[clase.id] || [];
            const todosAusentesConAviso = asists.length > 0 && 
                asists.every(a => a === 'ausente_con_aviso');
            
            // Facturable si: es recuperación O no todos están ausentes con aviso
            if (clase.es_recuperacion || !todosAusentesConAviso) {
                horasFacturables += parseFloat(clase.duracion_horas);
            }
        });
        
        if (horasFacturables > 0) {
            resumenGeneral.push({
                cliente: cliente.nombre,
                clienteCodigo: cliente.codigo,
                curso: curso.codigo_curso,
                idioma: curso.idioma,
                nivel: curso.nivel,
                horas: horasFacturables
            });
        }
    }
}

if (resumenGeneral.length === 0) {
    document.getElementById('reporteFacturacionContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">💰</div>
            <p>No hay clases facturables en el mes seleccionado</p>
        </div>
    `;
    return;
}

// Generar HTML
let html = `
    <div class="card" style="margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="color: var(--primary);">Resumen de Facturación - ${getMesNombre(mesNum)} ${anio}</h3>
            <button class="btn btn-success" onclick="exportarFacturacionExcel('${mes}')">📊 Exportar a Excel</button>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Curso</th>
                        <th>Idioma/Nivel</th>
                        <th>Horas Facturables</th>
                        <th>Concepto para Factura</th>
                    </tr>
                </thead>
                <tbody>
`;

resumenGeneral.forEach(item => {
    const concepto = `Clases de ${item.idioma}_${item.curso}_${getMesNombre(mesNum)} ${anio}`;
    html += `
        <tr>
            <td><strong>${item.cliente}</strong></td>
            <td>${item.curso}</td>
            <td>${item.idioma} ${item.nivel}</td>
            <td><strong>${item.horas.toFixed(1)}h</strong></td>
            <td style="font-family: monospace; font-size: 0.9em;">${concepto}</td>
        </tr>
    `;
});

// Totales por cliente
let totalesPorCliente = {};
resumenGeneral.forEach(item => {
    if (!totalesPorCliente[item.cliente]) {
        totalesPorCliente[item.cliente] = 0;
    }
    totalesPorCliente[item.cliente] += item.horas;
});

html += `
                </tbody>
                <tfoot>
                    <tr style="background: #f8f9fa; font-weight: bold;">
                        <td colspan="3" style="text-align: right;">TOTALES POR CLIENTE:</td>
                        <td colspan="2"></td>
                    </tr>
`;

Object.entries(totalesPorCliente).forEach(([cliente, horas]) => {
    html += `
                    <tr style="background: #f8f9fa;">
                        <td colspan="3" style="text-align: right;">${cliente}:</td>
                        <td><strong>${horas.toFixed(1)}h</strong></td>
                        <td></td>
                    </tr>
    `;
});

const totalGeneral = resumenGeneral.reduce((sum, item) => sum + item.horas, 0);

html += `
                    <tr style="background: var(--primary); color: white; font-weight: bold; font-size: 1.1em;">
                        <td colspan="3" style="text-align: right;">TOTAL GENERAL:</td>
                        <td>${totalGeneral.toFixed(1)}h</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
`;

document.getElementById('reporteFacturacionContent').innerHTML = html;
```

}

async function exportarFacturacionExcel(mes) {
const [anio, mesNum] = mes.split(’-’);
const fechaInicio = `${anio}-${mesNum}-01`;
const fechaFin = new Date(parseInt(anio), parseInt(mesNum), 0).toISOString().split(‘T’)[0];

```
// Obtener todos los clientes activos
const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('nombre');

if (!clientes || clientes.length === 0) {
    alert('No hay clientes para exportar');
    return;
}

const workbook = new ExcelJS.Workbook();
let hojaAgregada = false;

for (const cliente of clientes) {
    const { data: cursos } = await supabase
        .from('cursos')
        .select('id, codigo_curso, idioma, nivel')
        .eq('cliente_id', cliente.id)
        .eq('activo', true)
        .order('codigo_curso');
    
    if (!cursos || cursos.length === 0) continue;
    
    let cursosConHoras = [];
    
    for (const curso of cursos) {
        const { data: clases } = await supabase
            .from('clases')
            .select(`
                id,
                duracion_horas,
                estado,
                es_recuperacion
            `)
            .eq('curso_id', curso.id)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .eq('estado', 'dictada');
        
        if (!clases || clases.length === 0) continue;
        
        const clasesIds = clases.map(c => c.id);
        const { data: asistencias } = await supabase
            .from('asistencias')
            .select('clase_id, estado_asistencia')
            .in('clase_id', clasesIds);
        
        let asistenciasPorClase = {};
        if (asistencias) {
            asistencias.forEach(a => {
                if (!asistenciasPorClase[a.clase_id]) {
                    asistenciasPorClase[a.clase_id] = [];
                }
                asistenciasPorClase[a.clase_id].push(a.estado_asistencia);
            });
        }
        
        let horasFacturables = 0;
        
        clases.forEach(clase => {
            const asists = asistenciasPorClase[clase.id] || [];
            const todosAusentesConAviso = asists.length > 0 && 
                asists.every(a => a === 'ausente_con_aviso');
            
            if (clase.es_recuperacion || !todosAusentesConAviso) {
                horasFacturables += parseFloat(clase.duracion_horas);
            }
        });
        
        if (horasFacturables > 0) {
            cursosConHoras.push({
                codigo: curso.codigo_curso,
                idioma: curso.idioma,
                nivel: curso.nivel,
                horas: horasFacturables
            });
        }
    }
    
    if (cursosConHoras.length === 0) continue;
    
    // CREAR HOJA PARA ESTE CLIENTE
    const worksheet = workbook.addWorksheet(cliente.codigo || cliente.nombre.substring(0, 31));
    
    // Configurar anchos de columna
    worksheet.getColumn(1).width = 25;  // Concepto/Curso
    worksheet.getColumn(2).width = 12;  // Horas
    worksheet.getColumn(3).width = 15;  // Valor Hora
    worksheet.getColumn(4).width = 12;  // Factor %
    worksheet.getColumn(5).width = 15;  // Neto
    worksheet.getColumn(6).width = 15;  // IVA 21%
    worksheet.getColumn(7).width = 15;  // Total
    
    // Fila 1: Título del cliente
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = cliente.nombre.toUpperCase();
    titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5F7C' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;
    
    // Fila 2: Mes
    worksheet.mergeCells('A2:G2');
    const mesCell = worksheet.getCell('A2');
    mesCell.value = `${getMesNombre(mesNum)} ${anio}`;
    mesCell.font = { size: 12, bold: true };
    mesCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;
    
    // Fila 3: Espacio
    worksheet.getRow(3).height = 10;
    
    // Fila 4: Encabezados
    const headerRow = worksheet.getRow(4);
    const headers = ['Concepto / Curso', 'Horas', 'Valor Hora', 'Factor %', 'Neto', 'IVA 21%', 'Total'];
    headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    headerRow.height = 25;
    
    // Filas de datos - una por curso
    let rowIndex = 5;
    cursosConHoras.forEach((curso, index) => {
        const concepto = `Clases de ${curso.idioma}_${curso.codigo}_${getMesNombre(mesNum)} ${anio}`;
        const row = worksheet.getRow(rowIndex);
        
        row.getCell(1).value = concepto;
        row.getCell(2).value = curso.horas;
        row.getCell(2).numFmt = '0.0';
        row.getCell(3).value = 0;  // Valor hora - usuario completa
        row.getCell(3).numFmt = '#,##0';
        row.getCell(4).value = 1;  // Factor 100% por defecto
        row.getCell(4).numFmt = '0.00';
        
        // Fórmulas
        // Neto = Horas * Valor Hora * Factor
        row.getCell(5).value = { formula: `B${rowIndex}*C${rowIndex}*D${rowIndex}` };
        row.getCell(5).numFmt = '#,##0.00';
        
        // IVA = Neto * 0.21
        row.getCell(6).value = { formula: `E${rowIndex}*0.21` };
        row.getCell(6).numFmt = '#,##0.00';
        
        // Total = Neto + IVA
        row.getCell(7).value = { formula: `E${rowIndex}+F${rowIndex}` };
        row.getCell(7).numFmt = '#,##0.00';
        
        // Estilo
        const fillColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF2F2F2';
        for (let col = 1; col <= 7; col++) {
            const cell = row.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
            };
        }
        
        row.height = 20;
        rowIndex++;
    });
    
    // Fila de espacio
    rowIndex++;
    
    // Fila de TOTALES
    const totalRow = worksheet.getRow(rowIndex);
    totalRow.getCell(1).value = 'TOTALES:';
    totalRow.getCell(1).font = { bold: true, size: 12 };
    totalRow.getCell(1).alignment = { horizontal: 'right' };
    
    // Total Horas
    totalRow.getCell(2).value = { formula: `SUM(B5:B${rowIndex-2})` };
    totalRow.getCell(2).numFmt = '0.0';
    totalRow.getCell(2).font = { bold: true };
    
    totalRow.getCell(3).value = '';
    totalRow.getCell(4).value = '';
    
    // Total Neto
    totalRow.getCell(5).value = { formula: `SUM(E5:E${rowIndex-2})` };
    totalRow.getCell(5).numFmt = '#,##0.00';
    totalRow.getCell(5).font = { bold: true };
    
    // Total IVA
    totalRow.getCell(6).value = { formula: `SUM(F5:F${rowIndex-2})` };
    totalRow.getCell(6).numFmt = '#,##0.00';
    totalRow.getCell(6).font = { bold: true };
    
    // Total General
    totalRow.getCell(7).value = { formula: `SUM(G5:G${rowIndex-2})` };
    totalRow.getCell(7).numFmt = '#,##0.00';
    totalRow.getCell(7).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27AE60' } };
    
    // Bordes en fila de totales
    for (let col = 1; col <= 7; col++) {
        const cell = totalRow.getCell(col);
        cell.fill = cell.fill || { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        cell.border = {
            top: { style: 'double' },
            bottom: { style: 'double' }
        };
        cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'right' : 'right' };
    }
    totalRow.height = 25;
    
    // Fila de espacio
    rowIndex += 2;
    
    // Nota explicativa del Factor
    const notaRow = worksheet.getRow(rowIndex);
    worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
    notaRow.getCell(1).value = 'NOTA: El Factor % permite ajustar el precio (ej: 1.00 = sin cambio, 1.25 = +25%, 0.85 = -15%)';
    notaRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF666666' } };
    notaRow.getCell(1).alignment = { horizontal: 'left' };
    
    hojaAgregada = true;
}

if (!hojaAgregada) {
    alert('No hay clases facturables para exportar');
    return;
}

// Generar y descargar
const buffer = await workbook.xlsx.writeBuffer();
const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `Facturacion_${getMesNombre(mesNum)}_${anio}.xlsx`;
a.click();
window.URL.revokeObjectURL(url);
```

}

// ==================== MÓDULO DE AGENDA ====================

const DIAS_SEMANA = [‘Domingo’, ‘Lunes’, ‘Martes’, ‘Miércoles’, ‘Jueves’, ‘Viernes’, ‘Sábado’];
const HORAS_AGENDA = [‘08:00’, ‘09:00’, ‘10:00’, ‘11:00’, ‘12:00’, ‘13:00’, ‘14:00’, ‘15:00’, ‘16:00’, ‘17:00’, ‘18:00’, ‘19:00’, ‘20:00’];

async function showAgenda() {
showScreen(‘agendaScreen’);

```
// Si es admin, mostrar selector de profesora
if (isAdmin) {
    document.getElementById('agendaProfesoraSelect').classList.remove('hidden');
    document.getElementById('btnAgregarBloqueo').style.display = 'none';
    
    // Cargar profesoras
    const { data: profesoras } = await supabase
        .from('profesoras')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
    
    const select = document.getElementById('agendaProfesoraSelectInput');
    select.innerHTML = '<option value="">-- Seleccionar profesora --</option>';
    if (profesoras) {
        profesoras.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.id;
            option.textContent = prof.nombre;
            select.appendChild(option);
        });
    }
    
    // Mostrar botón para buscar disponibilidad (SOLO ADMIN)
    if (!document.getElementById('btnBuscarDisponibilidad')) {
        const btnBuscar = document.createElement('button');
        btnBuscar.id = 'btnBuscarDisponibilidad';
        btnBuscar.className = 'btn btn-primary';
        btnBuscar.textContent = '🔍 Buscar Disponibilidad';
        btnBuscar.onclick = () => showBuscarDisponibilidad();
        btnBuscar.style.marginLeft = '10px';
        document.getElementById('btnAgregarBloqueo').parentElement.appendChild(btnBuscar);
    } else {
        // Asegurar que sea visible si es admin
        document.getElementById('btnBuscarDisponibilidad').style.display = 'inline-block';
    }
} else {
    document.getElementById('agendaProfesoraSelect').classList.add('hidden');
    document.getElementById('btnAgregarBloqueo').style.display = 'inline-block';
    
    // Ocultar botón de buscar disponibilidad si existe (PROFESORAS NO LO VEN)
    const btnBuscar = document.getElementById('btnBuscarDisponibilidad');
    if (btnBuscar) {
        btnBuscar.style.display = 'none';
    }
    
    await cargarAgenda(currentUser.id);
}
```

}

async function cargarAgendaProfesora() {
const profesoraId = document.getElementById(‘agendaProfesoraSelectInput’).value;
if (profesoraId) {
await cargarAgenda(profesoraId);
}
}

async function cargarAgenda(profesoraId) {
// Sincronizar cursos asignados (eliminar antiguos, agregar nuevos)
await sincronizarCursosEnAgenda(profesoraId);

```
// Obtener bloques de disponibilidad
const { data: bloques, error } = await supabase
    .from('disponibilidad_profesoras')
    .select(`
        *,
        cursos (codigo_curso, clientes(nombre))
    `)
    .eq('profesora_id', profesoraId)
    .order('dia_semana')
    .order('hora_inicio');

if (error) {
    console.error('Error cargando agenda:', error);
    return;
}

// Generar HTML de la agenda
generarVistaAgenda(bloques || []);
```

}

async function sincronizarCursosEnAgenda(profesoraId) {
console.log(’=== SINCRONIZAR AGENDA ===’);
console.log(‘Profesora ID:’, profesoraId);

```
// Eliminar TODOS los bloques "asignados" y "disponibles" existentes
const { error: deleteError } = await supabase
    .from('disponibilidad_profesoras')
    .delete()
    .eq('profesora_id', profesoraId)
    .in('tipo', ['asignado', 'disponible']);

if (deleteError) {
    console.error('Error eliminando bloques:', deleteError);
} else {
    console.log('✓ Bloques asignados y disponibles eliminados');
}

// Obtener cursos asignados a esta profesora
const { data: asignaciones, error: asigError } = await supabase
    .from('cursos_profesoras')
    .select('curso_id')
    .eq('profesora_id', profesoraId)
    .eq('activo', true);

console.log('Asignaciones encontradas:', asignaciones);

if (asigError) {
    console.error('Error obteniendo asignaciones:', asigError);
    return;
}

if (!asignaciones || asignaciones.length === 0) {
    console.log('No hay cursos asignados a esta profesora');
    return;
}

const cursosIds = asignaciones.map(a => a.curso_id);
console.log('IDs de cursos:', cursosIds);

// Obtener horarios de esos cursos desde horarios_cursos
const { data: horarios, error: horError } = await supabase
    .from('horarios_cursos')
    .select('*')
    .in('curso_id', cursosIds);

console.log('Horarios encontrados:', horarios);

if (horError) {
    console.error('Error obteniendo horarios:', horError);
    return;
}

if (!horarios || horarios.length === 0) {
    console.log('No hay horarios definidos para estos cursos');
    return;
}

const bloquesAsignados = horarios.map(horario => ({
    profesora_id: profesoraId,
    dia_semana: horario.dia_semana,
    hora_inicio: horario.hora_inicio,
    hora_fin: horario.hora_fin,
    tipo: 'asignado',
    curso_id: horario.curso_id
}));

console.log('Bloques a insertar:', bloquesAsignados);

const { error: insertError } = await supabase
    .from('disponibilidad_profesoras')
    .insert(bloquesAsignados);

if (insertError) {
    console.error('Error insertando bloques:', insertError);
} else {
    console.log('✓ Bloques asignados insertados correctamente');
}

// YA NO creamos bloques "disponibles" grandes
// Los disponibles se calcularán en tiempo real en generarVistaAgenda()
// basándose en los huecos entre asignados y bloqueados

console.log('=== FIN SINCRONIZAR ===');
```

}

async function inicializarAgenda(profesoraId) {
// Verificar si ya tiene bloques cargados
const { data: existing, count } = await supabase
.from(‘disponibilidad_profesoras’)
.select(‘id’, { count: ‘exact’, head: true })
.eq(‘profesora_id’, profesoraId);

```
if (count > 0) {
    // Ya tiene agenda inicializada
    return;
}

// Obtener cursos asignados a esta profesora
const { data: asignaciones } = await supabase
    .from('cursos_profesoras')
    .select('curso_id, cursos(id, codigo_curso)')
    .eq('profesora_id', profesoraId)
    .eq('activo', true);

if (!asignaciones || asignaciones.length === 0) {
    // No tiene cursos, marcar todo como disponible
    const bloquesDisponibles = [];
    for (let dia = 1; dia <= 5; dia++) {
        bloquesDisponibles.push({
            profesora_id: profesoraId,
            dia_semana: dia,
            hora_inicio: '08:00',
            hora_fin: '20:00',
            tipo: 'disponible'
        });
    }
    
    if (bloquesDisponibles.length > 0) {
        await supabase.from('disponibilidad_profesoras').insert(bloquesDisponibles);
    }
    return;
}

const cursosIds = asignaciones.map(a => a.curso_id);

// Obtener horarios de esos cursos desde horarios_cursos
const { data: horarios } = await supabase
    .from('horarios_cursos')
    .select('*')
    .in('curso_id', cursosIds);

if (horarios && horarios.length > 0) {
    const bloquesAsignados = horarios.map(horario => ({
        profesora_id: profesoraId,
        dia_semana: horario.dia_semana,
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        tipo: 'asignado',
        curso_id: horario.curso_id
    }));
    
    await supabase.from('disponibilidad_profesoras').insert(bloquesAsignados);
}

// Marcar resto como disponible (8:00 a 20:00, Lunes a Viernes)
const bloquesDisponibles = [];
for (let dia = 1; dia <= 5; dia++) {
    bloquesDisponibles.push({
        profesora_id: profesoraId,
        dia_semana: dia,
        hora_inicio: '08:00',
        hora_fin: '20:00',
        tipo: 'disponible'
    });
}

if (bloquesDisponibles.length > 0) {
    await supabase.from('disponibilidad_profesoras').insert(bloquesDisponibles);
}
```

}

function sumarHoras(hora, duracion) {
const [h, m] = hora.split(’:’).map(Number);
const totalMinutos = h * 60 + m + duracion * 60;
const nuevaHora = Math.floor(totalMinutos / 60);
const nuevosMinutos = totalMinutos % 60;
return `${String(nuevaHora).padStart(2, '0')}:${String(nuevosMinutos).padStart(2, '0')}`;
}

function generarVistaAgenda(bloques) {
// Agrupar bloques por día (solo asignados y bloqueados)
const bloquePorDia = {1: [], 2: [], 3: [], 4: [], 5: []};

```
bloques.forEach(bloque => {
    if (bloquePorDia[bloque.dia_semana] && bloque.tipo !== 'disponible') {
        bloquePorDia[bloque.dia_semana].push(bloque);
    }
});

// Ordenar bloques por hora dentro de cada día
Object.keys(bloquePorDia).forEach(dia => {
    bloquePorDia[dia].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
});

// Calcular bloques disponibles para cada día (huecos entre ocupados)
const HORARIO_INICIO = '08:00';
const HORARIO_FIN = '20:00';

Object.keys(bloquePorDia).forEach(dia => {
    const ocupados = bloquePorDia[dia];
    const disponibles = [];
    
    if (ocupados.length === 0) {
        // Todo el día disponible
        disponibles.push({
            tipo: 'disponible',
            hora_inicio: HORARIO_INICIO,
            hora_fin: HORARIO_FIN,
            dia_semana: parseInt(dia)
        });
    } else {
        // Calcular huecos
        let inicioLibre = HORARIO_INICIO;
        
        ocupados.forEach(ocupado => {
            // Hueco antes de este bloque ocupado
            if (inicioLibre < ocupado.hora_inicio) {
                disponibles.push({
                    tipo: 'disponible',
                    hora_inicio: inicioLibre,
                    hora_fin: ocupado.hora_inicio,
                    dia_semana: parseInt(dia)
                });
            }
            
            // Mover inicio libre al final del bloque ocupado
            inicioLibre = ocupado.hora_fin > inicioLibre ? ocupado.hora_fin : inicioLibre;
        });
        
        // Hueco final (después del último bloque ocupado)
        if (inicioLibre < HORARIO_FIN) {
            disponibles.push({
                tipo: 'disponible',
                hora_inicio: inicioLibre,
                hora_fin: HORARIO_FIN,
                dia_semana: parseInt(dia)
            });
        }
    }
    
    // Agregar disponibles al día
    bloquePorDia[dia] = [...ocupados, ...disponibles].sort((a, b) => 
        a.hora_inicio.localeCompare(b.hora_inicio)
    );
});

let html = `
    <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 900px;">
            <thead>
                <tr>
                    <th style="background: var(--primary); color: white; padding: 1rem; text-align: center; border: 1px solid #ddd;">Lunes</th>
                    <th style="background: var(--primary); color: white; padding: 1rem; text-align: center; border: 1px solid #ddd;">Martes</th>
                    <th style="background: var(--primary); color: white; padding: 1rem; text-align: center; border: 1px solid #ddd;">Miércoles</th>
                    <th style="background: var(--primary); color: white; padding: 1rem; text-align: center; border: 1px solid #ddd;">Jueves</th>
                    <th style="background: var(--primary); color: white; padding: 1rem; text-align: center; border: 1px solid #ddd;">Viernes</th>
                </tr>
            </thead>
            <tbody>
                <tr style="vertical-align: top;">
`;

// Generar columnas para cada día
for (let dia = 1; dia <= 5; dia++) {
    html += '<td style="border: 1px solid #ddd; padding: 0.5rem; min-height: 400px;">';
    
    const bloquesDelDia = bloquePorDia[dia];
    
    if (bloquesDelDia.length === 0) {
        html += '<div style="color: #999; text-align: center; padding: 2rem;">Sin horarios definidos</div>';
    } else {
        bloquesDelDia.forEach(bloque => {
            const esEditable = bloque.tipo === 'bloqueado';
            const deleteBtn = esEditable ? 
                `<button class="bloque-delete" onclick="eliminarBloque('${bloque.id}')" title="Eliminar" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; line-height: 1;">×</button>` : '';
            
            let titulo = '';
            let claseInfo = '';
            if (bloque.tipo === 'asignado' && bloque.cursos) {
                titulo = bloque.cursos.codigo_curso;
                claseInfo = bloque.cursos.clientes ? `<div style="font-size: 0.75rem; opacity: 0.9; margin-top: 0.25rem;">${bloque.cursos.clientes.nombre}</div>` : '';
            } else if (bloque.tipo === 'bloqueado') {
                titulo = 'Bloqueado';
            } else {
                titulo = 'Disponible';
            }
            
            html += `
                <div class="bloque-horario bloque-${bloque.tipo}" style="position: relative; margin-bottom: 0.5rem; padding: 0.75rem; border-radius: 5px; cursor: ${esEditable ? 'pointer' : 'default'};">
                    ${deleteBtn}
                    <div style="font-weight: 600; font-size: 0.9rem;">${titulo}</div>
                    <div style="font-size: 0.8rem; opacity: 0.95; margin-top: 0.25rem;">${bloque.hora_inicio} - ${bloque.hora_fin}</div>
                    ${claseInfo}
                </div>
            `;
        });
    }
    
    html += '</td>';
}

html += `
                </tr>
            </tbody>
        </table>
    </div>
`;

document.getElementById('agendaContent').innerHTML = html;
```

}

function mostrarModalBloqueo() {
openModal(‘bloqueoModal’);
}

async function guardarBloqueo() {
const dia = parseInt(document.getElementById(‘bloqueoDia’).value);
const horaDesde = document.getElementById(‘bloqueoDesde’).value;
const horaHasta = document.getElementById(‘bloqueoHasta’).value;

```
if (!horaDesde || !horaHasta) {
    showModalAlert('bloqueoModalAlert', 'Por favor completá todos los campos', 'error');
    return;
}

if (horaDesde >= horaHasta) {
    showModalAlert('bloqueoModalAlert', 'La hora de inicio debe ser menor a la hora de fin', 'error');
    return;
}

// Verificar solapamiento con bloques existentes (excepto disponibles)
const { data: existentes, error: errorCheck } = await supabase
    .from('disponibilidad_profesoras')
    .select('*')
    .eq('profesora_id', currentUser.id)
    .eq('dia_semana', dia)
    .neq('tipo', 'disponible');

if (existentes) {
    const solapa = existentes.some(b => {
        return !(horaHasta <= b.hora_inicio || horaDesde >= b.hora_fin);
    });
    
    if (solapa) {
        showModalAlert('bloqueoModalAlert', 'Este horario se solapa con un bloque existente', 'error');
        return;
    }
}

// Eliminar bloques "disponible" que se solapen
const { data: disponibles } = await supabase
    .from('disponibilidad_profesoras')
    .select('id, hora_inicio, hora_fin')
    .eq('profesora_id', currentUser.id)
    .eq('dia_semana', dia)
    .eq('tipo', 'disponible');

if (disponibles) {
    for (const disp of disponibles) {
        if (!(horaHasta <= disp.hora_inicio || horaDesde >= disp.hora_fin)) {
            // Se solapa, eliminar
            await supabase
                .from('disponibilidad_profesoras')
                .delete()
                .eq('id', disp.id);
            
            // Crear nuevos bloques disponibles para los restos
            if (disp.hora_inicio < horaDesde) {
                await supabase.from('disponibilidad_profesoras').insert({
                    profesora_id: currentUser.id,
                    dia_semana: dia,
                    hora_inicio: disp.hora_inicio,
                    hora_fin: horaDesde,
                    tipo: 'disponible'
                });
            }
            
            if (disp.hora_fin > horaHasta) {
                await supabase.from('disponibilidad_profesoras').insert({
                    profesora_id: currentUser.id,
                    dia_semana: dia,
                    hora_inicio: horaHasta,
                    hora_fin: disp.hora_fin,
                    tipo: 'disponible'
                });
            }
        }
    }
}

// Insertar bloqueo
const { error } = await supabase
    .from('disponibilidad_profesoras')
    .insert({
        profesora_id: currentUser.id,
        dia_semana: dia,
        hora_inicio: horaDesde,
        hora_fin: horaHasta,
        tipo: 'bloqueado'
    });

if (error) {
    showModalAlert('bloqueoModalAlert', 'Error al guardar: ' + error.message, 'error');
    return;
}

closeModal('bloqueoModal');
await cargarAgenda(currentUser.id);
```

}

async function eliminarBloque(bloqueId) {
if (!confirm(’¿Eliminar este bloqueo?’)) return;

```
// Obtener datos del bloqueo antes de eliminar
const { data: bloque } = await supabase
    .from('disponibilidad_profesoras')
    .select('*')
    .eq('id', bloqueId)
    .single();

if (!bloque || bloque.tipo !== 'bloqueado') {
    alert('Solo se pueden eliminar bloqueos manuales');
    return;
}

const { error } = await supabase
    .from('disponibilidad_profesoras')
    .delete()
    .eq('id', bloqueId);

if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
}

// Crear bloque disponible en su lugar
await supabase.from('disponibilidad_profesoras').insert({
    profesora_id: bloque.profesora_id,
    dia_semana: bloque.dia_semana,
    hora_inicio: bloque.hora_inicio,
    hora_fin: bloque.hora_fin,
    tipo: 'disponible'
});

await cargarAgenda(bloque.profesora_id);
```

}

// ==================== BÚSQUEDA DE DISPONIBILIDAD (ADMIN) ====================

async function showBuscarDisponibilidad() {
showScreen(‘buscarDisponibilidadScreen’);

```
// Cargar profesoras en selector
const { data: profesoras } = await supabase
    .from('profesoras')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

const select = document.getElementById('buscarProfesora');
select.innerHTML = '<option value="">Todas las profesoras</option>';
if (profesoras) {
    profesoras.forEach(prof => {
        const option = document.createElement('option');
        option.value = prof.id;
        option.textContent = prof.nombre;
        select.appendChild(option);
    });
}
```

}

async function ejecutarBusqueda() {
const horasNecesarias = parseFloat(document.getElementById(‘buscarHoras’).value);
const horaDesde = document.getElementById(‘buscarHoraDesde’).value;
const horaHasta = document.getElementById(‘buscarHoraHasta’).value;
const profesoraId = document.getElementById(‘buscarProfesora’).value;

```
// Obtener días seleccionados
const diasSeleccionados = [];
for (let i = 1; i <= 5; i++) {
    if (document.getElementById(`buscarDia${i}`).checked) {
        diasSeleccionados.push(i);
    }
}

if (diasSeleccionados.length === 0) {
    alert('Seleccioná al menos un día de la semana');
    return;
}

// Obtener profesoras a buscar
let profesoras;
if (profesoraId) {
    const { data } = await supabase
        .from('profesoras')
        .select('id, nombre')
        .eq('id', profesoraId)
        .single();
    profesoras = data ? [data] : [];
} else {
    const { data } = await supabase
        .from('profesoras')
        .select('id, nombre')
        .eq('activo', true);
    profesoras = data || [];
}

const resultados = [];

for (const profesora of profesoras) {
    console.log(`=== Buscando para: ${profesora.nombre} ===`);
    
    // Obtener TODOS los bloques de la profesora (asignados, bloqueados, disponibles)
    const { data: bloques } = await supabase
        .from('disponibilidad_profesoras')
        .select('*')
        .eq('profesora_id', profesora.id)
        .in('dia_semana', diasSeleccionados);
    
    console.log(`Bloques encontrados:`, bloques);
    
    if (!bloques) continue;
    
    // Calcular horas libres REALES por día (horario laboral - asignados - bloqueados)
    let horasTotales = 0;
    const detalleHorarios = [];
    
    diasSeleccionados.forEach(dia => {
        // Bloques ocupados (asignados + bloqueados) de este día
        const ocupados = bloques
            .filter(b => b.dia_semana === dia && (b.tipo === 'asignado' || b.tipo === 'bloqueado'))
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
        
        console.log(`Día ${DIAS_SEMANA[dia]}: ${ocupados.length} bloques ocupados`, ocupados);
        
        // Calcular huecos libres
        let inicioLibre = horaDesde;
        
        ocupados.forEach(ocupado => {
            // Si hay un hueco antes de este bloque ocupado
            if (inicioLibre < ocupado.hora_inicio && inicioLibre < horaHasta) {
                const finHueco = ocupado.hora_inicio < horaHasta ? ocupado.hora_inicio : horaHasta;
                const duracion = calcularDuracionHoras(inicioLibre, finHueco);
                
                if (duracion > 0) {
                    horasTotales += duracion;
                    detalleHorarios.push({
                        dia: DIAS_SEMANA[dia],
                        inicio: inicioLibre,
                        fin: finHueco,
                        duracion
                    });
                }
            }
            
            // Mover inicio libre al final de este bloque ocupado
            inicioLibre = ocupado.hora_fin > inicioLibre ? ocupado.hora_fin : inicioLibre;
        });
        
        // Hueco final (después del último bloque ocupado hasta horaHasta)
        if (inicioLibre < horaHasta) {
            const duracion = calcularDuracionHoras(inicioLibre, horaHasta);
            
            if (duracion > 0) {
                horasTotales += duracion;
                detalleHorarios.push({
                    dia: DIAS_SEMANA[dia],
                    inicio: inicioLibre,
                    fin: horaHasta,
                    duracion
                });
            }
        }
    });
    
    if (horasTotales >= horasNecesarias) {
        console.log(`✅ ${profesora.nombre}: ${horasTotales.toFixed(1)}h disponibles`);
        resultados.push({
            profesora: profesora.nombre,
            horasTotales,
            horarios: detalleHorarios
        });
    } else {
        console.log(`❌ ${profesora.nombre}: Solo ${horasTotales.toFixed(1)}h (necesita ${horasNecesarias}h)`);
    }
}

mostrarResultadosBusqueda(resultados, horasNecesarias);
```

}

function calcularDuracionHoras(inicio, fin) {
// Validar que sean strings
if (typeof inicio !== ‘string’ || typeof fin !== ‘string’) {
console.error(‘calcularDuracionHoras: inicio y fin deben ser strings’, { inicio, fin });
return 0;
}

```
// Validar formato HH:MM
if (!inicio.includes(':') || !fin.includes(':')) {
    console.error('calcularDuracionHoras: formato inválido', { inicio, fin });
    return 0;
}

const [hi, mi] = inicio.split(':').map(Number);
const [hf, mf] = fin.split(':').map(Number);

// Validar que sean números válidos
if (isNaN(hi) || isNaN(mi) || isNaN(hf) || isNaN(mf)) {
    console.error('calcularDuracionHoras: valores no numéricos', { inicio, fin });
    return 0;
}

const minutos = (hf * 60 + mf) - (hi * 60 + mi);
return minutos / 60;
```

}

function mostrarResultadosBusqueda(resultados, horasNecesarias) {
let html = ‘’;

```
if (resultados.length === 0) {
    html = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <p>No se encontraron profesoras con disponibilidad que cumplan los criterios</p>
        </div>
    `;
} else {
    html = `
        <div class="card">
            <h3 style="color: var(--primary);">Resultados (${resultados.length} profesora${resultados.length > 1 ? 's' : ''})</h3>
            <p style="color: var(--secondary); margin-bottom: 1rem;">
                Buscando ${horasNecesarias}h semanales
            </p>
    `;
    
    resultados.forEach(resultado => {
        html += `
            <div class="card" style="background: #f8f9fa; margin-bottom: 1rem;">
                <h4 style="margin-top: 0; color: var(--primary);">
                    ✅ ${resultado.profesora} - ${resultado.horasTotales.toFixed(1)}h disponibles
                </h4>
                <div style="margin-left: 1rem;">
        `;
        
        resultado.horarios.forEach(h => {
            html += `
                <div style="margin: 0.5rem 0;">
                    📅 ${h.dia}: ${h.inicio} - ${h.fin} (${h.duracion.toFixed(1)}h)
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
}

document.getElementById('resultadosBusqueda').innerHTML = html;
```

}

// ==================== FIN MÓDULO DE AGENDA ====================

// ==================== FUNCIONES AUXILIARES ====================
function showError(elementId, message, type = ‘error’) {
const element = document.getElementById(elementId);
element.textContent = message;
element.className = type === ‘success’ ? ‘alert alert-success’ : ‘alert alert-error’;
element.classList.remove(‘hidden’);
}

function showAlert(elementId, message, type) {
const element = document.getElementById(elementId);
element.textContent = message;
element.className = `alert alert-${type}`;
element.classList.remove(‘hidden’);
}

function showModalAlert(elementId, message, type) {
const element = document.getElementById(elementId);
element.textContent = message;
element.className = `alert alert-${type}`;
element.classList.remove(‘hidden’);
}

function openModal(modalId) {
document.getElementById(modalId).classList.add(‘active’);
}

function closeModal(modalId) {
document.getElementById(modalId).classList.remove(‘active’);
editingId = null;
}

function formatFecha(fecha) {
const meses = [‘Ene’, ‘Feb’, ‘Mar’, ‘Abr’, ‘May’, ‘Jun’, ‘Jul’, ‘Ago’, ‘Sep’, ‘Oct’, ‘Nov’, ‘Dic’];
const d = new Date(fecha + ‘T00:00:00’);
return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

function getMesNombre(mesNum) {
const meses = [‘Enero’, ‘Febrero’, ‘Marzo’, ‘Abril’, ‘Mayo’, ‘Junio’, ‘Julio’, ‘Agosto’, ‘Septiembre’, ‘Octubre’, ‘Noviembre’, ‘Diciembre’];
return meses[parseInt(mesNum) - 1];
}

// Cerrar modales al hacer click fuera
window.onclick = function(event) {
if (event.target.classList.contains(‘modal’)) {
event.target.classList.remove(‘active’);
editingId = null;
}
}

// ==================== EXPORTAR FUNCIONES GLOBALMENTE ====================
// Hacer las funciones accesibles desde el HTML (onclick)
window.login = login;
window.logout = logout;
window.forgotPassword = forgotPassword;
window.resetPassword = resetPassword;
window.showRegistroAsistencia = showRegistroAsistencia;
window.showAdmin = showAdmin;
window.showReportes = showReportes;
window.backToMenu = backToMenu;
window.loadParticipantes = loadParticipantes;
window.toggleCancelacion = toggleCancelacion;
window.toggleRecuperacion = toggleRecuperacion;
window.guardarAsistencia = guardarAsistencia;
window.showClientesPanel = showClientesPanel;
window.showClienteModal = showClienteModal;
window.saveCliente = saveCliente;
window.editCliente = editCliente;
window.deleteCliente = deleteCliente;
window.openModal = openModal;
window.closeModal = closeModal;
window.showCursosPanel = showCursosPanel;
window.loadCursos = loadCursos;
window.showCursoModal = showCursoModal;
window.loadParticipantesForCurso = loadParticipantesForCurso;
window.generateCodigoCurso = generateCodigoCurso;
window.saveCurso = saveCurso;
window.editCurso = editCurso;
window.deleteCurso = deleteCurso;
window.showProfesorasPanel = showProfesorasPanel;
window.showProfesoraModal = showProfesoraModal;
window.saveProfesora = saveProfesora;
window.editProfesora = editProfesora;
window.deleteProfesora = deleteProfesora;
window.showParticipantesPanel = showParticipantesPanel;
window.showParticipanteModal = showParticipanteModal;
window.saveParticipante = saveParticipante;
window.editParticipante = editParticipante;
window.deleteParticipante = deleteParticipante;
window.showReporteClienteScreen = showReporteClienteScreen;
window.generarReporteCliente = generarReporteCliente;
window.exportarReporteClienteExcel = exportarReporteClienteExcel;
window.showReporteProfesoraScreen = showReporteProfesoraScreen;
window.generarReporteProfesora = generarReporteProfesora;
window.exportarReporteProfesoraExcel = exportarReporteProfesoraExcel;
window.showReporteFacturacionScreen = showReporteFacturacionScreen;
window.generarReporteFacturacion = generarReporteFacturacion;
window.exportarFacturacionExcel = exportarFacturacionExcel;
window.showAgenda = showAgenda;
window.cargarAgendaProfesora = cargarAgendaProfesora;
window.mostrarModalBloqueo = mostrarModalBloqueo;
window.guardarBloqueo = guardarBloqueo;
window.eliminarBloque = eliminarBloque;
window.showBuscarDisponibilidad = showBuscarDisponibilidad;
window.ejecutarBusqueda = ejecutarBusqueda;
window.agregarHorario = agregarHorario;
window.eliminarHorario = eliminarHorario;
window.calcularHoraFin = calcularHoraFin;
