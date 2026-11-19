/* Sasha Pet Shop: horario en directo, la placa que se gira, menú del móvil, barra de cita y apariciones. Sin dependencias. */
(function () {
  "use strict";
  var raiz = document.documentElement;
  raiz.classList.add("js");
  var params = new URLSearchParams(location.search);
  if (params.has("captura")) {
    raiz.classList.add("captura");
    document.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = "eager"; });
  }
  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- horario (hora de Culleredo, Europe/Madrid) ---------- */
  // minutos desde medianoche; 0 = domingo
  var HORARIO = { 0: [], 1: [[600, 1110]], 2: [[600, 1110]], 3: [[600, 1110]], 4: [[540, 1170]], 5: [[540, 900]], 6: [] };
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function ahora() {
    var f = params.get("fecha"), h = params.get("hora");
    if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) {
      var d = new Date(f + "T12:00:00");
      var hm = (h && /^\d{1,2}:\d{2}$/.test(h) ? h : "12:00").split(":");
      return { dia: d.getDay(), min: +hm[0] * 60 + +hm[1] };
    }
    try {
      var partes = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      var m = {}; partes.forEach(function (p) { m[p.type] = p.value; });
      var dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { dia: dias[m.weekday], min: +m.hour * 60 + +m.minute };
    } catch (e) {
      var n = new Date(); return { dia: n.getDay(), min: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function hora(min) { var h = Math.floor(min / 60), m = min % 60; return h + ":" + (m < 10 ? "0" : "") + m; }
  function estado() {
    var t = ahora(), hoy = HORARIO[t.dia];
    for (var i = 0; i < hoy.length; i++) {
      if (t.min >= hoy[i][0] && t.min < hoy[i][1]) return { abierto: true, texto: "Abierto ahora, hasta las " + hora(hoy[i][1]), dia: t.dia };
    }
    for (var j = 0; j < hoy.length; j++) {
      if (t.min < hoy[j][0]) return { abierto: false, texto: "Cerrado, hoy abrimos a las " + hora(hoy[j][0]), dia: t.dia };
    }
    for (var k = 1; k <= 7; k++) {
      var d = (t.dia + k) % 7;
      if (HORARIO[d].length) {
        var cuando = k === 1 ? "mañana" : "el " + DIAS[d];
        return { abierto: false, texto: "Cerrado, abrimos " + cuando + " a las " + hora(HORARIO[d][0][0]), dia: t.dia };
      }
    }
    return { abierto: false, texto: "Cerrado", dia: t.dia };
  }
  function pintarEstado() {
    var e = estado();
    document.querySelectorAll("[data-estado]").forEach(function (el) {
      el.setAttribute("data-abierto", e.abierto ? "true" : "false");
      var tx = el.querySelector("[data-estado-texto]");
      if (tx) tx.textContent = e.texto;
    });
    document.querySelectorAll("[data-horario] tr").forEach(function (tr) {
      var es = +tr.getAttribute("data-dia") === e.dia;
      tr.classList.toggle("hoy", es);
      var th = tr.querySelector("th");
      if (th) th.setAttribute("aria-current", es ? "date" : "false");
    });
  }
  pintarEstado();
  setInterval(pintarEstado, 60000);

  /* ---------- la placa: se gira y enseña el teléfono ---------- */
  var placa = document.querySelector("[data-placa]");
  if (placa) {
    var boton = placa.querySelector(".placa-giro");
    var texto = placa.querySelector("[data-placa-texto]");
    boton.addEventListener("click", function () {
      var girada = boton.getAttribute("aria-pressed") === "true";
      boton.setAttribute("aria-pressed", girada ? "false" : "true");
      texto.textContent = girada
        ? "Dar la vuelta a la placa para ver el teléfono"
        : "Placa girada: WhatsApp 611 18 00 74, teléfono 981 07 54 33, Rúa Amparo López Jean 3, Culleredo. Pulsa para volver a la foto de Sasha";
    });
    // vaivén leve hacia el puntero, solo con ratón y sin «reducir movimiento»
    var portada = document.querySelector(".portada");
    if (portada && !reducir && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      var pendiente = false, ultimoX = 0;
      portada.addEventListener("pointermove", function (ev) {
        ultimoX = ev.clientX;
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(function () {
          pendiente = false;
          var r = placa.getBoundingClientRect();
          var dx = (ultimoX - (r.left + r.width / 2)) / (window.innerWidth / 2);
          dx = Math.max(-1, Math.min(1, dx));
          placa.style.setProperty("--vaiven", (dx * 3.2).toFixed(2) + "deg");
        });
      });
      portada.addEventListener("pointerleave", function () { placa.style.setProperty("--vaiven", "0deg"); });
    }
  }

  /* ---------- menú del móvil ---------- */
  var menuBoton = document.querySelector(".menu-boton");
  var menu = document.getElementById("menu");
  if (menuBoton && menu) {
    var etiqueta = menuBoton.querySelector(".sr");
    function cerrar(devolverFoco) {
      menu.classList.remove("abierto");
      menuBoton.setAttribute("aria-expanded", "false");
      etiqueta.textContent = "Abrir menú";
      if (devolverFoco) menuBoton.focus();
    }
    menuBoton.addEventListener("click", function () {
      var abrir = menuBoton.getAttribute("aria-expanded") !== "true";
      if (!abrir) return cerrar(false);
      menu.classList.add("abierto");
      menuBoton.setAttribute("aria-expanded", "true");
      etiqueta.textContent = "Cerrar menú";
      var primero = menu.querySelector("a");
      if (primero) primero.focus();
    });
    menu.addEventListener("click", function (ev) { if (ev.target.closest("a")) cerrar(false); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && menu.classList.contains("abierto")) cerrar(true);
    });
  }

  /* ---------- barra de cita en el móvil: aparece cuando los botones de la portada ya no se ven ---------- */
  var barra = document.querySelector("[data-barra]");
  var botonesPortada = document.querySelector(".portada-accion .botones");
  var pie = document.querySelector(".pie");
  if (barra && botonesPortada && "IntersectionObserver" in window) {
    var fuera = false, pieVisible = false;
    function actualizar() { barra.classList.toggle("visible", fuera && !pieVisible); }
    new IntersectionObserver(function (e) {
      fuera = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; actualizar();
    }).observe(botonesPortada);
    if (pie) new IntersectionObserver(function (e) { pieVisible = e[0].isIntersecting; actualizar(); }, { rootMargin: "0px 0px -40% 0px" }).observe(pie);
  }

  /* ---------- apariciones suaves al entrar en pantalla ---------- */
  if (!reducir && !raiz.classList.contains("captura") && "IntersectionObserver" in window) {
    var grupos = [".encabezado", ".perro", ".servicio", ".servicios-foto", ".cassia-foto", ".cassia-texto", ".cita", ".visita-rejilla > *", ".mas-perros"];
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visto"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    grupos.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) return; // lo que ya se ve al cargar no se esconde
        el.classList.add("revelar");
        el.style.setProperty("--i", sel === ".perro" ? i % 5 : sel === ".cita" ? i % 2 : 0);
        io.observe(el);
      });
    });
  }
})();
