const { createHash } = require("node:crypto");
const { getGameConfig } = require("./gameConfig");
const { getControl } = require("../../runtime/game-controls");

const games = {
  crash: {
    table: "crash",
    ledger: "crash",
    name: "Crash",
    start: "g.startedAt",
    end: "g.endedAt",
    created: "g.createdAt",
  },
  roulette: {
    table: "roulette",
    ledger: "roulette",
    name: "Roulette",
    start: "g.rolledAt",
    end: "g.endedAt",
    created: "g.createdAt",
  },
  mines: {
    table: "mines",
    ledger: "mines",
    name: "Mines",
    start: "l.createdAt",
    end: "g.endedAt",
    created: "l.createdAt",
  },
  blackjack: {
    table: "blackjack",
    ledger: "blackjack",
    name: "Blackjack",
    start: "l.createdAt",
    end: "g.endedAt",
    created: "l.createdAt",
  },
  battles: {
    table: "battles",
    ledger: "battle",
    name: "Case battles",
    start: "g.startedAt",
    end: "g.endedAt",
    created: "g.createdAt",
  },
  coinflip: {
    table: "coinflips",
    ledger: "coinflip",
    name: "Coinflip",
    start: "g.startedAt",
    end: "g.startedAt",
    created: "l.createdAt",
  },
  cases: {
    table: "caseOpenings",
    ledger: "case",
    name: "Case opening",
    start: "l.createdAt",
    end: "l.createdAt",
    created: "l.createdAt",
    instant: true,
  },
  slots: {
    table: "bets",
    ledger: "slot",
    name: "Provider slots",
    start: "g.createdAt",
    end: "CASE WHEN g.completed = 1 THEN g.createdAt ELSE NULL END",
    created: "g.createdAt",
    provider: true,
  },
};
const ms = (value) => (value ? new Date(value).valueOf() : 0);
const json = (value, fallback = []) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value || fallback;
  } catch {
    return fallback;
  }
};
const error = (code, status = 400) =>
  Object.assign(new Error(code), { code, status });
function definition(game) {
  if (!Object.hasOwn(games, game)) throw error("INVALID_GAME");
  return games[game];
}
function ledgerSource(game) {
  const d = definition(game);
  if (game === "crash" || game === "roulette")
    return `SELECT b.*, r.roundId FROM bets b JOIN ${game}Bets r ON r.id = b.gameId WHERE b.game = '${d.ledger}'`;
  return `SELECT b.*, ${game === "slots" ? "b.id" : "b.gameId"} AS roundId FROM bets b WHERE b.game = '${d.ledger}'`;
}
function baseSql(game, activeOnly = false) {
  const d = definition(game);
  const ledger = ledgerSource(game);
  const conditions = [
    ...(d.provider ? ["g.game = 'slot'"] : []),
    ...(activeOnly
      ? [
          d.instant ? "FALSE" : "(" + d.end + ") IS NULL",
          "c.cancelledAt IS NULL",
        ]
      : []),
  ];
  const phase =
    game === "roulette"
      ? `CASE WHEN g.rolledAt IS NOT NULL AND EXTRACT(EPOCH FROM (NOW()-g.rolledAt))*1000 >= COALESCE(CAST(CAST(rr.config AS jsonb)->>'rollTime' AS numeric),5000) THEN 'RESOLVING' WHEN g.rolledAt IS NOT NULL THEN 'RUNNING' ELSE 'BETTING' END`
      : game === "crash"
        ? `CASE WHEN ${d.start} IS NOT NULL THEN 'RUNNING' ELSE 'BETTING' END`
        : game === "coinflip"
          ? "CASE WHEN g.fire IS NOT NULL AND g.ice IS NOT NULL THEN 'STARTING' ELSE 'WAITING' END"
          : game === "battles"
            ? "CASE WHEN g.startedAt IS NOT NULL THEN 'RUNNING' WHEN (SELECT COUNT(*) FROM battlePlayers p WHERE p.battleId = g.id) >= g.teams*g.playersPerTeam THEN 'STARTING' ELSE 'WAITING' END"
            : d.provider
              ? "'PAYING'"
              : "'RUNNING'";
  let exposure = "COALESCE(l.wagered-l.paid,0)";
  if (game === "crash")
    exposure = `COALESCE((SELECT SUM(LEAST(b.amount*EXP(0.00006*LEAST(300000,GREATEST(0,EXTRACT(EPOCH FROM (NOW()-COALESCE(g.startedAt,NOW())))*1000))),b.amount+COALESCE(CAST(CAST(rr.config AS jsonb)->>'maxProfit' AS numeric),1000000),COALESCE(CAST(CAST(rr.config AS jsonb)->>'maxPayout' AS numeric),50000))) FROM (${ledger}) b WHERE b.roundId = g.id AND b.completed = 0),0)`;
  if (game === "roulette")
    exposure =
      "COALESCE((SELECT GREATEST(SUM(CASE WHEN r.color = 0 THEN r.amount*14 ELSE 0 END),SUM(CASE WHEN r.color = 1 THEN r.amount*COALESCE(CAST(CAST(rr.config AS jsonb)->'multipliers'->>'1' AS numeric),2) WHEN r.color = 3 THEN r.amount*7 ELSE 0 END),SUM(CASE WHEN r.color = 2 THEN r.amount*COALESCE(CAST(CAST(rr.config AS jsonb)->'multipliers'->>'2' AS numeric),2) WHEN r.color = 3 THEN r.amount*7 ELSE 0 END)) FROM rouletteBets r WHERE r.roundId = g.id),0)";
  if (game === "mines")
    exposure = `g.amount*CASE WHEN jsonb_array_length(CAST(COALESCE(g.revealedTiles,'[]') AS jsonb)) = 0 THEN 1 ELSE (1-${Number(getGameConfig("mines", "houseEdge", 7.5)) / 100})*EXP(COALESCE((SELECT SUM(LN((25.0-t.n)/(25.0-g.minesCount-t.n))) FROM generate_series(0,jsonb_array_length(CAST(COALESCE(g.revealedTiles,'[]') AS jsonb))-1) AS t(n) WHERE 25-g.minesCount-t.n>0),0)) END`;
  return `SELECT '${game}' AS game, g.id, ${d.created} AS createdAt, ${d.start} AS startedAt, ${d.end} AS endedAt,
        CASE WHEN c.cancelledAt IS NOT NULL THEN 'CANCELLED' WHEN ${d.end} IS NOT NULL THEN 'COMPLETED' WHEN c.pausedAt IS NOT NULL THEN 'PAUSED' WHEN c.locked = 1 THEN 'LOCKED' ELSE ${phase} END AS state,
        COALESCE(l.players,0) AS playerCount, COALESCE(l.connected,0) AS connectedPlayers, COALESCE(l.wagered,0) AS wagered, COALESCE(l.paid,0) AS paid,
        COALESCE(l.pending,0) AS pendingBets, CASE WHEN ${d.end} IS NOT NULL OR c.cancelledAt IS NOT NULL THEN 0 ELSE ${exposure} END AS exposure,
        COALESCE(c.revision,0) AS revision, c.pausedAt, c.locked, c.cancelledAt, COALESCE(c.updatedAt,${d.start},${d.created}) AS updatedAt,
        h.nodeId, h.updatedAt AS heartbeatAt, h.errorCode,
        ${game === "battles" ? "g.round" : "1"} AS currentRound, ${game === "mines" ? "g.revealedTiles" : game === "blackjack" ? "g.actions" : "'0'"} AS stateFingerprint
        FROM ${d.table} g LEFT JOIN LATERAL (SELECT roundId, MIN(createdAt) AS createdAt, COUNT(DISTINCT userId) AS players, COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM gameOperationPresence p WHERE p.userId = lb.userId AND p.lastSeen > DATE_SUB(NOW(), INTERVAL 45 SECOND)) THEN userId ELSE NULL END) AS connected, SUM(amount) AS wagered, SUM(winnings) AS paid, SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN completed = 0 THEN amount ELSE 0 END) AS unsettled FROM (${ledger}) lb WHERE lb.roundId = g.id GROUP BY roundId) l ON TRUE
        LEFT JOIN gameOperationControls c ON c.game = '${game}' AND c.gameId = g.id
        LEFT JOIN gameRoundRules rr ON rr.game = '${game}' AND rr.gameId = g.id
        LEFT JOIN gameOperationHealth h ON h.game = '${game}' ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}`;
}
function version(row) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        row.game,
        String(row.id),
        row.state,
        row.revision,
        row.wagered,
        row.paid,
        row.pendingBets,
        row.currentRound,
        row.stateFingerprint,
        ms(row.updatedAt),
      ]),
    )
    .digest("hex")
    .slice(0, 24);
}
function normalize(row) {
  const runtime = Math.max(
    0,
    (ms(row.endedAt || row.cancelledAt) || Date.now()) -
      ms(row.startedAt || row.createdAt),
  );
  const active = !["COMPLETED", "CANCELLED"].includes(row.state);
  const engineGame = ["crash", "roulette", "battles", "coinflip"].includes(
    row.game,
  );
  const stalled =
    active &&
    !["PAUSED", "WAITING", "LOCKED"].includes(row.state) &&
    engineGame &&
    runtime >
      { crash: 360000, roulette: 90000, battles: 600000, coinflip: 90000 }[
        row.game
      ];
  return {
    ...row,
    version: version(row),
    runtime,
    health:
      row.errorCode && active
        ? "error"
        : stalled
          ? "stalled"
          : active
            ? "healthy"
            : "complete",
    exposure: Math.round(Math.max(0, Number(row.exposure)) * 100) / 100,
    exposureType:
      row.game === "crash" || row.game === "mines"
        ? "Current cash-out value"
        : row.game === "roulette"
          ? "Largest outcome payout"
          : "Unsettled stakes",
    payoutStatus:
      row.state === "CANCELLED"
        ? "refunded"
        : games[row.game].instant || Number(row.pendingBets) === 0
          ? "settled"
          : row.state === "COMPLETED"
            ? "review"
            : "pending",
    multiplier:
      row.game === "crash" && row.state === "RUNNING"
        ? Math.floor(100 * Math.exp(0.00006 * Math.min(runtime, 300000))) / 100
        : null,
  };
}
async function listGames(connection, filters = {}) {
  const needsAttention = `(x.state NOT IN ('COMPLETED','CANCELLED') AND (x.errorCode IS NOT NULL OR (x.state NOT IN ('PAUSED','WAITING','LOCKED') AND x.game IN ('crash','roulette','battles','coinflip') AND EXTRACT(EPOCH FROM (NOW()-COALESCE(x.startedAt,x.createdAt)))*1000 > CASE x.game WHEN 'crash' THEN 360000 WHEN 'battles' THEN 600000 ELSE 90000 END)))`;
  const selected = filters.game ? [filters.game] : Object.keys(games);
  selected.forEach(definition);
  const params = [];
  const where = [];
  const search = String(filters.search || "")
    .trim()
    .slice(0, 80);
  if (filters.view !== "recent" && filters.view !== "all")
    where.push("x.state NOT IN ('COMPLETED','CANCELLED')");
  else if (filters.view === "recent" && !/^\d+$/.test(search)) {
    where.push("(x.createdAt >= ? OR x.endedAt IS NULL)");
    params.push(new Date(Date.now() - 7 * 86400000));
  }
  if (filters.state) {
    where.push("x.state = ?");
    params.push(String(filters.state).toUpperCase());
  }
  if (filters.node) {
    where.push("x.nodeId = ?");
    params.push(String(filters.node).slice(0, 64));
  }
  if (search) {
    const checks = selected.map(
      (game) =>
        `(x.game = '${game}' AND EXISTS (SELECT 1 FROM (${ledgerSource(game)}) lb JOIN users u ON u.id = lb.userId WHERE lb.roundId = x.id AND (LOWER(u.username) LIKE ? OR CAST(u.id AS TEXT) = ?)))`,
    );
    where.push(`(CAST(x.id AS TEXT) = ? OR ${checks.join(" OR ")})`);
    params.push(search);
    for (const game of selected)
      params.push("%" + search.toLowerCase() + "%", search);
  }
  if (filters.health === "error") where.push(needsAttention);
  const union = selected
    .map((game) =>
      baseSql(game, filters.view !== "recent" && filters.view !== "all"),
    )
    .join(" UNION ALL ");
  const query = `FROM (${union}) x ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
  const [[summary]] = await connection.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(x.wagered),0) AS wagered, COALESCE(SUM(x.exposure),0) AS exposure, COALESCE(SUM(x.playerCount),0) AS seats, SUM(CASE WHEN ${needsAttention} THEN 1 ELSE 0 END) AS errors ` +
      query,
    params,
  );
  const order =
    {
      time: "createdAt",
      wager: "wagered",
      exposure: "exposure",
      players: "playerCount",
    }[filters.sort] || "createdAt";
  const limit = Math.min(
    50,
    Math.max(1, Math.floor(Number(filters.limit) || 25)),
  );
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number(filters.page) || 1)),
  );
  const [rows] = await connection.query(
    `SELECT x.* ${query} ORDER BY x.${order} DESC NULLS LAST, x.id DESC, x.game LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );
  const [health] = await connection.query(
    "SELECT game, nodeId, updatedAt, errorCode, failedAt FROM gameOperationHealth",
  );
  const [gates] = await connection.query(
    "SELECT game, locked, revision FROM gameOperationControls WHERE gameId = 0",
  );
  const [[online]] = await connection.query(
    "SELECT COUNT(DISTINCT userId) AS players FROM gameOperationPresence WHERE lastSeen > ?",
    [new Date(Date.now() - 45000)],
  );
  return {
    success: true,
    serverTime: Date.now(),
    data: rows.map(normalize),
    summary: { ...summary, onlinePlayers: online.players },
    page,
    limit,
    health,
    gates,
    catalogue: Object.entries(games).map(([game, d]) => ({
      game,
      name: d.name,
      mode: d.provider
        ? "Provider managed"
        : d.instant
          ? "Atomic opening"
          : "Stateful game",
    })),
  };
}
async function getGame(connection, game, id) {
  definition(game);
  if (!/^\d+$/.test(String(id))) throw error("INVALID_GAME_ID");
  const [[row]] = await connection.query(
    `SELECT x.* FROM (${baseSql(game)}) x WHERE x.id = ?`,
    [id],
  );
  if (!row) throw error("GAME_NOT_FOUND", 404);
  return normalize(row);
}
async function detail(connection, game, id) {
  const info = await getGame(connection, game, id);
  const d = definition(game);
  const [[raw]] = await connection.query(
    `SELECT * FROM ${d.table} WHERE id = ?`,
    [id],
  );
  const [bets] = await connection.query(
    `SELECT b.id, b.userId, u.username, u.role, b.amount, b.winnings, b.completed, b.createdAt, CASE WHEN EXISTS (SELECT 1 FROM gameOperationPresence p WHERE p.userId = b.userId AND p.lastSeen > ?) THEN 1 ELSE 0 END AS connected FROM (${ledgerSource(game)}) b JOIN users u ON u.id = b.userId WHERE b.roundId = ? ORDER BY b.id LIMIT 250`,
    [new Date(Date.now() - 45000), id],
  );
  const facts = {};
  if (game === "roulette") {
    const [[stored]] = await connection.query(
      "SELECT config FROM gameRoundRules WHERE game = ? AND gameId = ?",
      [game, id],
    );
    const rules = json(stored?.config, {});
    facts.bettingClosesAt = new Date(
      ms(raw.createdAt) + (rules.betTime || 10000),
    );
    facts.spinEndsAt = raw.rolledAt
      ? new Date(ms(raw.rolledAt) + (rules.rollTime || 5000))
      : null;
    facts.result =
      raw.rolledAt && !info.cancelledAt
        ? raw.result
        : "Hidden until betting closes";
    facts.spinDuration = rules.rollTime || 5000;
    const [positions] = await connection.query(
      "SELECT color, SUM(amount) AS amount, COUNT(*) AS bets FROM rouletteBets WHERE roundId = ? GROUP BY color",
      [id],
    );
    facts.positions = positions;
  }
  if (game === "mines") {
    facts.mineCount = raw.minesCount;
    facts.selectedTiles = json(raw.revealedTiles);
    facts.multiplier = info.wagered ? info.exposure / info.wagered : 0;
    facts.cashout = raw.endedAt ? raw.payout : "Available to player";
  }
  if (game === "crash") {
    const [cashouts] = await connection.query(
      "SELECT userId, amount, autoCashoutPoint, cashoutPoint FROM crashBets WHERE roundId = ? ORDER BY id LIMIT 250",
      [id],
    );
    facts.cashouts = cashouts;
    facts.crashPoint =
      raw.endedAt && !info.cancelledAt
        ? raw.crashPoint
        : "Hidden until round ends";
  }
  if (game === "battles") {
    facts.round = raw.round;
    facts.teams = raw.teams;
    facts.playersPerTeam = raw.playersPerTeam;
    facts.mode = raw.gamemode;
    facts.randomness = raw.randomTicket
      ? "RANDOM.ORG committed draw"
      : "EOS committed block";
    const [rounds] = await connection.query(
      "SELECT round, caseVersionId FROM battleRounds WHERE battleId = ? ORDER BY round",
      [id],
    );
    facts.rounds = rounds;
  }
  if (game === "coinflip") {
    facts.fire = raw.fire;
    facts.ice = raw.ice;
    facts.committedBlock = raw.EOSBlock;
    facts.winner = raw.winnerSide || "Not resolved";
  }
  if (game === "blackjack") {
    facts.actions = json(raw.actions);
    facts.payout = raw.payout;
    facts.engine = "Legacy API; no player-facing table";
  }
  if (game === "cases") facts.caseVersion = raw.caseVersionId;
  if (game === "slots")
    facts.engine = "Provider settlement; intervention is disabled";
  if (raw.serverSeed)
    facts.seedCommitment = createHash("sha256")
      .update(raw.serverSeed)
      .digest("hex");
  const [audit] = await connection.query(
    "SELECT a.id, a.adminId, u.username, a.action, a.stateBefore, a.stateAfter, a.parameters, a.success, a.errorCode, a.createdAt FROM gameOperationAudit a LEFT JOIN users u ON u.id = a.adminId WHERE a.game = ? AND a.gameId = ? ORDER BY a.id DESC LIMIT 50",
    [game, id],
  );
  const events = [
    { type: "Game created", at: info.createdAt },
    { type: "Round started", at: info.startedAt },
    {
      type: info.cancelledAt ? "Cancelled and refunded" : "Round completed",
      at: info.cancelledAt || info.endedAt,
    },
    ...bets.map((b) => ({
      type: "Bet accepted #" + b.id,
      at: b.createdAt,
      userId: b.userId,
    })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => ms(b.at) - ms(a.at));
  return {
    ...info,
    bets,
    facts,
    events,
    audit: audit.map((a) => ({
      ...a,
      stateBefore: json(a.stateBefore, {}),
      stateAfter: json(a.stateAfter, {}),
      parameters: json(a.parameters, {}),
    })),
    participantsTruncated: bets.length === 250,
    control: await getControl(connection, game, id),
  };
}
module.exports = {
  games,
  definition,
  ledgerSource,
  getGame,
  detail,
  listGames,
  error,
  json,
  ms,
};
