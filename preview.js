(function () {
  if (typeof window.d3 === 'undefined') { console.error('D3 não carregado'); return; }
  if (typeof window.d3.hilbert === 'undefined') { console.error('d3-hilbert não carregado'); return; }

  const GEO_URL  = 'grid_8x8.geojson';
  const INFO_URL = 'sim_3cd4_country_grid_8x8-7663_seeds_5be1_processedhistory.json';

  const gridSvg = d3.select('#gridSvg');
  const projSvg = d3.select('#projSvg');
  const mortonSvg = d3.select('#mortonSvg');
  const hilbertSvg = d3.select('#hilbertSvg');
  const tooltip = document.getElementById('tooltip');

  const btnPlay = document.getElementById('btnPlayPreview');
  const btnMorton = document.getElementById('btnMorton');
  const btnHilbert = document.getElementById('btnHilbert');
  const btnModeGrid = document.getElementById('btnModeGrid');
  const btnModeComparison = document.getElementById('btnModeComparison');
  const curveTypeLabel = document.getElementById('curveType');
  const seek    = document.getElementById('seekPreview');
  const timeLbl = document.getElementById('timePreview');

  const gridContainer = document.getElementById('gridContainer');
  const projContainer = document.getElementById('projContainer');
  const mortonContainer = document.getElementById('mortonContainer');
  const hilbertContainer = document.getElementById('hilbertContainer');
  const curveToggleContainer = document.getElementById('curveToggleContainer');

  if (gridSvg.empty() || projSvg.empty()) return;

  const FPS = 10;
  const FRAME_MS = 1000 / FPS;
  let playing = false;
  let frameIndex = 0;
  let rafId = 0;
  let lastTick = 0;
  let currentCurve = 'morton';
  let currentMode = 'grid';

  function fmtFrame(i, total) {
    const ms = i * FRAME_MS, durMs = total * FRAME_MS;
    const toMMSS = (t) => {
      const s = Math.floor(t / 1000), m = Math.floor(s / 60);
      return `${m}:${String(s % 60).padStart(2, '0')}`;
    };
    return `${toMMSS(ms)} / ${toMMSS(durMs)}`;
  }

  function morton(ix, iy) {
    const part1by1 = (n) => {
      n &= 0xFFFF;
      n = (n | (n << 8)) & 0x00FF00FF;
      n = (n | (n << 4)) & 0x0F0F0F0F;
      n = (n | (n << 2)) & 0x33333333;
      n = (n | (n << 1)) & 0x55555555;
      return n;
    };
    return (part1by1(ix) | (part1by1(iy) << 1)) >>> 0;
  }

  function showTooltip(text, event) {
    tooltip.innerHTML = text;
    tooltip.classList.add('visible');
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
  }
  function hideTooltip() { tooltip.classList.remove('visible'); }

  function switchMode(mode) {
    currentMode = mode;
    if (mode === 'grid') {
      gridContainer.classList.remove('hidden');
      projContainer.classList.remove('hidden');
      mortonContainer.classList.add('hidden');
      hilbertContainer.classList.add('hidden');
      curveToggleContainer.classList.remove('hidden');
      btnModeGrid.classList.add('active');
      btnModeComparison.classList.remove('active');
    } else {
      gridContainer.classList.add('hidden');
      projContainer.classList.add('hidden');
      mortonContainer.classList.remove('hidden');
      hilbertContainer.classList.remove('hidden');
      curveToggleContainer.classList.add('hidden');
      btnModeComparison.classList.add('active');
      btnModeGrid.classList.remove('active');
    }
  }

  Promise.all([
    fetch(GEO_URL).then(r => r.json()),
    fetch(INFO_URL).then(r => r.json())
  ]).then(([geo, hist]) => {
    const timeKeys = Object.keys(hist).map(k => Number(k)).sort((a,b)=>a-b);
    const T = timeKeys.length;

    if (seek) { seek.min = 0; seek.max = Math.max(0, T - 1); seek.step = 1; seek.value = 0; }
    if (timeLbl) timeLbl.textContent = fmtFrame(0, T);

    const MG = { top: 24, right: 16, bottom: 36, left: 48 };
    const WG = 600, HG = 600;
    gridSvg.attr('viewBox', `0 0 ${WG} ${HG}`);

    const gGrid = gridSvg.append('g').attr('transform', `translate(${MG.left},${MG.top})`);
    const projection = d3.geoIdentity();
    const path = d3.geoPath(projection);

    const b = path.bounds(geo);
    const innerWG = WG - MG.left - MG.right;
    const innerHG = HG - MG.top - MG.bottom;

    const scale = Math.min(
      innerWG / (b[1][0] - b[0][0] || 1),
      innerHG / (b[1][1] - b[0][1] || 1)
    );

    projection
      .scale(scale)
      .translate([
        -b[0][0] * scale + (innerWG - (b[1][0] - b[0][0]) * scale) / 2,
        -b[0][1] * scale + (innerHG - (b[1][1] - b[0][1]) * scale) / 2
      ]);

    let vmin = Infinity, vmax = -Infinity;
    for (const tk of timeKeys) {
      const frame = hist[tk];
      for (const f of geo.features) {
        const v = frame[String(f.properties.id)] ?? 0;
        if (v < vmin) vmin = v;
        if (v > vmax) vmax = v;
      }
    }
    if (!isFinite(vmin)) vmin = 0;
    if (!(vmax > vmin)) vmax = vmin + 1;
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([vmin, vmax]);

    const gridCells = gGrid.selectAll('path')
      .data(geo.features)
      .join('path')
      .attr('d', d => path(d));

    const feats = geo.features.map(f => {
      const id = f.properties.id;
      const cx = +f.properties.centroid_x;
      const cy = +f.properties.centroid_y;
      const ix = Math.max(0, Math.round(cx - 0.5));
      const iy = Math.max(0, Math.round(cy - 0.5));
      return { id, cx, cy, ix, iy };
    });

    feats.forEach(d => d.morton = morton(d.ix, d.iy));
    const mortonOrder = feats.slice().sort((a,b) => a.morton - b.morton).map(d => d.id);

    const gridSide = 1 + d3.max(feats, d => Math.max(d.ix, d.iy));
    const hilbertOrderExp = Math.ceil(Math.log2(gridSide || 1));
    const hilbertCanvas = 1 << hilbertOrderExp;
    const hilbertGen = d3.hilbert()
      .order(hilbertOrderExp)
      .canvasWidth(hilbertCanvas);
    feats.forEach(d => { d.hilbert = hilbertGen.getValAtXY(d.ix, d.iy); });
    const hilbertOrder = feats.slice().sort((a,b) => a.hilbert - b.hilbert).map(d => d.id);

    let currentOrder = mortonOrder;
    const S = currentOrder.length;

    const minIy = Math.min(...feats.map(d => d.iy));
    const maxIy = Math.max(...feats.map(d => d.iy));
    const minIx = Math.min(...feats.map(d => d.ix));
    const maxIx = Math.max(...feats.map(d => d.ix));
    const idsNorte = feats.filter(f => f.iy === minIy).map(f => f.id);
    const idsSul   = feats.filter(f => f.iy === maxIy).map(f => f.id);
    const idsOeste = feats.filter(f => f.ix === minIx).map(f => f.id);
    const idsLeste = feats.filter(f => f.ix === maxIx).map(f => f.id);

    function getDirection(id) {
      let tags = [];
      if (idsNorte.includes(id)) tags.push('Norte');
      if (idsSul.includes(id))   tags.push('Sul');
      if (idsOeste.includes(id)) tags.push('Oeste');
      if (idsLeste.includes(id)) tags.push('Leste');
      return tags.join('&nbsp;');
    }
    function getBarColor(id) {
      if (idsNorte.includes(id)) return '#0080ff';
      if (idsSul.includes(id))   return '#ff4d33';
      if (idsOeste.includes(id)) return '#00cc44';
      if (idsLeste.includes(id)) return '#b266ff';
      return null;
    }

    const CELL_BORDER = 6;
    function gridUpdate(frame) {
      gridCells
        .attr('fill', d => color(frame[String(d.properties.id)] ?? 0))
        .attr('stroke', d => {
          const id = d.properties.id;
          if (idsNorte.includes(id)) return '#0080ff';
          if (idsSul.includes(id))   return '#ff4d33';
          if (idsOeste.includes(id)) return '#00cc44';
          if (idsLeste.includes(id)) return '#b266ff';
          return '#fff';
        })
        .attr('stroke-width', d => {
          const id = d.properties.id;
          return (idsNorte.includes(id) || idsSul.includes(id) ||
                  idsOeste.includes(id) || idsLeste.includes(id)) ? CELL_BORDER : 0.5;
        })
        .on('mouseover', function(event, d) {
          const id = d.properties.id;
          const cellFeats = feats.find(f=>f.id==id);
          const directions = [];
          if (idsNorte.includes(id)) directions.push('Norte');
          if (idsSul.includes(id))   directions.push('Sul');
          if (idsOeste.includes(id)) directions.push('Oeste');
          if (idsLeste.includes(id)) directions.push('Leste');
          showTooltip(
            `<strong>ID:</strong> ${id}<br>
             <strong>Coord:</strong> (${cellFeats.ix},${cellFeats.iy})<br>
             <strong>Extremo:</strong> ${directions.join('&nbsp;') || 'Nenhum'}`,
            event
          );
          d3.select(this).attr('stroke', '#000').attr('stroke-width', 3);
        })
        .on('mousemove', function(event) {
          tooltip.style.left = (event.pageX + 10) + 'px';
          tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseout', function() {
          hideTooltip();
          d3.select(this)
            .attr('stroke', d => {
              const id = d.properties.id;
              if (idsNorte.includes(id)) return '#0080ff';
              if (idsSul.includes(id))   return '#ff4d33';
              if (idsOeste.includes(id)) return '#00cc44';
              if (idsLeste.includes(id)) return '#b266ff';
              return '#fff';
            })
            .attr('stroke-width', d => {
              const id = d.properties.id;
              return (idsNorte.includes(id) || idsSul.includes(id) ||
                      idsOeste.includes(id) || idsLeste.includes(id)) ? CELL_BORDER : 0.5;
            });
        });
    };

    gridUpdate(hist[timeKeys[0]]);

    gGrid.selectAll('.label-dir').data([
      {x: 0.5, y: -1, txt: 'N'}, 
      {x: 0.5, y: gridSide, txt: 'S'}, 
      {x: -1, y: 0.5, txt: 'O'}, 
      {x: gridSide, y: 0.5, txt: 'L'} 
    ]).join('text')
     .attr('class', 'label-dir')
     .attr('x', d => (d.x * (innerWG/gridSide)))
     .attr('y', d => (d.y * (innerHG/gridSide)))
     .attr('text-anchor', 'middle')
     .attr('dominant-baseline', 'central')
     .attr('font-size', 28)
     .attr('fill', '#555')
     .attr('font-weight', 'bold')
     .text(d => d.txt);

    function renderProjection(targetSvg, order, curveName, showFocusLine = true) {
      targetSvg.selectAll('*').remove();

      const MP = { top: 36, right: 16, bottom: 32, left: 48 };
      const WP = 600, HP = 600;
      targetSvg.attr('viewBox', `0 0 ${WP} ${HP}`);

      const gProj = targetSvg.append('g').attr('transform', `translate(${MP.left},${MP.top})`);
      const innerWP = WP - MP.left - MP.right;
      const innerHP = HP - MP.top - MP.bottom;

      const sideBarW = 12, gapW = 8;
      const heatW = innerWP - sideBarW - gapW;
      const heatH = innerHP;
      const cw = heatW / T;
      const bandH = heatH / S;

      const x = d3.scaleLinear().domain([0, T]).range([0, heatW]);
      const y = d3.scaleLinear().domain([0, S]).range([heatH, 0]);

      gProj.append('g').attr('class', 'extremos-bar')
        .selectAll('rect').data(order).join('rect')
        .attr('x', 0)
        .attr('y', (_, i) => y(i + 1))
        .attr('width', sideBarW)
        .attr('height', bandH)
        .attr('fill', id => getBarColor(id) || '#eee');

      const gHeat = gProj.append('g').attr('transform', `translate(${sideBarW + gapW},0)`);

      gHeat.selectAll('g.row')
        .data(order, id => id)
        .join(enter => {
          const row = enter.append('g').attr('class', 'row')
            .attr('transform', (_, r) => `translate(0,${y(r + 1)})`);
          row.each(function (id, r) {
            d3.select(this).selectAll('rect.cell')
              .data(timeKeys, tk => tk)
              .join('rect')
              .attr('class', 'cell')
              .attr('x', (tk, c) => x(c))
              .attr('y', 0)
              .attr('width', cw)
              .attr('height', bandH)
              .attr('fill', (tk) => {
                const v = hist[tk][String(id)] ?? 0;
                return color(v);
              })
              .on('mouseover', function(event, tk) {
                const f = feats.find(f=>f.id===id);
                const v = hist[tk][String(id)] ?? 0;
                showTooltip(
                  `<strong>Célula ID:</strong> ${id}<br>
                  <strong>Coord:</strong> (${f.ix},${f.iy})<br>
                  <strong>Extremo:</strong> ${getDirection(id)}
                  <br><strong>Posição ${curveName}:</strong> ${r + 1}/${S}
                  <br><strong>Tempo:</strong> ${timeKeys.indexOf(tk)}
                  <br><strong>Valor:</strong> ${v.toFixed(2)}`, event);
                d3.select(this).attr('stroke', '#000').attr('stroke-width', 1);
              })
              .on('mousemove', function(event) {
                tooltip.style.left = (event.pageX + 10) + 'px';
                tooltip.style.top = (event.pageY - 10) + 'px';
              })
              .on('mouseout', function() {
                hideTooltip();
                d3.select(this).attr('stroke', null);
              });
          });
        });

      if (showFocusLine) {
        const focusLine = gProj.append('line')
          .attr('class', 'focus-line-' + curveName.toLowerCase())
          .attr('transform', `translate(${sideBarW + gapW},0)`)
          .attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', heatH)
          .attr('stroke', '#FF0000').attr('stroke-width', 2).attr('opacity', 0.7);

        if (curveName === 'Morton') window.mortonFocusLine = focusLine;
        if (curveName === 'Hilbert') window.hilbertFocusLine = focusLine;
        if (!window.mortonFocusLine && !window.hilbertFocusLine) window.focusLine = focusLine;
      }

      gProj.append('g').attr('transform', `translate(${sideBarW + gapW},${heatH})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d => Math.round(d)));
      gProj.append('g').attr('transform', `translate(${sideBarW + gapW},0)`)
        .call(d3.axisLeft(y).ticks(10).tickFormat(d => Math.round(d)));
    }

    function paintFrame(i) {
      const tk = timeKeys[i] ?? timeKeys[0];
      const frame = hist[tk];
      gridUpdate(frame);
      const sideBarW = 12, gapW = 8;
      const heatW = (600 - 48 - 16) - sideBarW - gapW;
      const x = d3.scaleLinear().domain([0, T]).range([0, heatW]);
      if (window.focusLine) window.focusLine.attr('x1', x(i)).attr('x2', x(i));
      if (window.mortonFocusLine) window.mortonFocusLine.attr('x1', x(i)).attr('x2', x(i));
      if (window.hilbertFocusLine) window.hilbertFocusLine.attr('x1', x(i)).attr('x2', x(i));
      if (seek) seek.value = i;
      if (timeLbl) timeLbl.textContent = fmtFrame(i, T);
      frameIndex = i;
    }

    function tick(ts) {
      if (!playing) return;
      if (!lastTick) lastTick = ts;
      const dt = ts - lastTick;
      if (dt >= FRAME_MS) {
        const steps = Math.floor(dt / FRAME_MS);
        lastTick = ts - (dt - steps * FRAME_MS);
        const next = (frameIndex + steps) % T;
        paintFrame(next);
      }
      rafId = requestAnimationFrame(tick);
    }

    if (btnModeGrid) btnModeGrid.addEventListener('click', () => switchMode('grid'));
    if (btnModeComparison) {
      btnModeComparison.addEventListener('click', () => {
        switchMode('comparison');
        renderProjection(mortonSvg, mortonOrder, 'Morton', true);
        renderProjection(hilbertSvg, hilbertOrder, 'Hilbert', true);
        paintFrame(frameIndex);
      });
    }
    if (btnMorton) {
      btnMorton.addEventListener('click', () => {
        currentCurve = 'morton';
        currentOrder = mortonOrder;
        btnMorton.classList.add('active');
        btnHilbert.classList.remove('active');
        if (curveTypeLabel) curveTypeLabel.textContent = 'Morton';
        renderProjection(projSvg, currentOrder, 'Morton', true);
      });
    }
    if (btnHilbert) {
      btnHilbert.addEventListener('click', () => {
        currentCurve = 'hilbert';
        currentOrder = hilbertOrder;
        btnHilbert.classList.add('active');
        btnMorton.classList.remove('active');
        if (curveTypeLabel) curveTypeLabel.textContent = 'Hilbert';
        renderProjection(projSvg, currentOrder, 'Hilbert', true);
      });
    }
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (!playing) {
          playing = true;
          btnPlay.textContent = 'Pausar';
          lastTick = 0;
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(tick);
        } else {
          playing = false;
          btnPlay.textContent = 'Play';
          cancelAnimationFrame(rafId);
        }
      });
    }
    if (seek) {
      seek.addEventListener('input', (e) => {
        const i = Math.max(0, Math.min(T - 1, Number(e.target.value) || 0));
        playing = false;
        if (btnPlay) btnPlay.textContent = 'Play';
        cancelAnimationFrame(rafId);
        paintFrame(i);
      });
    }

    renderProjection(projSvg, mortonOrder, 'Morton', true);
    paintFrame(0);
  }).catch(err => {
    console.error('Falha no preview:', err);
  });
})();
