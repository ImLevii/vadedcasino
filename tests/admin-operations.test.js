const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { io } = require("socket.io-client");

test(
  "admin operations enforce permissions, stale-state checks, atomic refunds, idempotency, audit and realtime authorization",
  { timeout: 60000 },
  async (t) => {
    const reservation = net.createServer().listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((r) => reservation.close(r));
    const secret = "operations-test-secret-longer-than-thirty-two-characters";
    const child = spawn(process.execPath, ["tests/fixtures/postgres-app.cjs"], {
      env: {
        ...process.env,
        VERCEL: "1",
        OPERATIONS_TEST: "1",
        NODE_ENV: "production",
        PORT: String(port),
        SQL_DIALECT: "postgres",
        DATABASE_URL: "postgres://test:test@localhost/test",
        JWT_SECRET: secret,
        COINPAYMENTS_KEY: "",
        COINPAYMENTS_SECRET: "",
        MEXC_API_KEY: "",
        MEXC_API_SECRET: "",
        DISCORD_BOT_TOKEN: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (c) => {
        output += c;
        if (process.env.DEBUG_TEST) process.stdout.write(c);
      });
    t.after(async () => {
      if (child.exitCode === null) {
        child.kill();
        await once(child, "exit");
      }
    });
    const origin = "http://127.0.0.1:" + port;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(origin + "/readyz")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const tokens = new Map();
    const token = (id) => {
      if (!tokens.has(id))
        tokens.set(id, jwt.sign({ uid: String(id) }, secret));
      return tokens.get(id);
    };
    const request = async (path, actor = 1, body) => {
      const r = await fetch(origin + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          authorization: token(actor),
          "content-type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { ...(await r.json()), httpStatus: r.status };
    };
    const detail = async (game, id, actor = 1) => {
      const r = await request("/admin/operations/" + game + "/" + id, actor);
      assert.equal(r.success, true, JSON.stringify(r) + " " + output);
      return r.data;
    };
    const action = (d, command, actor = 1, extra = {}) =>
      request("/admin/operations/action", actor, {
        game: d.game,
        id: d.id,
        version: d.version,
        action: command,
        reason: "Isolated verification request",
        requestId: randomUUID(),
        ...extra,
      });
    assert.equal((await request("/admin/operations")).error, "2FA_REQUIRED");
    for (const id of [1, 3, 4])
      assert.equal((await request("/admin/2fa", id, {})).success, true, output);
    assert.equal((await request("/admin/2fa", 5, {})).error, "INVALID_2FA");
    const code = require("speakeasy").totp({
      secret: "JBSWY3DPEHPK3PXP",
      encoding: "base32",
    });
    await new Promise((r) => setTimeout(r, 350));
    assert.equal(
      (await request("/admin/2fa", 5, { token: code })).success,
      true,
      output,
    );
    assert.equal((await request("/admin/dashboard", 4)).httpStatus, 403);
    const readOnly = await detail("mines", 901, 4);
    assert.equal(readOnly.wagered, null);
    assert.deepEqual(readOnly.actions, []);
    assert.equal(readOnly.bets[0].amount, null);
    const recoveryRounds = await (await fetch(origin + '/__test/operations-recovery')).json();
    for (const [kind, payout] of [
      ["crash", 12],
      ["roulette", 10],
    ]) {
      const overdue = await detail(kind, recoveryRounds[kind]);
      const beforeBalance = Number((await request("/user/balance")).balance);
      const recoveryId = randomUUID();
      const recovered = await action(overdue, "recover", 1, {
        requestId: recoveryId,
      });
      assert.equal(
        recovered.success,
        true,
        JSON.stringify(recovered) + " " + output,
      );
      assert.equal((await detail(kind, recoveryRounds[kind])).state, "COMPLETED");
      assert.equal(
        (await action(overdue, "recover", 1, { requestId: recoveryId }))
          .replayed,
        true,
      );
      assert.equal(
        Number((await request("/user/balance")).balance),
        beforeBalance + payout,
        "Recovery pays each committed round once",
      );
    }
    const initial = await detail("mines", 901);
    assert.equal(initial.wagered, 10);
    assert.equal(initial.facts.selectedTiles.length, 0);
    assert.ok(!JSON.stringify(initial).includes('"mines":'));
    assert.equal(
      (await action(initial, "cancel_refund", 4)).error,
      "FORBIDDEN",
    );
    assert.equal((await action(initial, "pause")).success, true, output);
    assert.equal((await action(initial, "resume")).error, "STALE_GAME_STATE");
    assert.equal(
      (await request("/mines/reveal", 1, { field: 1 })).error,
      "BETTING_LOCKED",
    );
    const paused = await detail("mines", 901);
    assert.equal(paused.state, "PAUSED");
    assert.equal((await action(paused, "resume")).success, true, output);
    let game = await detail("mines", 901);
    const balance = Number((await request("/user")).balance),
      requestId = randomUUID();
    const duplicates = await Promise.all([
      action(game, "cancel_refund", 1, { requestId }),
      action(game, "cancel_refund", 1, { requestId }),
    ]);
    assert.ok(
      duplicates.every((r) => r.success),
      JSON.stringify(duplicates) + " " + output,
    );
    assert.equal(duplicates.filter((r) => r.replayed).length, 1);
    assert.equal(
      Number((await request("/user")).balance),
      balance + 10,
      "A duplicate refund may credit once only",
    );
    const refunded = await detail("mines", 901);
    assert.equal(refunded.state, "CANCELLED");
    assert.equal(refunded.bets[0].winnings, 10);
    assert.equal(refunded.bets[0].completed, 1);
    assert.equal(
      (await action(refunded, "cancel_refund")).error,
      "ACTION_NOT_AVAILABLE",
    );
    assert.equal(
      (await action(game, "cancel_refund", 3, { requestId })).error,
      "IDEMPOTENCY_CONFLICT",
    );
    assert.equal((await request("/mines")).activeGame, false);
    game = await detail("mines", 902);
    assert.equal(
      (await action(game, "cancel_refund")).error,
      "USE_SAFE_CASHOUT",
    );
    const safe = await action(game, "cashout");
    assert.equal(safe.success, true, JSON.stringify(safe) + " " + output);
    const cashed = await detail("mines", 902);
    assert.equal(cashed.state, "COMPLETED");
    assert.equal(cashed.bets[0].winnings, 10.1);
    game = await detail("mines", 903);
    assert.equal((await action(game, "cancel_refund")).error, "ACTION_FAILED");
    const failed = await detail("mines", 903);
    assert.equal(failed.state, "RUNNING");
    assert.equal(failed.bets[0].completed, 0);
    assert.equal(failed.bets[0].winnings, 0);
    assert.equal((await request("/user", 6)).balance, 100);
    assert.equal(failed.audit[0].success, 0);
    const flip = await request("/coinflip/create", 3, {
      side: "fire",
      amount: 4,
    });
    assert.equal(flip.success, true, JSON.stringify(flip) + " " + output);
    game = await detail("coinflip", flip.coinflip.id);
    const raced = await Promise.all([
      action(game, "cancel_refund", 1),
      action(game, "cancel_refund", 3),
    ]);
    assert.equal(
      raced.filter((r) => r.success).length,
      1,
      JSON.stringify(raced),
    );
    assert.ok(raced.some((r) => r.error === "STALE_GAME_STATE"));
    const cancelled = await detail("coinflip", game.id);
    assert.equal(cancelled.state, "CANCELLED");
    await new Promise((r) => setTimeout(r, 350));
    assert.equal(
      (await request("/coinflip/" + game.id + "/join", 1, {})).error,
      "GAME_CANCELLED",
    );
    const list = await request(
      "/admin/operations?game=mines&view=all&search=Refund",
    );
    assert.equal(list.success, true, JSON.stringify(list));
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].id, 903);
    assert.equal(
      (await request("/admin/operations?health=error")).success,
      true,
    );
    const gate = (await request("/admin/operations?game=mines")).gates.find(
      (g) => g.game === "mines",
    );
    assert.equal(
      (
        await action(
          { game: "mines", id: 0, version: String(gate.revision) },
          "lock",
        )
      ).success,
      true,
      output,
    );
    assert.equal(
      (await request("/mines/start", 1, { amount: 1, minesCount: 1 })).error,
      "BETTING_LOCKED",
    );
    const updatedGate = (
      await request("/admin/operations?game=mines")
    ).gates.find((g) => g.game === "mines");
    assert.equal(
      (
        await action(
          { game: "mines", id: 0, version: String(updatedGate.revision) },
          "unlock",
        )
      ).success,
      true,
    );
    const settings = await request("/admin/games/settings");
    const probability = await request("/admin/games/probability");
    assert.equal(probability.data.roulette.colors[1].houseEdge, "6.7%");
    assert.equal(probability.data.blackjack.edgeValue, "New bets disabled");
    const save = {
      values: { betTime: 2000 },
      version: settings.versions.crash,
      reason: "Verify atomic settings save",
      requestId: randomUUID(),
    };
    assert.equal(
      (await request("/admin/games/settings/crash", 1, save)).success,
      true,
      output,
    );
    assert.equal(
      (await request("/admin/games/settings/crash", 1, save)).replayed,
      true,
    );
    assert.equal(
      (
        await request("/admin/games/settings/crash", 1, {
          ...save,
          values: { betTime: 3000 },
        })
      ).error,
      "IDEMPOTENCY_CONFLICT",
    );
    assert.equal(
      (
        await request("/admin/games/settings/crash", 1, {
          ...save,
          reason: "A different admin intention",
        })
      ).error,
      "IDEMPOTENCY_CONFLICT",
    );
    assert.equal(
      (
        await request("/admin/games/settings/crash", 1, {
          ...save,
          requestId: randomUUID(),
        })
      ).error,
      "STALE_GAME_STATE",
    );
    assert.equal(
      (
        await request("/admin/games/settings/mines", 1, {
          ...save,
          values: { houseEdge: 8 },
          version: settings.versions.mines,
          requestId: randomUUID(),
        })
      ).error,
      "ACTIVE_GAMES_USE_SETTINGS",
    );
    assert.equal(
      (await request("/admin/games/settings/crash", 4, save)).httpStatus,
      403,
    );
    const audit = await request("/admin/operations/audit");
    assert.ok(
      audit.data.some((a) => a.action === "settings_update" && a.success),
    );
    assert.ok(audit.data.some((a) => a.errorCode === "STALE_GAME_STATE"));
    assert.ok(audit.data.some((a) => a.errorCode === "FORBIDDEN"));
    const socket = io(origin, {
      transports: ["websocket"],
      autoConnect: false,
    });
    t.after(() => socket.disconnect());
    socket.connect();
    await once(socket, "connect");
    assert.equal(
      (await socket.timeout(5000).emitWithAck("admin:operations", {})).error,
      "2FA_REQUIRED",
    );
    let auth = once(socket, "auth");
    socket.emit("auth", token(1));
    await auth;
    await new Promise((r) => setTimeout(r, 1550));
    const live = await socket.timeout(5000).emitWithAck("admin:operations", {
      game: "mines",
      selected: { game: "mines", id: 903 },
    });
    assert.equal(live.success, true, JSON.stringify(live) + " " + output);
    assert.equal(live.selected.id, 903);
    socket.emit("presence:heartbeat");
    await new Promise((r) => setTimeout(r, 1550));
    const present = await socket
      .timeout(5000)
      .emitWithAck("admin:operations", {});
    assert.ok(present.summary.onlinePlayers >= 1);
    auth = once(socket, "auth");
    socket.emit("auth", token(2));
    await auth;
    await new Promise((r) => setTimeout(r, 1550));
    assert.equal(
      (await socket.timeout(5000).emitWithAck("admin:operations", {})).error,
      "2FA_REQUIRED",
    );
  },
);
