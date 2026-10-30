window.API = (() => {
  const delay = (ms = 350) => new Promise(resolve => setTimeout(resolve, ms));

  // TODO: replace with GET /api/prototype/blueprint returning the same DB-shaped data.
  async function fetchBlueprint() {
    await delay(260);
    if (!window.DB) throw new Error("剧本数据未加载");
    return { code: 0, data: window.DB };
  }

  // TODO: replace with POST /api/exercises/:id/decisions; payload contains scene, event, role, choice and work.
  async function submitDecision(payload) {
    await delay(480);
    if (!payload.choiceId) throw new Error("请先选择处置方案");
    if (payload.workRequired && (!payload.work || payload.work.trim().length < 12)) {
      throw new Error("实操作品过短，请补充具体动作、协同对象或时限");
    }
    return { code: 0, data: { accepted: true, submittedAt: new Date().toISOString(), payload } };
  }

  // TODO: replace with POST /api/exercises/:id/reset when a real exercise service exists.
  async function resetPrototype() {
    await delay(220);
    return { code: 0, data: { reset: true } };
  }

  return { fetchBlueprint, submitDecision, resetPrototype };
})();
