(() => {
  const main = document.getElementById("main-content");
  const title = document.getElementById("view-title");
  const eyebrow = document.getElementById("top-eyebrow");
  const drawer = document.getElementById("detail-drawer");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  const resetModal = document.getElementById("reset-modal");
  const viewMeta = {
    map:["全剧路径","SCRIPT BLUEPRINT"], scene:["单场编排","SCENE ORCHESTRATION"],
    play:["互动演练","INTERACTIVE EXERCISE"], review:["导控复盘","DIRECTOR DEBRIEF"]
  };
  const routeNames = {A:"稳控路线",B:"信息失信路线",C:"现场失控路线",D:"对质问责路线"};
  const routeColors = {A:"#357A63",B:"#A86F24",C:"#A43E36"};
  const freshPlay = () => ({
    started:false, scene:1, route:null, entryVariant:null, entryRoute:"A", roleId:"command", step:0,
    currentChoice:null, work:"", comments:[], log:[], materials:[], loadedEvents:[],
    exit1:null, exit2:null, exit3:null, exit4:null, exit5:null, exit6:null, completed:false, submitting:false
  });
  const state = { selectedPath:"all", selectedScene:1, sceneRoute:"A", play:freshPlay(), ready:false };

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem("longnight-prototype-state") || "null");
      if (!saved) return;
      state.selectedPath = saved.selectedPath || "all";
      state.selectedScene = saved.selectedScene || 1;
      state.sceneRoute = saved.sceneRoute || "A";
      state.play = Object.assign(freshPlay(), saved.play || {}, {submitting:false});
    } catch (_) { localStorage.removeItem("longnight-prototype-state"); }
  }
  function save() {
    const copy = {...state, play:{...state.play, submitting:false}};
    localStorage.setItem("longnight-prototype-state", JSON.stringify(copy));
  }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function icon(name) {
    const paths = {
      arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>', check:'<path d="m5 12 4 4L19 6"/>',
      play:'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
      users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
      map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
      clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/>',
      x:'<path d="m6 6 12 12M18 6 6 18"/>', branch:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v5a7 7 0 0 0 7 7h3M6 7v12"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  }
  function roleById(id) { return DB.roles.find(r => r.id === id) || DB.roles[0]; }
  function pathRoute(pathId, index = null) {
    if (index === 5 && pathId === "p4") return "D";
    return ({p1:"A",p2:"B",p3:"B",p4:"C",p5:"C"})[pathId] || "A";
  }
  function pathVariant(pathId, index) {
    if (index < 2) return null;
    if (index === 2 || index === 3 || index === 4) return ({p1:"A",p2:"B_repair",p3:"B_doubt",p4:"C",p5:"C"})[pathId] || "A";
    if (index === 5) return ({p1:"A",p2:"B_repair",p3:"B_doubt",p4:"D",p5:"C_supervision"})[pathId] || "A";
    return pathRoute(pathId, index);
  }
  function openingsForScene(scene) { return ({2:DB.play.thirdOpenings,3:DB.play.fourthOpenings,4:DB.play.fifthOpenings,5:DB.play.sixthOpenings})[scene]; }
  function routeTag(route, text) { return `<span class="route-tag route-${route}">${esc(text || routeNames[route])}</span>`; }
  function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `${icon(type === "error" ? "alert" : "check")}<span>${esc(message)}</span>`;
    document.getElementById("toast-region").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  function currentView() { return (location.hash || "#map").slice(1).split("/")[0]; }
  function syncShell(view) {
    document.body.dataset.page = view;
    document.querySelectorAll("[data-nav]").forEach(a => {
      const active = a.dataset.nav === view;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
    });
    const meta = viewMeta[view] || viewMeta.map;
    title.textContent = meta[0]; eyebrow.textContent = meta[1];
  }
  function render() {
    if (!state.ready) return;
    const view = currentView();
    syncShell(view);
    if (view === "scene") renderScene();
    else if (view === "play") renderPlay();
    else if (view === "review") renderReview();
    else renderMap();
    main.classList.remove("page-enter");
    requestAnimationFrame(() => main.classList.add("page-enter"));
  }

  function renderMap() {
    const headers = ["路径 / 场次",...DB.scenes.map((s,i)=>`0${i+1} ${s.title}`),"结局与余波"];
    const rows = DB.paths.map(path => {
      const dimmed = state.selectedPath !== "all" && state.selectedPath !== path.id;
      return `<div class="blueprint-row ${dimmed ? "dimmed" : ""}">
        <div class="lane-label"><strong>${esc(path.name)}</strong><small>${esc(path.summary)}</small></div>
        ${path.nodes.map((n,i)=>`<button class="path-node ${i===6 ? "ending-node" : ""}" style="--node-color:${path.color}" data-action="path-node" data-path="${path.id}" data-index="${i}" type="button"><strong>${esc(n.title)}</strong><small>${i<6 ? `第${i+1}场 · 点击查看` : "结局 · 点击查看"}</small></button>`).join("")}
      </div>`;
    }).join("");
    main.innerHTML = `
      <section class="page-intro"><div><div class="kicker">六场五结局 / 连续分支总图</div><h2>每一场的收束，都是下一场的开场</h2><p>五条路径共享事件骨架，通过旧材料、主责角色和任务组合形成不同走向。点击任一节点查看进入局面与衔接。</p></div><button class="btn btn-primary" data-action="start-scene1" type="button">${icon("play")}从第一场开始演练</button></section>
      <div class="stat-row">
        <div class="stat-card">${icon("branch")}<div><div class="stat-value">06</div><div class="stat-label">连续剧情场次</div></div></div>
        <div class="stat-card">${icon("map")}<div><div class="stat-value">05</div><div class="stat-label">差异化结局路径</div></div></div>
        <div class="stat-card">${icon("users")}<div><div class="stat-value">08</div><div class="stat-label">核心协同角色</div></div></div>
        <div class="stat-card">${icon("file")}<div><div class="stat-value">13</div><div class="stat-label">原剧本关键决策点</div></div></div>
      </div>
      <div class="split-callouts"><div class="split-callout"><b>分流点 01 · 第二场</b><br><span>主动纠错走向带伤闭环；回避旧错并在第四场翻车，走向二次舆情。</span></div><div class="split-callout"><b>分流点 02 · 第五场</b><br><span>同一聚集局面下，主动督办进入强力纠偏；清场失诺进入深度追责。</span></div></div>
      <div class="path-toolbar"><button class="chip ${state.selectedPath==="all"?"active":""}" data-action="filter-path" data-path="all" type="button">全部路径</button>${DB.paths.map(p=>`<button class="chip ${state.selectedPath===p.id?"active":""}" data-action="filter-path" data-path="${p.id}" type="button">${esc(p.name)}</button>`).join("")}</div>
      <div class="blueprint-wrap"><div class="blueprint"><div class="blueprint-header">${headers.map(h=>`<div>${esc(h)}</div>`).join("")}</div>${rows}</div></div>
      <div class="legend"><span><i style="background:#357A63"></i>稳控与兑现</span><span><i style="background:#A86F24"></i>信息信用带伤</span><span><i style="background:#A43E36"></i>现场对立与失控</span><span>节点可点击 · 路线可换线 · 结局不按失误计数</span></div>`;
  }

  function showPathNode(pathId, index) {
    const path = DB.paths.find(p=>p.id===pathId); const n = path.nodes[index];
    const sceneName = index < 6 ? `第${index+1}场 · ${DB.scenes[index].title}` : "结局与余波场";
    const sceneRoute = pathId === "p4" && index >= 5 ? "D" : pathRoute(pathId);
    drawer.innerHTML = `<button class="drawer-close" data-action="close-drawer" type="button" aria-label="关闭">${icon("x")}</button>
      <div class="drawer-kicker">${esc(path.name)} / NODE 0${index+1}</div><h2>${esc(n.title)}</h2><p>${esc(sceneName)}</p>
      <div class="drawer-section"><h4>进入局面</h4><p>${esc(n.state)}</p></div>
      <div class="drawer-section"><h4>主责与协同角色</h4><div class="role-pills">${n.roles.map(id=>`<span class="role-pill">${esc(roleById(id).name)}</span>`).join("")}</div></div>
      <div class="drawer-section"><h4>贯穿材料</h4><div class="material-list"><span class="material-tag">${esc(n.material)}</span></div></div>
      <div class="drawer-section"><h4>收束衔接</h4><p>${esc(n.transition)}</p></div>
      ${index<6 ? `<button class="btn btn-primary" data-action="play-node" data-path="${pathId}" data-index="${index}" type="button">${icon("play")}${index===0 ? "从第一场开始" : `直接进入第${index+1}场${sceneRoute}线`}</button>` : `<p class="form-help">结局与余波场只回收路径结果，不新增处置任务。</p>`}`;
    drawerBackdrop.hidden = false; drawer.classList.add("open"); drawer.setAttribute("aria-hidden","false");
  }
  function closeDrawer() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); drawerBackdrop.hidden = true; }

  function sceneEvents(sceneId, route) {
    if (sceneId === 1) return DB.play.scene1;
    const interactive = DB.play[`scene${sceneId}`];
    if (interactive && interactive[route]) return interactive[route];
    const scene = DB.scenes[sceneId-1];
    return (scene.events || []).map((e,i)=>({time:e[0],title:e[1],story:e[2],id:`scene-${sceneId}-${i}`,tasks:{}}));
  }
  function renderScene() {
    const scene = DB.scenes[state.selectedScene-1];
    if (!scene.routes[state.sceneRoute]) state.sceneRoute = Object.keys(scene.routes)[0];
    const routeKey = state.sceneRoute, route = scene.routes[routeKey];
    const events = sceneEvents(scene.id, routeKey);
    const roleTasks = DB.roles.map(role => {
      const own = events.map(e=>e.tasks && e.tasks[role.id]).find(Boolean);
      return {role, task:own || "按本场事件序列接收材料，完成本岗位核查与协同。"};
    });
    main.innerHTML = `<section class="page-intro"><div><div class="kicker">共同骨架 + 路线版本 + 角色任务</div><h2>${esc(scene.title)}</h2><p>${esc(scene.time)}。共同事件不被分支抹掉，路线差异体现在开场材料、主责角色和处置任务。</p></div>${scene.id<=6?`<button class="btn btn-primary" data-action="scene-play" type="button">${icon("play")}打开本场互动</button>`:""}</section>
      <div class="scene-selector">${DB.scenes.map(s=>`<button class="scene-tab ${s.id===scene.id?"active":""}" data-action="select-scene" data-scene="${s.id}" type="button"><small>SCENE 0${s.id}</small><strong>${esc(s.title)}</strong></button>`).join("")}</div>
      <div class="scene-layout"><section><div class="card card-pad"><div class="route-tabs">${Object.entries(scene.routes).map(([key,r])=>`<button class="route-tab ${key===routeKey?"active":""}" data-action="select-route" data-route="${key}" type="button">${key} · ${esc(r.name)}</button>`).join("")}</div>
        <div class="section-head"><div><h3>${routeKey}路线｜${esc(route.name)}</h3><p>${esc(route.desc)}</p></div>${routeTag(routeKey)}</div>
        <div class="skeleton-flow">${scene.common.map((c,i)=>`${i?icon("arrow"):""}<span>${esc(c)}</span>`).join("")}</div>
        <div class="event-list">${events.map(e=>`<article class="event-card"><time class="event-time">${esc(e.time)}</time><div><h4>${esc(e.title)}</h4><p>${esc(e.story)}</p><div class="event-meta">${e.choices?`<span class="material-tag">选项＋实操作品</span>`:""}${e.tasks&&Object.keys(e.tasks).length?`<span class="role-pill">${Object.keys(e.tasks).length}类角色任务</span>`:""}</div></div></article>`).join("")}</div>
        <div class="transition-card"><h3>本场收束</h3><p>${esc(route.exit)}</p>${scene.id<=6?`<button class="btn btn-accent btn-sm" data-action="scene-play" type="button">在演练中验证这条路线${icon("arrow")}</button>`:""}</div>
      </div></section>
      <aside><div class="section-head"><div><h3>角色任务矩阵</h3><p>主责与协同随路线改变</p></div></div><div class="role-stack">${roleTasks.map(({role,task})=>`<div class="role-task-card"><strong><span class="role-dot" style="background:${role.color}"></span>${esc(role.name)}</strong><p>${esc(task)}</p></div>`).join("")}</div></aside></div>`;
  }

  function addInitialComments(event) {
    if (state.play.loadedEvents.includes(event.id)) return;
    state.play.loadedEvents.push(event.id);
    (event.initialComments || []).forEach(([author,text]) => state.play.comments.push({author,text,time:event.time}));
  }
  function startPlay(scene, route = "A", preserve = false, variant = null) {
    const roleId = state.play.roleId, entryRoute = state.play.entryRoute;
    const old = state.play;
    state.play = freshPlay(); state.play.roleId = roleId; state.play.entryRoute = entryRoute;
    state.play.started = true; state.play.scene = scene; state.play.route = scene === 1 ? null : route;
    state.play.entryVariant = scene >= 3 ? (variant || (route === "B" ? "B_repair" : route)) : null;
    if (preserve) {
      state.play.log = old.log; state.play.materials = old.materials; state.play.comments = old.comments;
      for (let i = 1; i < scene; i++) state.play[`exit${i}`] = old[`exit${i}`];
    } else if (scene > 1) {
      const opening = scene >= 3 ? openingsForScene(scene-1)?.[state.play.entryVariant] : null;
      const title = opening ? opening.title : `直接以${routeNames[route]}进入第${scene}场`;
      state.play[`exit${scene-1}`] = {route, variant:state.play.entryVariant || route, title, summary:`从第${scene}场单路线样板开始。`};
      state.play.log.push({scene:scene-1,time:"入场",title:`第${scene}场单路线样板`,choice:"导控指定入口",work:"",feedback:title,role:"导控"});
    }
    addInitialComments(currentEvents()[0]);
    save(); location.hash = "#play"; render();
  }
  function currentEvents() {
    if (state.play.scene === 1) return DB.play.scene1;
    return DB.play[`scene${state.play.scene}`][state.play.route];
  }
  function currentEvent() {
    const event = currentEvents()[state.play.step];
    if (state.play.step === 0 && state.play.scene >= 3) {
      const opening = openingsForScene(state.play.scene-1)?.[state.play.entryVariant];
      if (opening) return {...event,time:opening.time,title:opening.title,story:opening.text};
    }
    return event;
  }
  function roleOptions() { return DB.roles.map(r=>`<option value="${r.id}" ${state.play.roleId===r.id?"selected":""}>${esc(r.name)}｜${esc(r.department)}</option>`).join(""); }
  function renderPlay() {
    if (!state.play.started) { renderPlaySetup(); return; }
    if (state.play.completed) { renderCompletion(); return; }
    const e = currentEvent(), role = roleById(state.play.roleId);
    const choices = e.choices || [];
    const selected = choices.find(c=>c.id===state.play.currentChoice);
    const task = (e.tasks && e.tasks[role.id]) || "关注协同频道，等待与本岗位相关的材料和任务。";
    const progress = Math.round(((state.play.step) / currentEvents().length) * 100);
    const heat = Math.min(99, 26 + state.play.log.filter(l=>l.choiceId).length*8 + state.play.log.filter(l=>["crisis","C"].includes(l.effect)).length*12);
    main.innerHTML = `<div class="play-status"><div class="play-status-left">${routeTag(state.play.scene===1?"A":state.play.route,state.play.scene===1?"第一场 · 路线待形成":`第${state.play.scene}场 · ${state.play.route}线`)}<span class="script-clock">${esc(e.time)}</span><span class="material-tag">${esc(e.title)}</span></div><span class="material-tag">事件 ${state.play.step+1} / ${currentEvents().length}</span></div>
      <div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div>
      <div class="play-grid"><section class="play-main"><div class="role-banner"><div class="role-identity"><span class="role-dot" style="background:${role.color}"></span><div><small>当前学员角色</small><select class="role-select" id="role-select" aria-label="切换学员角色">${roleOptions()}</select></div></div><span class="material-tag">${esc(role.person)}</span></div>
      <article class="current-event card"><div class="event-overline">${`SCENE 0${state.play.scene} / ${state.play.scene===1?"火起花园居":`${state.play.route}路线`}`}</div><h2>${esc(e.title)}</h2><p class="event-story">${esc(e.story)}</p>
        <div class="intel-box"><strong>${esc(role.name)}｜当前任务</strong><p>${esc(task)}<br><span class="form-help">角色情报：${esc(e.intel)}</span></p></div>
        ${choices.length ? `<div class="decision-panel"><h3>提交处置决策与实操作品</h3><div class="choice-list">${choices.map(c=>`<label class="choice-card ${state.play.currentChoice===c.id?"selected":""}"><input type="radio" name="decision-choice" value="${c.id}" ${state.play.currentChoice===c.id?"checked":""}><span><strong>${esc(c.label)}</strong><small>${esc(c.desc)}</small></span></label>`).join("")}</div>
          <div class="work-editor"><label class="form-label" for="work-input">${esc(e.workLabel || "处置工作记录")}<span>选项确定后可继续修改</span></label><textarea id="work-input" placeholder="请写明具体动作、协同对象、事实依据或完成时限…">${esc(state.play.work)}</textarea><div class="form-help">至少12个字。不同选择会留下不同剧情材料，并影响下一场。</div></div>
          <div class="decision-actions"><small>${selected?"已选择方案，提交后评论与剧情将即时反馈":"请先选择一项处置方案"}</small><button class="btn btn-primary" data-action="submit-decision" type="button" ${state.play.submitting?"disabled":""}>${state.play.submitting?"提交中…":`${icon("check")}提交并推进`}</button></div></div>` : `<div class="advance-panel"><small>接收事件与角色情报后，推进至首个决策点。</small><button class="btn btn-primary" data-action="advance-story" type="button">接收并推进${icon("arrow")}</button></div>`}
      </article></section>
      <aside class="comments-panel card"><div class="comments-header"><h3>模拟舆情评论</h3><span class="heat-meter">热度 ${heat} / 100</span></div><div class="comments-list">${state.play.comments.length?state.play.comments.slice().reverse().map((c,i)=>`<div class="comment ${i<2?"liked":""}"><div class="comment-meta"><span>${esc(c.author)}</span><time>${esc(c.time)}</time></div><p>${esc(c.text)}</p></div>`).join(""):`<div class="comment-empty">事件推进后，评论将在这里出现。</div>`}</div><div class="route-materials"><strong>本局已形成的剧情材料</strong><div class="material-list">${state.play.materials.length?state.play.materials.slice(-4).map(m=>`<span class="material-tag">${esc(m)}</span>`).join(""):`<span class="form-help">尚无材料</span>`}</div></div></aside></div>`;
  }
  function renderPlaySetup() {
    main.innerHTML = `<section class="page-intro"><div><div class="kicker">第一至第六场 / 全剧连续互动样板</div><h2>选择角色，进入你的处置路径</h2><p>可完整从第一场开始，也可由导控直接指定第二场入口。角色决定你看到的情报与任务，选择决定留下的剧情材料。</p></div></section>
      <div class="play-setup"><section class="setup-hero"><div class="kicker">18:57 / 花园居3栋爆燃</div><h2>火已经发生。<br>接下来，每一步都有下文。</h2><p>从火灾首报、媒体处置、数字发布和七线核查，到接访追采与公开发布，每场根据实际处置修复或升级，最终收敛到五种结局。</p><div class="setup-features"><div class="setup-feature"><b>多部门角色</b>八类角色情报与任务</div><div class="setup-feature"><b>选项＋作品</b>不是只猜标准答案</div><div class="setup-feature"><b>模拟评论</b>处置后立即获得反馈</div><div class="setup-feature"><b>连续分支</b>六场连续收束直达五种结局</div></div></section>
      <section class="setup-form card"><h3>演练设置</h3><div class="form-group"><label class="form-label" for="setup-role">学员角色</label><select class="select" id="setup-role">${roleOptions()}</select><div class="form-help">演练中也可切换角色，查看不同岗位任务。</div></div><div class="form-group"><label class="form-label" for="entry-route">第二场直接入口</label><select class="select" id="entry-route"><option value="A" ${state.play.entryRoute==="A"?"selected":""}>A｜常规媒体线</option><option value="B" ${state.play.entryRoute==="B"?"selected":""}>B｜删帖疑云线</option><option value="C" ${state.play.entryRoute==="C"?"selected":""}>C｜镜头对质线</option></select></div><div class="setup-summary"><div class="summary-line">${icon("check")}第一场不预设出口，由实际选择形成</div><div class="summary-line">${icon("check")}第二场可从第一场连续进入，也可单独验证</div></div><div class="action-row"><button class="btn btn-primary" data-action="start-scene1" type="button">${icon("play")}从第一场开始</button><button class="btn btn-ghost" data-action="start-scene2" type="button">直接进入第二场${icon("arrow")}</button></div></section></div>`;
  }

  async function submitDecision() {
    const e = currentEvent();
    if (!state.play.currentChoice) { toast("请先选择一项处置方案","error"); return; }
    const choice = e.choices.find(c=>c.id===state.play.currentChoice);
    state.play.work = document.getElementById("work-input")?.value || state.play.work;
    state.play.submitting = true; renderPlay();
    try {
      await API.submitDecision({scene:state.play.scene,eventId:e.id,roleId:state.play.roleId,choiceId:choice.id,work:state.play.work,workRequired:true});
      const role = roleById(state.play.roleId);
      state.play.log.push({scene:state.play.scene,route:state.play.route,time:e.time,title:e.title,choice:choice.label,choiceId:choice.id,work:state.play.work,feedback:choice.feedback,effect:choice.effect,role:role.name});
      if (choice.material && !state.play.materials.includes(choice.material)) state.play.materials.push(choice.material);
      (choice.comments || []).forEach(([author,text])=>state.play.comments.push({author,text,time:e.time}));
      state.play.submitting = false; state.play.currentChoice = null; state.play.work = "";
      if (state.play.step >= currentEvents().length - 1) completeScene(); else {
        state.play.step += 1; addInitialComments(currentEvent()); toast("处置已提交，剧情与评论已更新");
      }
      save(); renderPlay();
    } catch (err) {
      state.play.submitting = false; renderPlay(); toast(err.message || "提交失败，请检查内容","error");
    }
  }
  function advanceStory() {
    const e = currentEvent();
    state.play.log.push({scene:state.play.scene,route:state.play.route,time:e.time,title:e.title,choice:"接收事件与角色情报",work:"",feedback:e.story,role:roleById(state.play.roleId).name});
    state.play.step += 1; addInitialComments(currentEvent()); save(); renderPlay();
  }
  function completeScene() {
    const scene = state.play.scene;
    if (scene === 1) {
      const effects = state.play.log.filter(l=>l.scene===1 && l.effect).map(l=>l.effect);
      const route = effects.includes("C") ? "C" : effects.includes("B") ? "B" : "A";
      const content = {
        A:["稳控出口","首报、现场协同和家属承接基本成立，进入第二场常规媒体线。"],
        B:["信息失信出口","首报、删帖或部门分工留下信息信用问题，进入第二场删帖疑云线。"],
        C:["现场失控出口","现场行为或家属接待形成原始证据，进入第二场镜头对质线。"]
      }[route];
      state.play.exit1 = {route,title:content[0],summary:content[1]};
    } else if (scene <= 4) {
      const effects = state.play.log.filter(l=>l.scene===scene && l.effect).map(l=>l.effect);
      let variant;
      if (state.play.route === "A") variant = effects.includes("crisis") ? "C" : effects.includes("wound") ? "B_doubt" : "A";
      else if (state.play.route === "B") variant = effects.includes("crisis") ? "C" : effects.includes("wound") ? "B_doubt" : "B_repair";
      else variant = effects.includes("crisis") || effects.includes("wound") ? "C" : "B_repair";
      const opening = openingsForScene(scene)[variant];
      state.play[`exit${scene}`] = {route:opening.route,variant,title:opening.title,summary:`第${scene}场处置已形成新的第${scene+1}场进入局面。`};
    } else if (scene === 5) {
      const effects = state.play.log.filter(l=>l.scene===5 && l.effect).map(l=>l.effect);
      let variant;
      if (state.play.route === "C") variant = effects.includes("crisis") || effects.includes("wound") ? "D" : "C_supervision";
      else if (effects.includes("crisis")) variant = "D";
      else if (state.play.route === "A") variant = effects.includes("wound") ? "B_doubt" : "A";
      else if (state.play.entryVariant === "B_doubt" || effects.includes("wound")) variant = "B_doubt";
      else variant = "B_repair";
      const opening = openingsForScene(5)[variant];
      state.play.exit5 = {route:opening.route,variant,title:opening.title,summary:"第五场接访、追采与承诺兑现已形成第六场发布会版本。"};
    } else {
      const effects = state.play.log.filter(l=>l.scene===6 && l.effect).map(l=>l.effect);
      const crisis = effects.includes("crisis"), wound = effects.includes("wound");
      let endingId;
      if (state.play.route === "A") endingId = crisis ? "p4" : wound ? "p2" : "p1";
      else if (state.play.route === "B") endingId = crisis ? "p4" : state.play.entryVariant === "B_doubt" || wound ? "p3" : "p2";
      else if (state.play.route === "C") endingId = crisis || wound ? "p4" : "p5";
      else endingId = "p4";
      const path = DB.paths.find(p=>p.id===endingId), ending = path.nodes[6];
      state.play.exit6 = {route:state.play.route,variant:state.play.entryVariant || state.play.route,endingId,title:path.name,pathName:path.name,summary:ending.state,transition:ending.transition,material:ending.material};
    }
    state.play.completed = true; save();
  }
  function renderCompletion() {
    const scene = state.play.scene, exit = state.play[`exit${scene}`];
    if (scene === 6) {
      const path = DB.paths.find(p=>p.id===exit.endingId), ending = path.nodes[6];
      const receipts = Array.from({length:6},(_,i)=>({scene:i+1,receipt:state.play[`exit${i+1}`]})).filter(item=>item.receipt);
      main.innerHTML = `<section class="completion-hero"><div class="kicker">第六场收束 / 六场连续路径完成</div><h2>${esc(exit.title)}</h2><p>${esc(exit.summary)}</p><div class="action-row">${routeTag(exit.route,`结局 ${exit.endingId.slice(1)} / 05`)}<span class="material-tag">已记录 ${state.play.log.filter(l=>l.choiceId).length} 项决策</span><span class="material-tag">形成 ${state.play.materials.length} 份剧情材料</span></div></section>
        <div class="completion-grid"><section class="next-opening"><div class="opening-time">ENDING 0${exit.endingId.slice(1)} / 结局与余波</div><h3>${esc(ending.title)}</h3><p>${esc(path.summary)} ${esc(exit.transition)}</p><div class="material-list"><span class="material-tag">${esc(exit.material)}</span></div><div class="action-row"><button class="btn btn-primary" data-action="open-review" type="button">查看六场连续路径复盘${icon("arrow")}</button><button class="btn btn-ghost" data-action="restart-play" type="button">重新演练</button><button class="btn btn-ghost" data-action="open-map" type="button">返回全剧路径</button></div></section>
        <section class="next-opening"><h3>本次实际收束路径</h3><div class="material-list">${receipts.map(item=>`<span class="material-tag">第${item.scene}场 · ${esc(item.receipt.title)}</span>`).join("")}</div><div class="drawer-section"><h4>结局判定</h4><p>结局由第五场形成的发布会版本与第六场实际公开处置共同确定；旧材料和实操作品均保留在复盘时间线中。</p></div></section></div>`;
      return;
    }
    const isFirst = scene === 1;
    const sceneNames = ["一","二","三","四","五","六"], sceneName = sceneNames[scene-1], nextName = sceneNames[scene];
    const opening = !isFirst ? openingsForScene(scene)[exit.variant] : null;
    const continuity = {
      2:"第三场使用“火灭—数字确认—家属到场—滚动发布”的共同骨架，但旧材料、信用状态和家属任务已经不同。",
      3:"第四场使用七线核查共同骨架，但会区分历史口径是否对账、部门是否翻车以及家属是否继续被推转。",
      4:"第五场使用接访、三路追采和承诺兑现共同骨架，并区分常规、带伤、多路对质与聚集督办局面。",
      5:"第六场将按入口生成信任修复、带伤补救、集中认错、纠偏成果或对质问责版本，并最终收敛到五种结局。"
    };
    main.innerHTML = `<section class="completion-hero"><div class="kicker">第${sceneName}场收束${isFirst?"":" / 连续分支验证完成"}</div><h2>${esc(exit.title)}</h2><p>${esc(exit.summary)}</p><div class="action-row">${routeTag(exit.route)}<span class="material-tag">已记录 ${state.play.log.filter(l=>l.choiceId).length} 项决策</span><span class="material-tag">形成 ${state.play.materials.length} 份剧情材料</span></div></section>
      <div class="completion-grid"><section class="next-opening"><div class="opening-time">${isFirst?"NEXT / 第二场路线":esc(opening.time)}</div><h3>${isFirst?`进入第二场${exit.route}线`:`第${nextName}场入口已生成`}</h3><p>${isFirst?({A:"记者主要追问救援和采访秩序。公安与宣传需要完成规范接力，避免正常警戒演变为采访权冲突。",B:"记者已带着删帖截图、首报或官号旧口径到场。第二报不能只讲进展，必须同时承担信息纠错。",C:"原始视频当事人正在直播，记者要求看实际整改。只有先停止二次冲突，才能恢复基本对话。"}[exit.route]):esc(opening.text)}</p><div class="action-row"><button class="btn btn-primary" data-action="continue-scene" type="button">连续进入第${nextName}场${icon("arrow")}</button><button class="btn btn-ghost" data-action="open-map" type="button">返回全剧路径</button></div></section>
      <section class="next-opening"><h3>带入下一场的材料</h3><div class="material-list">${state.play.materials.length?state.play.materials.map(m=>`<span class="material-tag">${esc(m)}</span>`).join(""):`<span class="form-help">本局未形成额外材料</span>`}</div><div class="drawer-section"><h4>连续验证要点</h4><p>${isFirst?"下一场不是只替换热度，而会更换记者手中的材料、主责角色和任务。":continuity[scene]}</p></div><div class="action-row"><button class="btn btn-ghost" data-action="restart-play" type="button">重新演练</button></div></section></div>`;
  }

  function renderReview() {
    const p = state.play;
    if (!p.log.length) {
      main.innerHTML = `<div class="empty-state">${icon("clipboard")}<h3>尚无演练复盘记录</h3><p>完成第一场或从后续单场开始，系统会记录角色、选择、实操作品、剧情材料和路线收束。</p><button class="btn btn-primary" data-action="start-scene1" type="button">${icon("play")}开始第一场演练</button></div>`; return;
    }
    const latestExit = p.exit6 || p.exit5 || p.exit4 || p.exit3 || p.exit2 || p.exit1;
    main.innerHTML = `<section class="page-intro"><div><div class="kicker">实际走过路线 / 操作时间线</div><h2>每个后果，都能找到它的前因</h2><p>复盘不按错误数量结算，而按“事件—角色—选择—作品—材料—下一场”还原完整路径。</p></div><button class="btn btn-primary" data-action="restart-play" type="button">${icon("play")}重新演练</button></section>
      <div class="review-summary"><section class="route-receipt"><div class="kicker">CURRENT ROUTE</div><h2>${esc(latestExit?latestExit.title:"演练进行中")}</h2><div class="big-route">${latestExit?esc(latestExit.route):"—"} 路线</div><p>${esc(latestExit?latestExit.summary:`当前位于第${p.scene}场，尚未完成收束。`)}</p></section><section class="card card-pad"><h3>贯穿材料清单</h3><div class="material-list">${p.materials.length?p.materials.map(m=>`<span class="material-tag">${esc(m)}</span>`).join(""):`<span class="form-help">尚未形成剧情材料</span>`}</div><div class="drawer-section"><h4>复盘统计</h4><p>${p.log.filter(l=>l.choiceId).length}项处置决策 · ${p.comments.length}条模拟评论 · ${new Set(p.log.map(l=>l.role)).size}类参与角色</p></div></section></div>
      <section class="card card-pad"><div class="section-head"><div><h3>操作与剧情时间线</h3><p>实操作品保留原文，便于导控点评</p></div></div><div class="review-timeline">${p.log.slice().reverse().map(l=>`<article class="review-item"><time>第${l.scene}场 · ${esc(l.time)} · ${esc(l.role)}</time><h4>${esc(l.title)}</h4><p><strong>${esc(l.choice)}</strong></p>${l.work?`<div class="work-quote">${esc(l.work)}</div>`:""}<p>${esc(l.feedback)}</p></article>`).join("")}</div></section>`;
  }

  document.addEventListener("click", async event => {
    const el = event.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    if (a === "path-node") showPathNode(el.dataset.path, Number(el.dataset.index));
    else if (a === "close-drawer") closeDrawer();
    else if (a === "filter-path") { state.selectedPath = el.dataset.path; save(); renderMap(); }
    else if (a === "select-scene") { state.selectedScene = Number(el.dataset.scene); state.sceneRoute = "A"; save(); renderScene(); }
    else if (a === "select-route") { state.sceneRoute = el.dataset.route; save(); renderScene(); }
    else if (a === "open-scene") { state.selectedScene = Number(el.dataset.scene); state.sceneRoute = el.dataset.route; closeDrawer(); location.hash="#scene"; render(); }
    else if (a === "play-node") { const index=Number(el.dataset.index), route=pathRoute(el.dataset.path,index), variant=pathVariant(el.dataset.path,index); closeDrawer(); startPlay(index+1,route,false,variant); }
    else if (a === "start-scene1") startPlay(1,"A",false);
    else if (a === "start-scene2") startPlay(2,state.play.entryRoute,false);
    else if (a === "scene-play") startPlay(state.selectedScene,state.sceneRoute,false);
    else if (a === "advance-story") advanceStory();
    else if (a === "submit-decision") submitDecision();
    else if (a === "continue-scene") { const scene=state.play.scene, exit=state.play[`exit${scene}`]; startPlay(scene+1,exit.route,true,exit.variant || null); }
    else if (a === "restart-play") { state.play = freshPlay(); save(); location.hash="#play"; render(); }
    else if (a === "open-review") { location.hash="#review"; render(); }
    else if (a === "open-map") { location.hash="#map"; render(); }
    else if (a === "reload") location.reload();
  });
  document.addEventListener("change", event => {
    if (event.target.matches('input[name="decision-choice"]')) {
      const e = currentEvent(), choice = e.choices.find(c=>c.id===event.target.value);
      state.play.currentChoice = choice.id; state.play.work = choice.work || ""; save(); renderPlay();
    } else if (["role-select","setup-role"].includes(event.target.id)) {
      state.play.roleId = event.target.value; save(); renderPlay();
    } else if (event.target.id === "entry-route") {
      state.play.entryRoute = event.target.value; save();
    }
  });
  document.addEventListener("input", event => {
    if (event.target.id === "work-input") { state.play.work = event.target.value; save(); }
  });
  drawerBackdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", event => { if (event.key === "Escape") { closeDrawer(); resetModal.hidden = true; } });
  document.getElementById("reset-btn").addEventListener("click",()=>{resetModal.hidden=false;});
  document.getElementById("cancel-reset").addEventListener("click",()=>{resetModal.hidden=true;});
  document.getElementById("confirm-reset").addEventListener("click",async()=>{
    await API.resetPrototype(); state.play=freshPlay(); save(); resetModal.hidden=true; toast("演练进度已重置"); if(currentView()==="play"||currentView()==="review")render();
  });
  window.addEventListener("hashchange", render);

  restore();
  if (!location.hash) history.replaceState(null,"","#map");
  API.fetchBlueprint().then(()=>{state.ready=true;render();}).catch(err=>{
    main.innerHTML=`<div class="empty-state">${icon("alert")}<h3>剧本数据加载失败</h3><p>${esc(err.message)}</p><button class="btn btn-primary" data-action="reload" type="button">重新加载</button></div>`;
  });
})();
