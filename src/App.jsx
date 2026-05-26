// ══════════════════════════════════════════════════════════════════════
//  MÓDULO DE FINANZAS DEL CORO — FinanzasModulo.jsx
//  Instrucciones de integración al final del archivo
// ══════════════════════════════════════════════════════════════════════
//
//  TABLAS SUPABASE NECESARIAS — ejecuta el SQL al final del archivo
//
//  Componentes exportados:
//    <ModuloFinanzas user={user} members={members} onReload={onReload} />
//    <InfoGastos user={user} />   ← visible para TODOS
//
// ══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

// ── Re‑usar config global (ya definida en App.jsx) ───────────────────
const SUPABASE_URL = "https://ttbipbhfswcwwgcwaist.supabase.co";
const SUPABASE_KEY = "sb_publishable_mz6TyeuTP3TA6XQPOunXFQ_ad0Cp9fg";

// ── Colores (mismos que App.jsx) ──────────────────────────────────────
const C = {
  primary: "#1D9E75",
  primaryDark: "#157a5a",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  dark: "#1e293b",
  gray: "#64748b",
  light: "#f1f5f9",
};

// ── Helpers HTTP ──────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("sb_access_token") || SUPABASE_KEY;
}

async function dbGet(table, filters = "") {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=*${filters}&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbPatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function dbDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${getToken()}`,
    },
  });
  if (!res.ok) throw new Error(await res.text());
}

async function uploadFile(bucket, path, file) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": file.type,
      },
      body: file,
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ── Utilidades ─────────────────────────────────────────────────────────
const fmtCLP = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
    n || 0
  );

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function mesLabel(iso) {
  const [y, m] = iso.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
}

function currentMesIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const ini = (n) => (n || "?").charAt(0).toUpperCase();

// ── Micro componentes ──────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, style = {} }) {
  const bg =
    variant === "primary"
      ? C.primary
      : variant === "danger"
      ? "#ef4444"
      : variant === "ghost"
      ? "transparent"
      : C.light;
  const color =
    variant === "primary" || variant === "danger" ? "white" : C.dark;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 8,
        border: variant === "ghost" ? `1px solid ${C.border}` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 500,
        background: bg,
        color,
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ icon, label, value, color = C.primary, sub }) {
  return (
    <div
      style={{
        background: color + "10",
        border: `1px solid ${color}30`,
        borderRadius: 14,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color + "20",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.gray, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Avatar({ nombre, foto_url, size = 32, color = C.primary }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: size * 0.38,
        fontWeight: 700,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {foto_url ? (
        <img src={foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        ini(nombre)
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ padding: "30px 0", textAlign: "center", color: C.gray, fontSize: 13 }}>
      ⏳ Cargando...
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? C.primary : "transparent",
        color: active ? "white" : C.gray,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  HOOKS
// ══════════════════════════════════════════════════════════════════════

function useFinanzasData() {
  const [cuotas, setCuotas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [miembrosEnCuotas, setMiembrosEnCuotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, a, g, mc] = await Promise.all([
        dbGet("fin_cuotas"),
        dbGet("fin_pagos"),
        dbGet("fin_actividades"),
        dbGet("fin_gastos"),
        dbGet("fin_miembros_cuotas"),
      ]);
      setCuotas(c || []);
      setPagos(p || []);
      setActividades(a || []);
      setGastos(g || []);
      setMiembrosEnCuotas(mc || []);
    } catch (e) {
      console.error("Error cargando finanzas:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { cuotas, pagos, actividades, gastos, miembrosEnCuotas, loading, reload };
}

// ══════════════════════════════════════════════════════════════════════
//  TAB: CUOTAS MENSUALES
// ══════════════════════════════════════════════════════════════════════

function TabCuotas({ members, cuotas, pagos, miembrosEnCuotas, reload }) {
  const [mesSeleccionado, setMesSeleccionado] = useState(currentMesIso());
  const [valorCuota, setValorCuota] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const fileRefs = useRef({});

  // Miembros activos en sistema de cuotas
  const miembrosIds = new Set(miembrosEnCuotas.map((m) => m.integrante_id));
  const miembrosActivos = members.filter((m) => miembrosIds.has(m.id));

  // Cuota del mes seleccionado
  const cuotaMes = cuotas.find((c) => c.mes === mesSeleccionado);
  const pagosMes = pagos.filter((p) => p.mes === mesSeleccionado);

  const pagaron = new Set(pagosMes.map((p) => p.integrante_id));
  const totalEsperado = miembrosActivos.length * (cuotaMes?.valor || 0);
  const totalRecaudado = pagosMes.reduce((s, p) => s + (p.monto || 0), 0);

  // Meses disponibles (generar últimos 12 + próximo)
  const mesesDisponibles = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function guardarValorCuota() {
    if (!valorCuota || isNaN(parseFloat(valorCuota))) return;
    setSaving(true);
    try {
      if (cuotaMes) {
        await dbPatch("fin_cuotas", cuotaMes.id, { valor: parseFloat(valorCuota) });
      } else {
        await dbPost("fin_cuotas", { mes: mesSeleccionado, valor: parseFloat(valorCuota) });
      }
      setValorCuota("");
      await reload();
    } catch (e) {
      alert("Error: " + e.message);
    }
    setSaving(false);
  }

  async function togglePago(miembro) {
    if (pagaron.has(miembro.id)) {
      // Desmarcar
      const pago = pagosMes.find((p) => p.integrante_id === miembro.id);
      if (!pago) return;
      try {
        await dbDelete("fin_pagos", pago.id);
        await reload();
      } catch (e) {
        alert("Error: " + e.message);
      }
    } else {
      // Marcar como pagado
      try {
        await dbPost("fin_pagos", {
          integrante_id: miembro.id,
          mes: mesSeleccionado,
          monto: cuotaMes?.valor || 0,
          tipo: "cuota",
        });
        await reload();
      } catch (e) {
        alert("Error: " + e.message);
      }
    }
  }

  async function subirComprobante(miembro, file) {
    setUploadingId(miembro.id);
    try {
      const pago = pagosMes.find((p) => p.integrante_id === miembro.id);
      if (!pago) {
        alert("Primero marca el pago, luego adjunta el comprobante.");
        setUploadingId(null);
        return;
      }
      const path = `comprobantes/${mesSeleccionado}/${miembro.id}_${Date.now()}.${file.name.split(".").pop()}`;
      const url = await uploadFile("finanzas", path, file);
      await dbPatch("fin_pagos", pago.id, { comprobante_url: url });
      await reload();
    } catch (e) {
      alert("Error subiendo comprobante: " + e.message);
    }
    setUploadingId(null);
  }

  const pctPago = miembrosActivos.length
    ? Math.round((pagaron.size / miembrosActivos.length) * 100)
    : 0;

  return (
    <div>
      {/* Selector de mes y valor de cuota */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: C.gray, marginBottom: 4 }}>Mes</div>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            style={inputS}
          >
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{mesLabel(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.gray, marginBottom: 4 }}>
            Valor cuota {cuotaMes ? `(actual: ${fmtCLP(cuotaMes.valor)})` : "(sin definir)"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              placeholder="Ej: 5000"
              value={valorCuota}
              onChange={(e) => setValorCuota(e.target.value)}
              style={{ ...inputS, width: 130 }}
            />
            <Btn onClick={guardarValorCuota} disabled={saving}>
              {saving ? "Guardando..." : "Fijar cuota"}
            </Btn>
          </div>
        </div>
      </div>

      {/* Stats del mes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon="👥" label="En sistema" value={miembrosActivos.length} color="#3b82f6" />
        <StatCard icon="✅" label="Pagaron" value={pagaron.size} color={C.primary} sub={`${pctPago}%`} />
        <StatCard icon="⚠️" label="Morosos" value={miembrosActivos.length - pagaron.size} color="#ef4444" />
        <StatCard icon="💰" label="Recaudado" value={fmtCLP(totalRecaudado)} color="#8b5cf6" sub={`de ${fmtCLP(totalEsperado)}`} />
      </div>

      {/* Barra de progreso */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pctPago}%`,
              background: `linear-gradient(90deg,${C.primary},${C.primaryDark})`,
              borderRadius: 4,
              transition: "width 0.4s",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: C.gray, marginTop: 4 }}>
          {pagaron.size} de {miembrosActivos.length} integrantes han pagado en {mesLabel(mesSeleccionado)}
        </div>
      </div>

      {/* Lista de integrantes */}
      {miembrosActivos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", color: C.gray, fontSize: 13 }}>
          No hay integrantes en el sistema de cuotas aún. Ve a la pestaña <strong>Participantes</strong> para agregarlos.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {miembrosActivos.map((m) => {
            const pago = pagosMes.find((p) => p.integrante_id === m.id);
            const pagado = pagaron.has(m.id);
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: `1px solid ${pagado ? C.primary + "40" : C.border}`,
                  background: pagado ? C.primary + "08" : C.white,
                  transition: "all 0.2s",
                }}
              >
                <Avatar nombre={m.nombre} foto_url={m.foto_url} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: C.dark, fontSize: 14 }}>{m.nombre}</div>
                  <div style={{ fontSize: 11, color: C.gray }}>{m.cuerda}</div>
                </div>
                {pagado && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {pago?.comprobante_url ? (
                      <a
                        href={pago.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: C.primary, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        📎 Ver comprobante
                      </a>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          style={{ display: "none" }}
                          ref={(el) => (fileRefs.current[m.id] = el)}
                          onChange={(e) => e.target.files[0] && subirComprobante(m, e.target.files[0])}
                        />
                        <Btn
                          variant="ghost"
                          onClick={() => fileRefs.current[m.id]?.click()}
                          disabled={uploadingId === m.id}
                          style={{ fontSize: 11, padding: "5px 10px" }}
                        >
                          {uploadingId === m.id ? "Subiendo..." : "📎 Comprobante"}
                        </Btn>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => togglePago(m)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `2px solid ${pagado ? C.primary : C.border}`,
                    background: pagado ? C.primary : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                  title={pagado ? "Desmarcar pago" : "Marcar como pagado"}
                >
                  {pagado ? "✓" : ""}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TAB: ACTIVIDADES
// ══════════════════════════════════════════════════════════════════════

function TabActividades({ actividades, gastos, members, pagos, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", fecha: "", descripcion: "" });
  const [saving, setSaving] = useState(false);
  const [actSeleccionada, setActSeleccionada] = useState(null);
  const [showPagoExtra, setShowPagoExtra] = useState(false);
  const [pagoExtraForm, setPagoExtraForm] = useState({ integrante_id: "", monto: "", descripcion: "" });
  const fileRef = useRef(null);
  const [uploadingGasto, setUploadingGasto] = useState(false);
  const [gastoForm, setGastoForm] = useState({ descripcion: "", monto: "" });

  async function crearActividad() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      await dbPost("fin_actividades", { ...form });
      setForm({ nombre: "", fecha: "", descripcion: "" });
      setShowForm(false);
      await reload();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  }

  async function eliminarActividad(id) {
    if (!window.confirm("¿Eliminar esta actividad?")) return;
    try {
      await dbDelete("fin_actividades", id);
      if (actSeleccionada?.id === id) setActSeleccionada(null);
      await reload();
    } catch (e) { alert("Error: " + e.message); }
  }

  async function subirBoleta(file) {
    if (!actSeleccionada || !gastoForm.descripcion || !gastoForm.monto) {
      alert("Completa descripción y monto antes de subir la boleta.");
      return;
    }
    setUploadingGasto(true);
    try {
      const path = `boletas/${actSeleccionada.id}/${Date.now()}.${file.name.split(".").pop()}`;
      const url = await uploadFile("finanzas", path, file);
      await dbPost("fin_gastos", {
        actividad_id: actSeleccionada.id,
        descripcion: gastoForm.descripcion,
        monto: parseFloat(gastoForm.monto),
        boleta_url: url,
      });
      setGastoForm({ descripcion: "", monto: "" });
      await reload();
    } catch (e) { alert("Error: " + e.message); }
    setUploadingGasto(false);
  }

  async function agregarGastoSinBoleta() {
    if (!actSeleccionada || !gastoForm.descripcion || !gastoForm.monto) return;
    setSaving(true);
    try {
      await dbPost("fin_gastos", {
        actividad_id: actSeleccionada.id,
        descripcion: gastoForm.descripcion,
        monto: parseFloat(gastoForm.monto),
      });
      setGastoForm({ descripcion: "", monto: "" });
      await reload();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  }

  async function registrarPagoExtra() {
    if (!pagoExtraForm.integrante_id || !pagoExtraForm.monto) return;
    setSaving(true);
    try {
      await dbPost("fin_pagos", {
        integrante_id: pagoExtraForm.integrante_id,
        actividad_id: actSeleccionada?.id || null,
        monto: parseFloat(pagoExtraForm.monto),
        descripcion: pagoExtraForm.descripcion,
        tipo: "actividad",
        mes: currentMesIso(),
      });
      setPagoExtraForm({ integrante_id: "", monto: "", descripcion: "" });
      setShowPagoExtra(false);
      await reload();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  }

  const gastosAct = actSeleccionada
    ? gastos.filter((g) => g.actividad_id === actSeleccionada.id)
    : [];
  const totalGastosAct = gastosAct.reduce((s, g) => s + (g.monto || 0), 0);
  const pagosAct = actSeleccionada
    ? pagos.filter((p) => p.actividad_id === actSeleccionada.id)
    : [];
  const totalPagosAct = pagosAct.reduce((s, p) => s + (p.monto || 0), 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
      {/* Listado de actividades */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Actividades</span>
          <Btn onClick={() => setShowForm(!showForm)} style={{ fontSize: 12, padding: "5px 10px" }}>
            + Nueva
          </Btn>
        </div>
        {showForm && (
          <Card style={{ marginBottom: 10, padding: 14 }}>
            <input
              placeholder="Nombre de la actividad *"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={{ ...inputS, marginBottom: 8 }}
            />
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              style={{ ...inputS, marginBottom: 8 }}
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              style={{ ...inputS, resize: "vertical", marginBottom: 8 }}
            />
            <Btn onClick={crearActividad} disabled={saving}>
              {saving ? "Guardando..." : "Crear actividad"}
            </Btn>
          </Card>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {actividades.length === 0 && (
            <div style={{ fontSize: 12, color: C.gray, padding: "12px 0" }}>Sin actividades registradas.</div>
          )}
          {actividades.map((a) => {
            const gastosA = gastos.filter((g) => g.actividad_id === a.id).length;
            const selected = actSeleccionada?.id === a.id;
            return (
              <div
                key={a.id}
                onClick={() => setActSeleccionada(selected ? null : a)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${selected ? C.primary : C.border}`,
                  background: selected ? C.primary + "10" : C.white,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{a.nombre}</div>
                {a.fecha && <div style={{ fontSize: 11, color: C.gray }}>{a.fecha}</div>}
                <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
                  {gastosA} boleta{gastosA !== 1 ? "s" : ""}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); eliminarActividad(a.id); }}
                  style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}
                >
                  🗑 Eliminar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle de actividad seleccionada */}
      {actSeleccionada ? (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 4 }}>
              {actSeleccionada.nombre}
            </div>
            {actSeleccionada.descripcion && (
              <div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>{actSeleccionada.descripcion}</div>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatCard icon="💸" label="Total gastos" value={fmtCLP(totalGastosAct)} color="#ef4444" />
              <StatCard icon="💵" label="Ingresos actividad" value={fmtCLP(totalPagosAct)} color={C.primary} />
            </div>
          </Card>

          {/* Registrar gasto / boleta */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: C.dark }}>
              📋 Registrar gasto
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <input
                placeholder="Descripción del gasto *"
                value={gastoForm.descripcion}
                onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })}
                style={{ ...inputS, flex: 2, minWidth: 160 }}
              />
              <input
                type="number"
                placeholder="Monto *"
                value={gastoForm.monto}
                onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })}
                style={{ ...inputS, flex: 1, minWidth: 100 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="file"
                accept="image/*,application/pdf"
                ref={fileRef}
                style={{ display: "none" }}
                onChange={(e) => e.target.files[0] && subirBoleta(e.target.files[0])}
              />
              <Btn onClick={() => fileRef.current?.click()} disabled={uploadingGasto}>
                {uploadingGasto ? "Subiendo..." : "📎 Con boleta"}
              </Btn>
              <Btn variant="ghost" onClick={agregarGastoSinBoleta} disabled={saving}>
                Sin boleta
              </Btn>
            </div>
          </Card>

          {/* Lista de gastos */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: C.dark }}>
              🧾 Boletas / Gastos ({gastosAct.length})
            </div>
            {gastosAct.length === 0 ? (
              <div style={{ fontSize: 12, color: C.gray }}>Sin gastos registrados.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {gastosAct.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: C.bg,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.dark }}>{g.descripcion}</div>
                      <div style={{ fontSize: 11, color: C.gray }}>{g.created_at?.split("T")[0]}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 13 }}>{fmtCLP(g.monto)}</div>
                    {g.boleta_url && (
                      <a href={g.boleta_url} target="_blank" rel="noreferrer" style={{ fontSize: 18 }} title="Ver boleta">
                        📎
                      </a>
                    )}
                    <button
                      onClick={async () => { await dbDelete("fin_gastos", g.id); reload(); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14 }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pagos recibidos en actividad */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>
                💵 Pagos recibidos en esta actividad
              </div>
              <Btn style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setShowPagoExtra(!showPagoExtra)}>
                + Agregar
              </Btn>
            </div>
            {showPagoExtra && (
              <div style={{ marginBottom: 12, padding: 12, background: C.bg, borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <select
                    value={pagoExtraForm.integrante_id}
                    onChange={(e) => setPagoExtraForm({ ...pagoExtraForm, integrante_id: e.target.value })}
                    style={{ ...inputS, flex: 2 }}
                  >
                    <option value="">Seleccionar integrante</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Monto"
                    value={pagoExtraForm.monto}
                    onChange={(e) => setPagoExtraForm({ ...pagoExtraForm, monto: e.target.value })}
                    style={{ ...inputS, flex: 1 }}
                  />
                </div>
                <input
                  placeholder="Descripción (opcional)"
                  value={pagoExtraForm.descripcion}
                  onChange={(e) => setPagoExtraForm({ ...pagoExtraForm, descripcion: e.target.value })}
                  style={{ ...inputS, marginBottom: 8 }}
                />
                <Btn onClick={registrarPagoExtra} disabled={saving}>
                  {saving ? "Guardando..." : "Registrar pago"}
                </Btn>
              </div>
            )}
            {pagosAct.length === 0 ? (
              <div style={{ fontSize: 12, color: C.gray }}>Sin pagos registrados.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pagosAct.map((p) => {
                  const m = members.find((x) => x.id === p.integrante_id);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.bg, borderRadius: 8 }}>
                      <Avatar nombre={m?.nombre || "?"} foto_url={m?.foto_url} size={28} />
                      <div style={{ flex: 1, fontSize: 13, color: C.dark }}>{m?.nombre || "Desconocido"}</div>
                      <div style={{ fontWeight: 700, color: C.primary, fontSize: 13 }}>{fmtCLP(p.monto)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div style={{ padding: "40px 20px", textAlign: "center", color: C.gray, fontSize: 13 }}>
          Selecciona una actividad para ver sus detalles
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TAB: RESUMEN FINANCIERO
// ══════════════════════════════════════════════════════════════════════

function TabResumen({ cuotas, pagos, gastos, actividades }) {
  // Totales globales
  const totalIngresado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const totalGastado = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const saldo = totalIngresado - totalGastado;

  // Por mes
  const mesesConDatos = [...new Set(pagos.map((p) => p.mes))].sort().reverse();

  return (
    <div>
      {/* Resumen global */}
      <div
        style={{
          background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`,
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 20,
          color: "white",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Saldo disponible</div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "'Poppins',sans-serif",
            marginBottom: 16,
          }}
        >
          {fmtCLP(saldo)}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Total ingresado</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtCLP(totalIngresado)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Total gastado</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtCLP(totalGastado)}</div>
          </div>
        </div>
      </div>

      {/* Por mes */}
      <div style={{ fontWeight: 600, fontSize: 14, color: C.dark, marginBottom: 10 }}>
        Detalle por mes
      </div>
      {mesesConDatos.length === 0 ? (
        <div style={{ fontSize: 13, color: C.gray }}>Sin movimientos registrados.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {mesesConDatos.map((mes) => {
            const ingresosMes = pagos.filter((p) => p.mes === mes).reduce((s, p) => s + (p.monto || 0), 0);
            const cuota = cuotas.find((c) => c.mes === mes);
            const pagadosMes = pagos.filter((p) => p.mes === mes && p.tipo === "cuota").length;
            return (
              <Card key={mes} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{mesLabel(mes)}</div>
                    <div style={{ fontSize: 11, color: C.gray }}>
                      {pagadosMes} pago{pagadosMes !== 1 ? "s" : ""} de cuota
                      {cuota ? ` · ${fmtCLP(cuota.valor)} c/u` : ""}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: C.primary, fontSize: 15 }}>
                    {fmtCLP(ingresosMes)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Por actividad */}
      {actividades.length > 0 && (
        <>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.dark, margin: "20px 0 10px" }}>
            Gastos por actividad
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actividades.map((a) => {
              const gastosA = gastos.filter((g) => g.actividad_id === a.id);
              const totalA = gastosA.reduce((s, g) => s + (g.monto || 0), 0);
              if (totalA === 0) return null;
              return (
                <Card key={a.id} style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{a.nombre}</div>
                      <div style={{ fontSize: 11, color: C.gray }}>{gastosA.length} gasto(s)</div>
                    </div>
                    <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 15 }}>
                      {fmtCLP(totalA)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TAB: REPORTE DE MOROSOS
// ══════════════════════════════════════════════════════════════════════

function TabReporte({ members, cuotas, pagos, miembrosEnCuotas }) {
  const [mesReporte, setMesReporte] = useState(currentMesIso());

  const mesesDisponibles = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }).reverse();

  const miembrosIds = new Set(miembrosEnCuotas.map((m) => m.integrante_id));
  const miembrosActivos = members.filter((m) => miembrosIds.has(m.id));
  const pagosMes = pagos.filter((p) => p.mes === mesReporte);
  const pagaron = new Set(pagosMes.map((p) => p.integrante_id));
  const cuotaMes = cuotas.find((c) => c.mes === mesReporte);

  const alDia = miembrosActivos.filter((m) => pagaron.has(m.id));
  const morosos = miembrosActivos.filter((m) => !pagaron.has(m.id));

  function exportCSV() {
    const rows = [
      ["Nombre", "Estado", "Mes", "Valor cuota"],
      ...alDia.map((m) => [m.nombre, "PAGADO", mesLabel(mesReporte), cuotaMes?.valor || ""]),
      ...morosos.map((m) => [m.nombre, "MOROSO", mesLabel(mesReporte), cuotaMes?.valor || ""]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `reporte_cuotas_${mesReporte}.csv`;
    a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select value={mesReporte} onChange={(e) => setMesReporte(e.target.value)} style={inputS}>
          {mesesDisponibles.map((m) => (
            <option key={m} value={m}>{mesLabel(m)}</option>
          ))}
        </select>
        <Btn variant="ghost" onClick={exportCSV}>
          📥 Exportar CSV
        </Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Al día */}
        <Card>
          <div style={{ fontWeight: 700, color: C.primary, fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            ✅ Al día ({alDia.length})
          </div>
          {alDia.length === 0 ? (
            <div style={{ fontSize: 12, color: C.gray }}>Ninguno ha pagado aún.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alDia.map((m) => {
                const pago = pagosMes.find((p) => p.integrante_id === m.id);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar nombre={m.nombre} foto_url={m.foto_url} size={28} color={C.primary} />
                    <div style={{ flex: 1, fontSize: 13 }}>{m.nombre}</div>
                    {pago?.comprobante_url && (
                      <a href={pago.comprobante_url} target="_blank" rel="noreferrer" title="Ver comprobante">📎</a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Morosos */}
        <Card>
          <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            ⚠️ Morosos ({morosos.length})
          </div>
          {morosos.length === 0 ? (
            <div style={{ fontSize: 12, color: C.gray }}>¡Todos han pagado! 🎉</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {morosos.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar nombre={m.nombre} foto_url={m.foto_url} size={28} color="#ef4444" />
                  <div style={{ flex: 1, fontSize: 13 }}>{m.nombre}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TAB: PARTICIPANTES EN SISTEMA DE CUOTAS
// ══════════════════════════════════════════════════════════════════════

function TabParticipantes({ members, miembrosEnCuotas, reload }) {
  const [saving, setSaving] = useState(null);

  const enSistema = new Set(miembrosEnCuotas.map((m) => m.integrante_id));

  async function toggleMiembro(miembro) {
    setSaving(miembro.id);
    try {
      if (enSistema.has(miembro.id)) {
        const reg = miembrosEnCuotas.find((m) => m.integrante_id === miembro.id);
        await dbDelete("fin_miembros_cuotas", reg.id);
      } else {
        await dbPost("fin_miembros_cuotas", { integrante_id: miembro.id });
      }
      await reload();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(null);
  }

  const noAdmins = members.filter((m) => m.cuerda !== "Admin");
  const activos = noAdmins.filter((m) => enSistema.has(m.id));
  const noActivos = noAdmins.filter((m) => !enSistema.has(m.id));

  return (
    <div>
      <div style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>
        Selecciona los integrantes que participan en el sistema de cuotas mensuales. Puedes agregar o quitar en cualquier momento.
      </div>

      {/* En sistema */}
      <div style={{ fontWeight: 600, fontSize: 14, color: C.dark, marginBottom: 8 }}>
        ✅ En sistema de cuotas ({activos.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {activos.length === 0 && (
          <div style={{ fontSize: 12, color: C.gray }}>Ningún integrante en el sistema aún.</div>
        )}
        {activos.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.primary + "08", border: `1px solid ${C.primary}30`, borderRadius: 10 }}>
            <Avatar nombre={m.nombre} foto_url={m.foto_url} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{m.nombre}</div>
              <div style={{ fontSize: 11, color: C.gray }}>{m.cuerda}</div>
            </div>
            <Btn variant="ghost" onClick={() => toggleMiembro(m)} disabled={saving === m.id} style={{ fontSize: 11, padding: "5px 10px" }}>
              {saving === m.id ? "..." : "Quitar"}
            </Btn>
          </div>
        ))}
      </div>

      {/* No en sistema */}
      <div style={{ fontWeight: 600, fontSize: 14, color: C.dark, marginBottom: 8 }}>
        Otros integrantes ({noActivos.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {noActivos.length === 0 && (
          <div style={{ fontSize: 12, color: C.gray }}>Todos los integrantes ya están en el sistema.</div>
        )}
        {noActivos.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <Avatar nombre={m.nombre} foto_url={m.foto_url} size={32} color={C.gray} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{m.nombre}</div>
              <div style={{ fontSize: 11, color: C.gray }}>{m.cuerda}</div>
            </div>
            <Btn onClick={() => toggleMiembro(m)} disabled={saving === m.id} style={{ fontSize: 11, padding: "5px 10px" }}>
              {saving === m.id ? "..." : "+ Incluir"}
            </Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  MÓDULO PRINCIPAL — solo Admin y Contadora
// ══════════════════════════════════════════════════════════════════════

const inputS = {
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid #e2e8f0`,
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "white",
};

export function ModuloFinanzas({ user, members }) {
  const isAdmin = user?.cuerda === "Admin";
  const isContadora = user?.cuerda === "Contadora";
  const tieneAcceso = isAdmin || isContadora;

  const { cuotas, pagos, actividades, gastos, miembrosEnCuotas, loading, reload } =
    useFinanzasData();

  const [tab, setTab] = useState("cuotas");

  const totalIngresado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const totalGastado = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const saldo = totalIngresado - totalGastado;

  const TABS = [
    { id: "cuotas", label: "💰 Cuotas Mensuales" },
    { id: "actividades", label: "🎵 Actividades" },
    { id: "reporte", label: "📊 Reporte" },
    { id: "participantes", label: "👥 Participantes" },
    { id: "resumen", label: "📈 Resumen" },
  ];

  if (!tieneAcceso) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.gray }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Acceso restringido</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>
          Solo el Administrador y la Contadora pueden acceder a este módulo.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg,${C.primaryDark},${C.primary})`,
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          💼
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 700, color: "white" }}>
            Finanzas del Coro
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            Panel de gestión financiera · {user?.nombre}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Saldo disponible", val: fmtCLP(saldo) },
            { label: "Total gastado", val: fmtCLP(totalGastado) },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: 10,
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {TABS.map((t) => (
          <TabBtn key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {/* Contenido */}
      <Card>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {tab === "cuotas" && (
              <TabCuotas
                members={members}
                cuotas={cuotas}
                pagos={pagos}
                miembrosEnCuotas={miembrosEnCuotas}
                reload={reload}
              />
            )}
            {tab === "actividades" && (
              <TabActividades
                actividades={actividades}
                gastos={gastos}
                members={members}
                pagos={pagos}
                reload={reload}
              />
            )}
            {tab === "reporte" && (
              <TabReporte
                members={members}
                cuotas={cuotas}
                pagos={pagos}
                miembrosEnCuotas={miembrosEnCuotas}
              />
            )}
            {tab === "participantes" && (
              <TabParticipantes
                members={members}
                miembrosEnCuotas={miembrosEnCuotas}
                reload={reload}
              />
            )}
            {tab === "resumen" && (
              <TabResumen
                cuotas={cuotas}
                pagos={pagos}
                gastos={gastos}
                actividades={actividades}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  SECCIÓN PÚBLICA: INFORMACIÓN DE GASTOS (visible para todos)
// ══════════════════════════════════════════════════════════════════════

export function InfoGastos({ user, members }) {
  const [pagos, setPagos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [miembrosEnCuotas, setMiembrosEnCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState("estado");
  const [actExpandida, setActExpandida] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, g, a, c, mc] = await Promise.all([
          dbGet("fin_pagos"),
          dbGet("fin_gastos"),
          dbGet("fin_actividades"),
          dbGet("fin_cuotas"),
          dbGet("fin_miembros_cuotas"),
        ]);
        setPagos(p || []);
        setGastos(g || []);
        setActividades(a || []);
        setCuotas(c || []);
        setMiembrosEnCuotas(mc || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const totalIngresado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const totalGastado = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const saldo = totalIngresado - totalGastado;

  const mesActual = currentMesIso();
  const pagosMesActual = pagos.filter((p) => p.mes === mesActual);
  const miembrosIds = new Set(miembrosEnCuotas.map((m) => m.integrante_id));
  const miembrosActivos = members.filter((m) => miembrosIds.has(m.id));
  const pagaron = new Set(pagosMesActual.map((p) => p.integrante_id));
  const alDia = miembrosActivos.filter((m) => pagaron.has(m.id));
  const morosos = miembrosActivos.filter((m) => !pagaron.has(m.id));
  const cuotaMesActual = cuotas.find((c) => c.mes === mesActual);

  if (loading) return <Spinner />;

  const TABS_PUB = [
    { id: "estado", label: "💰 Estado financiero" },
    { id: "cuotas", label: "📋 Estado de cuotas" },
    { id: "gastos", label: "🧾 Gastos por actividad" },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg,#0f4c3a,${C.primary})`,
          borderRadius: 16,
          padding: "24px 28px",
          marginBottom: 20,
          color: "white",
        }}
      >
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          📊 Información de Gastos
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Transparencia financiera del Coro Misioneros de Jesús
        </div>
      </div>

      {/* Resumen rápido */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon="💰" label="Saldo disponible" value={fmtCLP(saldo)} color={saldo >= 0 ? C.primary : "#ef4444"} />
        <StatCard icon="📥" label="Total ingresado" value={fmtCLP(totalIngresado)} color="#3b82f6" />
        <StatCard icon="📤" label="Total gastado" value={fmtCLP(totalGastado)} color="#f59e0b" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {TABS_PUB.map((t) => (
          <TabBtn key={t.id} label={t.label} active={tabActiva === t.id} onClick={() => setTabActiva(t.id)} />
        ))}
      </div>

      {/* Estado financiero */}
      {tabActiva === "estado" && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.dark, marginBottom: 14 }}>
            Movimientos por mes
          </div>
          {[...new Set(pagos.map((p) => p.mes))].sort().reverse().map((mes) => {
            const ing = pagos.filter((p) => p.mes === mes).reduce((s, p) => s + (p.monto || 0), 0);
            const cuota = cuotas.find((c) => c.mes === mes);
            const cant = pagos.filter((p) => p.mes === mes && p.tipo === "cuota").length;
            return (
              <div key={mes} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, color: C.dark, fontSize: 14 }}>{mesLabel(mes)}</div>
                  <div style={{ fontSize: 11, color: C.gray }}>
                    {cant} pago{cant !== 1 ? "s" : ""}
                    {cuota ? ` · ${fmtCLP(cuota.valor)} c/u` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: C.primary }}>{fmtCLP(ing)}</div>
              </div>
            );
          })}
          {pagos.length === 0 && <div style={{ fontSize: 13, color: C.gray }}>Sin movimientos registrados.</div>}
        </Card>
      )}

      {/* Estado de cuotas */}
      {tabActiva === "cuotas" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card>
            <div style={{ fontWeight: 700, color: C.primary, fontSize: 14, marginBottom: 12 }}>
              ✅ Al día — {mesLabel(mesActual)}
              {cuotaMesActual && <span style={{ fontSize: 11, fontWeight: 400, color: C.gray }}> · {fmtCLP(cuotaMesActual.valor)}</span>}
            </div>
            {alDia.length === 0 ? (
              <div style={{ fontSize: 12, color: C.gray }}>Ninguno ha pagado aún.</div>
            ) : alDia.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Avatar nombre={m.nombre} foto_url={m.foto_url} size={28} color={C.primary} />
                <span style={{ fontSize: 13 }}>{m.nombre}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 14, marginBottom: 12 }}>
              ⚠️ Pendientes — {mesLabel(mesActual)}
            </div>
            {morosos.length === 0 ? (
              <div style={{ fontSize: 12, color: C.gray }}>¡Todos han pagado! 🎉</div>
            ) : morosos.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Avatar nombre={m.nombre} foto_url={m.foto_url} size={28} color="#ef4444" />
                <span style={{ fontSize: 13 }}>{m.nombre}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Gastos por actividad */}
      {tabActiva === "gastos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {actividades.length === 0 && (
            <div style={{ fontSize: 13, color: C.gray, padding: "20px 0" }}>Sin actividades registradas.</div>
          )}
          {actividades.map((a) => {
            const gastosA = gastos.filter((g) => g.actividad_id === a.id);
            const totalA = gastosA.reduce((s, g) => s + (g.monto || 0), 0);
            const expanded = actExpandida === a.id;
            return (
              <Card key={a.id} style={{ padding: 0, overflow: "hidden" }}>
                <div
                  onClick={() => setActExpandida(expanded ? null : a.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    cursor: "pointer",
                    background: expanded ? C.primary + "08" : "white",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: C.dark, fontSize: 14 }}>{a.nombre}</div>
                    {a.fecha && <div style={{ fontSize: 11, color: C.gray }}>{a.fecha}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontWeight: 700, color: "#ef4444" }}>{fmtCLP(totalA)}</div>
                    <span style={{ color: C.gray }}>{expanded ? "▲" : "▼"}</span>
                  </div>
                </div>
                {expanded && gastosA.length > 0 && (
                  <div style={{ padding: "0 18px 14px" }}>
                    {gastosA.map((g) => (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: C.dark }}>{g.descripcion}</div>
                          <div style={{ fontSize: 11, color: C.gray }}>{g.created_at?.split("T")[0]}</div>
                        </div>
                        <div style={{ fontWeight: 600, color: "#ef4444", fontSize: 13 }}>{fmtCLP(g.monto)}</div>
                        {g.boleta_url && (
                          <a href={g.boleta_url} target="_blank" rel="noreferrer" style={{ color: C.primary, fontSize: 13, textDecoration: "none" }}>
                            📎 Ver boleta
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {expanded && gastosA.length === 0 && (
                  <div style={{ padding: "8px 18px 14px", fontSize: 12, color: C.gray }}>Sin gastos registrados.</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  SQL PARA SUPABASE — ejecuta en el SQL Editor de Supabase
// ══════════════════════════════════════════════════════════════════════
/*
-- 1. Tabla de cuotas (valor por mes)
CREATE TABLE IF NOT EXISTS fin_cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes TEXT NOT NULL UNIQUE, -- formato YYYY-MM
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de pagos
CREATE TABLE IF NOT EXISTS fin_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrante_id UUID REFERENCES integrantes(id) ON DELETE CASCADE,
  actividad_id UUID REFERENCES fin_actividades(id) ON DELETE SET NULL,
  mes TEXT,             -- YYYY-MM (para cuotas)
  monto NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT DEFAULT 'cuota',  -- 'cuota' | 'actividad'
  descripcion TEXT,
  comprobante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de actividades
CREATE TABLE IF NOT EXISTS fin_actividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha DATE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de gastos
CREATE TABLE IF NOT EXISTS fin_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_id UUID REFERENCES fin_actividades(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  boleta_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de miembros en sistema de cuotas
CREATE TABLE IF NOT EXISTS fin_miembros_cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integrante_id UUID REFERENCES integrantes(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS (habilitar políticas abiertas para tu proyecto, igual que las otras tablas)
ALTER TABLE fin_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_miembros_cuotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total" ON fin_cuotas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON fin_pagos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON fin_actividades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON fin_gastos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total" ON fin_miembros_cuotas FOR ALL USING (true) WITH CHECK (true);

-- 7. Storage bucket 'finanzas'
-- En Supabase > Storage > New Bucket: nombre "finanzas", público ✓
*/

// ══════════════════════════════════════════════════════════════════════
//  INTEGRACIÓN EN App.jsx — qué cambiar:
// ══════════════════════════════════════════════════════════════════════
/*
  1. AGREGAR "Contadora" a CUERDAS:
     Contadora: "#f59e0b",

  2. AGREGAR al registrar usuario (en authSignUp) la opción de cuerda "Contadora"

  3. NAV — agregar estas dos rutas:
     { id: "finanzas",    icon: "💼", label: "Finanzas" },         ← solo Admin/Contadora
     { id: "info_gastos", icon: "📊", label: "Info. Gastos" },     ← todos

  4. En el filtro del menú lateral, agregar restricción para "finanzas":
     Cambia:
       (item) => item.id !== "admin" || user?.cuerda === "Admin"
     Por:
       (item) =>
         (item.id !== "admin" || user?.cuerda === "Admin") &&
         (item.id !== "finanzas" || user?.cuerda === "Admin" || user?.cuerda === "Contadora")

  5. SECCIONES — agregar en el bloque de render:
     {section === "finanzas" && (user?.cuerda === "Admin" || user?.cuerda === "Contadora") && (
       <ModuloFinanzas user={user} members={members} onReload={loadData} />
     )}
     {section === "info_gastos" && (
       <InfoGastos user={user} members={members} />
     )}

  6. ADMIN_TABS — agregar pestaña dentro del panel admin:
     { id: "finanzas_admin", label: "💼 Finanzas" },
     Y en el render del Admin:
     {tab === "finanzas_admin" && <ModuloFinanzas user={user} members={members} onReload={onReload} />}

  7. IMPORTAR al inicio de App.jsx:
     import { ModuloFinanzas, InfoGastos } from "./FinanzasModulo";
     (o pegar el contenido directamente si usas un solo archivo)
*/
