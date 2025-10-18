import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, createPoolAndEnsure, __setTestPool } from "./Server.js";

let pool;

beforeAll(async () => {
  // initialize DB pool for tests
  pool = await createPoolAndEnsure();
  __setTestPool(pool);
});

afterAll(async () => {
  if (pool && pool.end) await pool.end();
});

describe("Health endpoint", () => {
  it("GET / should return running message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Auth server is running");
  });
});

async function signupAndSignin(
  email,
  password = "pw123456",
  name = "Test User"
) {
  const signup = await request(app)
    .post("/api/auth/signup")
    .send({ email, password, name });
  // if already exists, continue to signin
  expect([201, 409]).toContain(signup.status);
  const signin = await request(app)
    .post("/api/auth/signin")
    .send({ email, password });
  expect(signin.status).toBe(200);
  return signin.body;
}

describe("Auth and protected routes", () => {
  it("signs up and signs in resident, accesses protected", async () => {
    const { token, user } = await signupAndSignin(
      `resident_${Date.now()}@user.com`
    );
    expect(user.role).toBe("Resident");
    const ok = await request(app)
      .get("/api/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(ok.status).toBe(200);
    const bad = await request(app)
      .get("/api/protected")
      .set("Authorization", "Bearer badtoken");
    expect(bad.status).toBe(401);
  });
});

describe("Schedules", () => {
  it("resident can create and list schedules; collector cannot create", async () => {
    const resident = await signupAndSignin(`res_${Date.now()}@user.com`);
    const body = {
      type: "recycling",
      scheduled_at: new Date().toISOString(),
      time_label: "09:00 AM",
    };
    const created = await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${resident.token}`)
      .send(body);
    expect(created.status).toBe(201);
    const list = await request(app)
      .get("/api/schedules")
      .set("Authorization", `Bearer ${resident.token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const collector = await signupAndSignin(`col_${Date.now()}@collector.com`);
    const denied = await request(app)
      .post("/api/schedules")
      .set("Authorization", `Bearer ${collector.token}`)
      .send(body);
    expect(denied.status).toBe(403);
  });
});

// Risini Budara
describe("Special collection requests and payments", () => {
  it("resident creates payable request, pays it, and sees payments", async () => {
    const resident = await signupAndSignin(`pay_${Date.now()}@user.com`);
    const payload = {
      item_type: "Electronics",
      preferred_date: new Date().toISOString(),
      preferred_time_label: "11:30 AM",
      estimated_cost: 25.5,
    };
    const created = await request(app)
      .post("/api/collections/request")
      .set("Authorization", `Bearer ${resident.token}`)
      .send(payload);
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("PendingPayment");

    const pay = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ request_id: created.body.id, amount: 25.5, currency: "USD" });
    expect(pay.status).toBe(201);

    const payments = await request(app)
      .get("/api/payments")
      .set("Authorization", `Bearer ${resident.token}`);
    expect(payments.status).toBe(200);
    expect(Array.isArray(payments.body)).toBe(true);
  });
});

describe("Role-based endpoints", () => {
  it("authority can list all requests and assign a collector", async () => {
    const authority = await signupAndSignin(`adm_${Date.now()}@admin.com`);
    const resident = await signupAndSignin(`r_${Date.now()}@user.com`);
    const collector = await signupAndSignin(`c_${Date.now()}@collector.com`);
    // resident creates a request
    const reqCreate = await request(app)
      .post("/api/collections/request")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ item_type: "Yard Waste", estimated_cost: 0 });
    expect(reqCreate.status).toBe(201);
    // authority lists all
    const all = await request(app)
      .get("/api/collections/requests")
      .set("Authorization", `Bearer ${authority.token}`);
    expect(all.status).toBe(200);
    expect(Array.isArray(all.body)).toBe(true);
    // assign collector
    const assign = await request(app)
      .post(`/api/collections/request/${reqCreate.body.id}/assign`)
      .set("Authorization", `Bearer ${authority.token}`)
      .send({ collector_id: collector.user.id });
    expect(assign.status).toBe(200);
  });

  it("collectors endpoint accessible to allowed roles", async () => {
    const authority = await signupAndSignin(`adm2_${Date.now()}@admin.com`);
    const list = await request(app)
      .get("/api/collectors")
      .set("Authorization", `Bearer ${authority.token}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
  });
});
