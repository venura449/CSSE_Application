import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createPoolAndEnsure, __setTestPool } from "./Server.js";

let pool;

//Sign up and sign in helper
async function signupAndSignin(email, password = "pw123456", name = "User") {
  const signup = await request(app)
    .post("/api/auth/signup")
    .send({ email, password, name });
  expect([201, 409]).toContain(signup.status);
  const signin = await request(app)
    .post("/api/auth/signin")
    .send({ email, password });
  expect(signin.status).toBe(200);
  return signin.body;
}

beforeAll(async () => {
  pool = await createPoolAndEnsure();
  __setTestPool(pool);
});

afterAll(async () => {
  if (pool && pool.end) await pool.end();
});

describe("Middleware and role guards", () => {
  it("rejects missing token", async () => {
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(401);
  });
});

// Risini Budara
describe("Collections and schedules listing by role", () => {
  it("resident sees own schedules; authority sees all; collector sees filtered", async () => {
    const resident = await signupAndSignin(`rlist_${Date.now()}@user.com`);
    const authority = await signupAndSignin(`alist_${Date.now()}@admin.com`);
    const collector = await signupAndSignin(
      `clist_${Date.now()}@collector.com`
    );
    // Resident creates a couple schedules
    await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({
        type: "general",
        scheduled_at: new Date().toISOString(),
        time_label: "10:00",
      });
    await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({
        type: "recycling",
        scheduled_at: new Date().toISOString(),
        time_label: "11:00",
      });
    const rSched = await request(app)
      .get("/api/collections")
      .set("Authorization", `Bearer ${resident.token}`);
    expect(rSched.status).toBe(200);
    const aSched = await request(app)
      .get("/api/collections")
      .set("Authorization", `Bearer ${authority.token}`);
    expect(aSched.status).toBe(200);
    const cSched = await request(app)
      .get("/api/collections")
      .set("Authorization", `Bearer ${collector.token}`);
    expect(cSched.status).toBe(200);
  });
});

//Risini Budara
describe("Edit/Delete collection requests edge cases", () => {
  it("forbids non-owner edit; prevents deleting paid; allows owner delete pending", async () => {
    const owner = await signupAndSignin(`owner_${Date.now()}@user.com`);
    const other = await signupAndSignin(`other_${Date.now()}@user.com`);
    // create payable request as owner then pay it
    const created = await request(app)
      .post("/api/collections/request")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        item_type: "Furniture",
        estimated_cost: 10,
        preferred_date: new Date().toISOString(),
      });
    expect(created.status).toBe(201);
    // other user cannot edit
    const forbid = await request(app)
      .put(`/api/collections/request/${created.body.id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ item_type: "Electronics" });
    expect(forbid.status).toBe(403);
    // pay the request
    const pay = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ request_id: created.body.id, amount: 10, currency: "USD" });
    expect(pay.status).toBe(201);
    // cannot edit a paid request
    const noedit = await request(app)
      .put(`/api/collections/request/${created.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ item_type: "Changed" });
    expect(noedit.status).toBe(400);
    // create a free request (not requiring payment)
    const freeReq = await request(app)
      .post("/api/collections/request")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ item_type: "Electronics", estimated_cost: 0 });
    expect(freeReq.status).toBe(201);
    // delete it successfully
    const del = await request(app)
      .delete(`/api/collections/request/${freeReq.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(del.status).toBe(200);
  });
});

describe("Delete schedule endpoint", () => {
  it("collector cannot delete schedule; owner can; 404 when not found", async () => {
    const owner = await signupAndSignin(`sdel_${Date.now()}@user.com`);
    const collector = await signupAndSignin(
      `sdelc_${Date.now()}@collector.com`
    );
    const create = await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        type: "organic",
        scheduled_at: new Date().toISOString(),
        time_label: "13:00",
      });
    expect(create.status).toBe(201);
    // collector forbidden
    const forbid = await request(app)
      .delete(`/api/schedules/${create.body.id || "noid"}`)
      .set("Authorization", `Bearer ${collector.token}`);
    expect(forbid.status).toBe(403);
    // owner delete
    const ok = await request(app)
      .delete(`/api/schedules/${create.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(ok.status).toBe(200);
    // deleting again should 404
    const notFound = await request(app)
      .delete(`/api/schedules/${create.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(notFound.status).toBe(404);
  });
});

//Risini Budara
describe("Payments listing by role", () => {
  it("authority sees all payments; resident sees own", async () => {
    const authority = await signupAndSignin(`pp_${Date.now()}@admin.com`);
    const resident = await signupAndSignin(`pp_${Date.now()}@user.com`);
    // create payable request and pay to ensure there's at least one record
    const created = await request(app)
      .post("/api/collections/request")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ item_type: "Electronics", estimated_cost: 10 });
    await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ request_id: created.body.id, amount: 10, currency: "USD" });
    const ra = await request(app)
      .get("/api/payments")
      .set("Authorization", `Bearer ${resident.token}`);
    expect(ra.status).toBe(200);
    const aa = await request(app)
      .get("/api/payments")
      .set("Authorization", `Bearer ${authority.token}`);
    expect(aa.status).toBe(200);
  });
});




