import { useState, useEffect, useRef } from "react";

const SYS = `Eres el asistente del Coro Misioneros de Jesús, ensemble vocal de música litúrgica profesional en Maipú, Chile. Responde en español, de forma concisa (máx 2-3 oraciones), profesional y cercana. Solo respondes sobre el coro: ingreso, ensayos (sábados), nivel musical, repertorio litúrgico contemporáneo, cuerdas SATB. Para contacto dirígelos al formulario del sitio.`;

export default function Landing({ onPortal }) {
  const [chatMsgs, setChatMsgs] = useState([
    { role: "bot", text: "Hola, soy el asistente del Coro Misioneros de Jesús. ¿En qué te puedo orientar? Pregúntame sobre cómo unirte, los ensayos o nuestro repertorio." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hist, setHist] = useState([]);
  const [formOk, setFormOk] = useState(false);
  const msgsRef = useRef(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [chatMsgs, typing]);

  async function sendMsg(text) {
    const t = (text || chatInput).trim();
    if (!t) return;
    setChatInput("");
    const newHist = [...hist, { role: "user", content: t }];
    setChatMsgs(prev => [...prev, { role: "user", text: t }]);
    setHist(newHist);
    setTyping(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYS, messages: newHist })
      });
      const data = await r.json();
      const reply = data.content?.[0]?.text || "Intenta nuevamente.";
      setTyping(false);
      setChatMsgs(prev => [...prev, { role: "bot", text: reply }]);
      setHist(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setTyping(false);
      setChatMsgs(prev => [...prev, { role: "bot", text: "Error de conexión, intenta de nuevo." }]);
    }
  }

  function usePill(txt) { sendMsg(txt); }

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#fff", color: "#0a0a14", overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .land-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 999; height: 68px;
          background: rgba(8,18,45,0.88);
          backdrop-filter: saturate(180%) blur(24px);
          -webkit-backdrop-filter: saturate(180%) blur(24px);
          border-bottom: 0.5px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: space-between; padding: 0 52px;
        }
        .land-nav-brand { font-family: "Inter", sans-serif; font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; white-space: nowrap; }
        .land-nav-links { position: absolute; left: 50%; transform: translateX(-50%); display: flex; gap: 40px; }
        .land-nav-links a { font-size: 13px; font-weight: 400; letter-spacing: 0.02em; text-transform: none; color: rgba(255,255,255,0.72); text-decoration: none; cursor: pointer; transition: color .2s; }
        .land-nav-links a:hover { color: #fff; }
        .land-nav-cta { background: rgba(255,255,255,0.12); border: 0.5px solid rgba(255,255,255,0.25); color: #fff; border-radius: 980px; padding: 8px 22px; font-size: 12.5px; font-weight: 500; cursor: pointer; letter-spacing: 0.04em; transition: background .2s; font-family: inherit; }
        .land-nav-cta:hover { background: rgba(255,255,255,0.22); }
        .land-hero {
          height: 100vh; position: relative; overflow: hidden;
          display: flex; align-items: flex-end;
          background: url('https://portal-coro-mj.vercel.app/Misioneros.jpg') center/cover no-repeat;
        }
        .land-hero-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(to bottom, rgba(8,18,45,0.4) 0%, rgba(8,18,45,0.2) 35%, rgba(8,18,45,0.6) 68%, rgba(8,18,45,0.95) 100%);
        }
        .land-hero-content { position: relative; z-index: 2; padding: 0 52px 72px; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
        .land-hero-kicker { font-size: 11px; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 16px; display: block; }
        .land-hero-title { font-size: clamp(60px, 8.5vw, 110px); font-weight: 900; line-height: 0.92; color: #fff; letter-spacing: -0.03em; }
        .land-hero-title .accent { font-family: 'Playfair Display', serif; font-style: italic; font-weight: 700; color: #a8c8f8; display: block; }
        .land-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 16px; }
        .land-hero-sub { font-size: 15px; font-weight: 300; color: rgba(255,255,255,0.65); line-height: 1.7; max-width: 300px; text-align: right; }
        .land-hero-btns { display: flex; gap: 10px; }
        .hbtn-p { background: #fff; color: #08122d; border: none; border-radius: 980px; padding: 13px 28px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
        .hbtn-p:hover { background: #e8f0fc; transform: translateY(-1px); }
        .hbtn-o { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.4); border-radius: 980px; padding: 13px 28px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .2s; font-family: inherit; }
        .hbtn-o:hover { border-color: #fff; }
        .ticker { background: #08122d; padding: 14px 0; overflow: hidden; white-space: nowrap; border-bottom: 0.5px solid rgba(255,255,255,0.06); }
        .ticker-inner { display: inline-flex; animation: tick 30s linear infinite; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-item { display: inline-flex; align-items: center; gap: 10px; padding: 0 32px; font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.3); }
        .ticker-dot { width: 4px; height: 4px; border-radius: 50%; background: #6aaef5; flex-shrink: 0; }
        .land-sec { padding: 104px 52px; background: #fff; }
        .land-sec-alt { padding: 104px 52px; background: #f6f8fc; }
        .land-inner { max-width: 1180px; margin: 0 auto; }
        .eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #08122d; opacity: 0.4; margin-bottom: 18px; }
        .land-h2 { font-size: clamp(38px, 5vw, 64px); font-weight: 800; line-height: 1.05; letter-spacing: -0.025em; color: #0a0a14; margin-bottom: 24px; }
        .land-h2 em { font-family: 'Playfair Display', serif; font-style: italic; font-weight: 700; color: #08122d; }
        .land-body { font-size: 15.5px; font-weight: 300; line-height: 1.85; color: #444; }
        .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; align-items: center; }
        .about-img-wrap { aspect-ratio: 3/4; border-radius: 20px; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; position: relative; border: 0.5px solid #eaeff8; }
        .about-img-wrap img { display: none; } .about-img-jesus { position: absolute; inset: 0; background: url("/Misioneros.jpg") center/cover no-repeat; opacity: 0.15; }
        .about-badge { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 32px; background: linear-gradient(to top, rgba(8,18,45,0.9), transparent); }
        .about-badge-label { font-size: 10px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.45); }
        .about-badge-val { font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
        .stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: #e4eaf5; border-radius: 16px; overflow: hidden; margin-top: 48px; }
        .stat { background: #fff; padding: 28px 24px; }
        .stat-n { font-size: 46px; font-weight: 800; color: #0a0a14; line-height: 1; letter-spacing: -0.03em; }
        .stat-n sup { font-size: 22px; vertical-align: super; color: #08122d; opacity: 0.4; }
        .stat-l { font-size: 12px; color: #aaa; margin-top: 6px; letter-spacing: 0.04em; }
        .gal-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 48px; }
        .gal-grid { display: grid; grid-template-columns: repeat(12,1fr); grid-template-rows: 360px 240px; gap: 10px; }
        .gi { border-radius: 14px; overflow: hidden; position: relative; cursor: pointer; }
        .gi:nth-child(1) { grid-column: span 7; }
        .gi:nth-child(2) { grid-column: span 5; }
        .gi:nth-child(3) { grid-column: span 4; }
        .gi:nth-child(4) { grid-column: span 4; }
        .gi:nth-child(5) { grid-column: span 4; }
        .gi-bg { position: absolute; inset: 0; }
        .gi:nth-child(1) .gi-bg { background: linear-gradient(155deg,#0a1628 0%,#1a3460 100%); }
        .gi:nth-child(2) .gi-bg { background: linear-gradient(155deg,#0d1f3e 0%,#0d2d55 100%); }
        .gi:nth-child(3) .gi-bg { background: linear-gradient(155deg,#081228 0%,#1a2d50 100%); }
        .gi:nth-child(4) .gi-bg { background: linear-gradient(155deg,#0f1e38 0%,#162a4a 100%); }
        .gi:nth-child(5) .gi-bg { background: linear-gradient(155deg,#0a1828 0%,#0d2540 100%); }
        .gi-content { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px 26px; background: linear-gradient(to top, rgba(8,18,40,0.82) 0%, transparent 55%); }
        .gi-label { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
        .gi-sub { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 4px; letter-spacing: 0.08em; text-transform: uppercase; }
        .gi-hover { position: absolute; inset: 0; z-index: 3; background: rgba(8,18,40,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .22s; }
        .gi:hover .gi-hover { opacity: 1; }
        .gi-hover-btn { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; border: 1px solid rgba(255,255,255,0.5); border-radius: 980px; padding: 9px 22px; }
        .bot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
        .bfeat { padding: 22px 0; border-bottom: 0.5px solid #e4eaf5; display: flex; gap: 20px; align-items: flex-start; }
        .bfeat:first-child { border-top: 0.5px solid #e4eaf5; }
        .bfeat-num { font-size: 12px; font-weight: 600; color: #08122d; opacity: 0.25; letter-spacing: 0.1em; flex-shrink: 0; padding-top: 2px; }
        .bfeat-title { font-size: 14px; font-weight: 700; color: #0a0a14; margin-bottom: 4px; }
        .bfeat-desc { font-size: 13.5px; color: #888; line-height: 1.6; font-weight: 300; }
        .chat-card { background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 48px rgba(8,18,45,0.1); border: 0.5px solid #e4eaf5; }
        .chat-hd { background: #08122d; padding: 18px 22px; display: flex; align-items: center; gap: 14px; }
        .chat-av { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .chat-info-name { font-size: 13.5px; font-weight: 600; color: #fff; }
        .chat-info-sub { font-size: 11px; color: rgba(255,255,255,0.45); }
        .chat-online { width: 8px; height: 8px; border-radius: 50%; background: #34d399; margin-left: auto; }
        .chat-msgs { padding: 16px; min-height: 240px; max-height: 280px; overflow-y: auto; background: #f6f8fc; display: flex; flex-direction: column; gap: 10px; }
        .cm { display: flex; gap: 8px; }
        .cm-u { flex-direction: row-reverse; }
        .cm-av { width: 28px; height: 28px; border-radius: 50%; background: #e4eaf5; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
        .cm-b { max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; }
        .cm-b-bot { background: #fff; color: #0a0a14; border-radius: 4px 14px 14px 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .cm-b-user { background: #08122d; color: #fff; border-radius: 14px 4px 14px 14px; }
        .tdots { display: flex; gap: 4px; padding: 10px 14px; }
        .tdots span { width: 7px; height: 7px; border-radius: 50%; background: #ccc; animation: td 1.2s infinite; }
        .tdots span:nth-child(2) { animation-delay: .2s; }
        .tdots span:nth-child(3) { animation-delay: .4s; }
        @keyframes td { 0%,60%,100% { opacity:.3; transform:translateY(0); } 30% { opacity:1; transform:translateY(-4px); } }
        .chat-pills { display: flex; gap: 6px; padding: 10px 16px 8px; background: #f6f8fc; flex-wrap: wrap; border-top: 0.5px solid #eaeff8; }
        .cpill { border: 0.5px solid #cdd6ea; border-radius: 980px; padding: 5px 13px; font-size: 12px; color: #08122d; cursor: pointer; background: #fff; font-family: inherit; transition: all .15s; }
        .cpill:hover { background: #08122d; color: #fff; border-color: #08122d; }
        .chat-ft { display: flex; gap: 8px; padding: 12px 14px; background: #fff; border-top: 0.5px solid #eaeff8; }
        .chat-in { flex: 1; border: 0.5px solid #dde4f0; border-radius: 980px; padding: 9px 16px; font-size: 13.5px; font-family: inherit; color: #0a0a14; outline: none; background: #f6f8fc; transition: border-color .2s; }
        .chat-in:focus { border-color: #08122d; background: #fff; }
        .chat-snd { width: 36px; height: 36px; border-radius: 50%; background: #08122d; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chat-snd:hover { background: #0d1f45; }
        .ct-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; align-items: start; }
        .ct-item { display: flex; gap: 18px; align-items: flex-start; padding: 22px 0; border-bottom: 0.5px solid #e4eaf5; }
        .ct-item:first-of-type { border-top: 0.5px solid #e4eaf5; }
        .ct-ico { width: 42px; height: 42px; border-radius: 12px; background: #eef2fb; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .ct-title { font-size: 13px; font-weight: 600; color: #0a0a14; margin-bottom: 4px; }
        .ct-sub { font-size: 13.5px; color: #888; font-weight: 300; line-height: 1.6; }
        .soc-row { display: flex; gap: 8px; margin-top: 32px; }
        .soc { width: 40px; height: 40px; border-radius: 12px; border: 0.5px solid #e0e6f0; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: all .2s; }
        .soc:hover { background: #08122d; border-color: #08122d; }
        .cform { background: #f6f8fc; border-radius: 20px; padding: 44px; border: 0.5px solid #e4eaf5; }
        .cform h3 { font-size: 28px; font-weight: 800; color: #0a0a14; margin-bottom: 32px; letter-spacing: -0.02em; line-height: 1.2; }
        .fg { margin-bottom: 16px; }
        .fg label { display: block; font-size: 10.5px; font-weight: 600; color: #aaa; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 7px; }
        .fg input, .fg textarea, .fg select { width: 100%; border: 0.5px solid #dde4f0; border-radius: 12px; padding: 12px 15px; font-size: 14px; font-family: inherit; background: #fff; color: #0a0a14; outline: none; transition: border-color .2s; -webkit-appearance: none; }
        .fg input:focus, .fg textarea:focus, .fg select:focus { border-color: #08122d; }
        .fg input::placeholder, .fg textarea::placeholder { color: #c0c8d8; }
        .fg textarea { resize: vertical; min-height: 96px; }
        .frow { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fsub { width: 100%; background: #08122d; color: #fff; border: none; border-radius: 980px; padding: 14px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; cursor: pointer; font-family: inherit; margin-top: 6px; transition: background .2s; }
        .fsub:hover { background: #0d1f45; }
        .land-footer { background: #08122d; padding: 72px 52px 36px; }
        .foot-top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 52px; border-bottom: 0.5px solid rgba(255,255,255,0.07); max-width: 1180px; margin: 0 auto; }
        .foot-brand img { height: 44px; margin-bottom: 14px; display: block; }
        .foot-brand p { font-size: 13.5px; color: rgba(255,255,255,0.3); font-weight: 300; line-height: 1.7; max-width: 240px; }
        .foot-cols { display: flex; gap: 64px; }
        .foot-col h4 { font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,0.3); letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 18px; }
        .foot-col a { display: block; font-size: 13.5px; color: rgba(255,255,255,0.45); text-decoration: none; margin-bottom: 11px; font-weight: 300; cursor: pointer; transition: color .2s; }
        .foot-col a:hover { color: #fff; }
        .foot-btm { display: flex; justify-content: space-between; align-items: center; padding-top: 28px; max-width: 1180px; margin: 0 auto; }
        .foot-copy { font-size: 12px; color: rgba(255,255,255,0.18); }
        .foot-adm { font-size: 12px; color: rgba(255,255,255,0.06); cursor: pointer; padding: 4px 8px; user-select: none; letter-spacing: 0.2em; transition: color .4s; }
        .foot-adm:hover { color: rgba(255,255,255,0.3); }
        @media(max-width:900px) {
          .land-nav { padding: 0 20px; }
          .land-nav-links { display: none; }
          .land-hero-content { padding: 0 24px 56px; flex-direction: column; align-items: flex-start; gap: 24px; }
          .land-hero-right { align-items: flex-start; }
          .land-hero-sub { text-align: left; }
          .land-sec, .land-sec-alt { padding: 72px 24px; }
          .about-grid, .bot-grid, .ct-grid { grid-template-columns: 1fr; gap: 52px; }
          .gal-grid { grid-template-columns: 1fr 1fr; grid-template-rows: auto; }
          .gi { aspect-ratio: 4/3; }
          .gi:nth-child(1), .gi:nth-child(2), .gi:nth-child(3), .gi:nth-child(4), .gi:nth-child(5) { grid-column: span 1; }
          .stats-row { grid-template-columns: 1fr 1fr; }
          .frow { grid-template-columns: 1fr; }
          .cform { padding: 28px 22px; }
          .land-footer { padding: 52px 24px 28px; }
          .foot-top { flex-direction: column; gap: 40px; }
          .foot-cols { gap: 32px; }
          .gal-top { flex-direction: column; gap: 16px; align-items: flex-start; }
        }
        @media(prefers-reduced-motion:reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      {/* NAV */}
      <nav className="land-nav">
        <span className="land-nav-brand" onClick={() => scrollTo("inicio")}>Coro MJ</span>
        <div className="land-nav-links">
          <a onClick={() => scrollTo("nosotros")}>Nosotros</a>
          <a onClick={() => scrollTo("galeria")}>Galería</a>
          <a onClick={() => scrollTo("bot")}>Únete</a>
          <a onClick={() => scrollTo("contacto")}>Contacto</a>
        </div>
        <button className="land-nav-cta" onClick={onPortal}>Acceso Portal</button>
      </nav>

      {/* HERO */}
      <section id="inicio" className="land-hero">
        <div className="land-hero-overlay" />
        <div className="land-hero-content">
          <div>
            <span className="land-hero-kicker">Coro · Maipú · Chile</span>
            <h1 className="land-hero-title">
              Misioneros<br/>
              <span className="accent">de Jesús</span>
            </h1>
          </div>
          <div className="land-hero-right">
            <p className="land-hero-sub">Ensemble vocal de música litúrgica contemporánea. Quince años de presencia y excelencia musical en Maipú.</p>
            <div className="land-hero-btns">
              <button className="hbtn-p" onClick={() => scrollTo("nosotros")}>Conócenos</button>
              <button className="hbtn-o" onClick={() => scrollTo("bot")}>Únete</button>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-inner">
          {["Música litúrgica contemporánea","Maipú · Chile","15 años de trayectoria","4 cuerdas vocales","400+ presentaciones","Ensemble vocal profesional",
            "Música litúrgica contemporánea","Maipú · Chile","15 años de trayectoria","4 cuerdas vocales","400+ presentaciones","Ensemble vocal profesional"
          ].map((item, i) => (
            <span key={i} className="ticker-item"><span className="ticker-dot" />{item}</span>
          ))}
        </div>
      </div>

      {/* NOSOTROS */}
      <section className="land-sec" id="nosotros">
        <div className="land-inner">
          <div className="about-grid">
            <div>
              <div className="eyebrow">Quiénes somos</div>
              <h2 className="land-h2">Un ensemble<br/>con <em>identidad</em><br/>propia</h2>
              <p className="land-body">Somos un coro de música litúrgica con más de 15 años en actividad. Cuatro cuerdas vocales —soprano, contralto, tenor y bajo— acompañadas de instrumentos en vivo, construyendo un sonido propio semana a semana.</p>
              <p className="land-body" style={{marginTop:16}}>Nuestra disciplina musical y compromiso con el repertorio nos definen como un conjunto vocal de alto nivel dentro de la tradición litúrgica contemporánea.</p>
              <div className="stats-row">
                <div className="stat"><div className="stat-n">15<sup>+</sup></div><div className="stat-l">Años activos</div></div>
                <div className="stat"><div className="stat-n">30<sup>+</sup></div><div className="stat-l">Voces</div></div>
                <div className="stat"><div className="stat-n">400<sup>+</sup></div><div className="stat-l">Presentaciones</div></div>
              </div>
            </div>
            <div className="about-img-wrap"><div className="about-img-jesus" />
              
              <div className="about-badge">
                <div className="about-badge-label">Cuerdas vocales</div>
                <div className="about-badge-val">SATB</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALERÍA */}
      <section className="land-sec-alt" id="galeria">
        <div className="land-inner">
          <div className="gal-top">
            <div>
              <div className="eyebrow">Galería</div>
              <h2 className="land-h2" style={{marginBottom:0}}>Presencia en cada<br/><em>celebración</em></h2>
            </div>
            <p className="land-body" style={{maxWidth:260,textAlign:"right"}}>Momentos que capturan nuestra entrega y pasión por la música litúrgica.</p>
          </div>
          <div className="gal-grid">
            {[["Navidad 2023","Diciembre"],["Semana Santa 2024","Abril"],["Fiesta Patronal","Agosto"],["Corpus Christi","Junio"],["Vigilia Pascual","Marzo"]].map(([label,sub],i) => (
              <div key={i} className="gi">
                <div className="gi-bg" />
                <div className="gi-content">
                  <div className="gi-label">{label}</div>
                  <div className="gi-sub">{sub}</div>
                </div>
                <div className="gi-hover"><div className="gi-hover-btn">Ver foto</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOT IA */}
      <section className="land-sec" id="bot">
        <div className="land-inner">
          <div className="bot-grid">
            <div>
              <div className="eyebrow">Asistente IA</div>
              <h2 className="land-h2">¿Te sumas<br/>al <em>coro?</em></h2>
              <p className="land-body">Respuestas inmediatas sobre cómo integrarte, ensayos y todo lo que necesitas saber.</p>
              <div style={{marginTop:48}}>
                {[["01","Proceso de ingreso","Cómo postular, qué se evalúa y cuándo son los ensayos de prueba."],
                  ["02","Horarios y ensayos","Frecuencia semanal, lugar y cómo es el proceso de incorporación."],
                  ["03","Repertorio y nivel","Qué cantamos y qué experiencia musical se valora en los candidatos."]
                ].map(([num,title,desc]) => (
                  <div key={num} className="bfeat">
                    <div className="bfeat-num">{num}</div>
                    <div><div className="bfeat-title">{title}</div><div className="bfeat-desc">{desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="chat-card">
                <div className="chat-hd">
                  <div className="chat-av">🎵</div>
                  <div><div className="chat-info-name">Coro MJ — Asistente</div><div className="chat-info-sub">Responde en español · IA</div></div>
                  <div className="chat-online" />
                </div>
                <div className="chat-msgs" ref={msgsRef}>
                  {chatMsgs.map((m,i) => (
                    <div key={i} className={`cm${m.role==="user"?" cm-u":""}`}>
                      {m.role==="bot" && <div className="cm-av">🎵</div>}
                      <div className={`cm-b ${m.role==="bot"?"cm-b-bot":"cm-b-user"}`}>{m.text}</div>
                      {m.role==="user" && <div className="cm-av">👤</div>}
                    </div>
                  ))}
                  {typing && (
                    <div className="cm">
                      <div className="cm-av">🎵</div>
                      <div className="cm-b cm-b-bot"><div className="tdots"><span/><span/><span/></div></div>
                    </div>
                  )}
                </div>
                <div className="chat-pills">
                  {["¿Cómo me uno?","¿Cuándo ensayan?","¿Qué nivel necesito?"].map(p => (
                    <button key={p} className="cpill" onClick={() => usePill(p)}>{p}</button>
                  ))}
                </div>
                <div className="chat-ft">
                  <input className="chat-in" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Escribe tu pregunta..."/>
                  <button className="chat-snd" onClick={()=>sendMsg()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="land-sec-alt" id="contacto">
        <div className="land-inner">
          <div className="ct-grid">
            <div>
              <div className="eyebrow">Contacto</div>
              <h2 className="land-h2">Hablemos<br/><em>directamente</em></h2>
              <p className="land-body">¿Quieres invitarnos o tienes alguna consulta? Escríbenos.</p>
              <div style={{marginTop:40}}>
                <div className="ct-item"><div className="ct-ico">📍</div><div><div className="ct-title">Ubicación</div><div className="ct-sub">Maipú, Santiago, Chile<br/>Capilla Sagrada Familia</div></div></div>
                <div className="ct-item"><div className="ct-ico">🎵</div><div><div className="ct-title">Ensayos</div><div className="ct-sub">Sábados · Capilla Misioneros de Jesús</div></div></div>
                <div className="ct-item"><div className="ct-ico">📲</div><div><div className="ct-title">Redes sociales</div><div className="ct-sub">Síguenos en nuestras plataformas</div></div></div>
              </div>
              <div className="soc-row">
                <div className="soc">📸</div><div className="soc">📘</div><div className="soc">▶️</div><div className="soc">🎧</div>
              </div>
            </div>
            <div className="cform">
              <h3>Envíanos<br/>un mensaje</h3>
              <div className="frow">
                <div className="fg"><label>Nombre</label><input type="text" placeholder="Juan"/></div>
                <div className="fg"><label>Apellido</label><input type="text" placeholder="González"/></div>
              </div>
              <div className="fg"><label>Correo</label><input type="email" placeholder="tu@correo.cl"/></div>
              <div className="fg"><label>Asunto</label>
                <select><option>Quiero unirme al coro</option><option>Invitación a celebración</option><option>Consulta general</option><option>Otro</option></select>
              </div>
              <div className="fg"><label>Mensaje</label><textarea placeholder="Cuéntanos..."/></div>
              <button className="fsub" onClick={()=>{setFormOk(true);setTimeout(()=>setFormOk(false),3000)}}>
                {formOk ? "✓ Enviado" : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="land-footer">
        <div className="foot-top">
          <div className="foot-brand">
            
            <p>Ensemble vocal de música litúrgica.<br/>Maipú, Santiago de Chile.</p>
          </div>
          <div className="foot-cols">
            <div className="foot-col">
              <h4>Sitio</h4>
              <a onClick={()=>scrollTo("nosotros")}>Nosotros</a>
              <a onClick={()=>scrollTo("galeria")}>Galería</a>
              <a onClick={()=>scrollTo("bot")}>Únete</a>
              <a onClick={()=>scrollTo("contacto")}>Contacto</a>
            </div>
            <div className="foot-col">
              <h4>Redes</h4>
              <a>Instagram</a><a>Facebook</a><a>YouTube</a><a>Spotify</a>
            </div>
          </div>
        </div>
        <div className="foot-btm">
          <span className="foot-copy">© 2026 Coro Misioneros de Jesús · Desarrollado por TEMPVS7®</span>
          <span className="foot-adm" onClick={onPortal}>· · ·</span>
        </div>
      </footer>
    </div>
  );
}
