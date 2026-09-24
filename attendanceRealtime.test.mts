import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTENDANCE_UPDATED_EVENT,
  bindAttendanceSocket,
  type AttendanceUpdatedPayload,
} from "./lib/attendanceRealtime.ts";

class FakeSocket {
  listeners = new Map<string, Set<(...args: never[]) => void>>();

  on(event: string, listener: (...args: never[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(listener);
    return this;
  }

  off(event: string, listener: (...args: never[]) => void) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  fire(event: string, ...args: never[]) {
    for (const listener of this.listeners.get(event) || []) listener(...args);
  }
}

const payload = (employeeId = "9"): AttendanceUpdatedPayload => ({
  employeeId,
  clerkId: "clerk_9",
  email: "staff@example.com",
  dateKey: "2026-09-22",
  punchCount: 2,
  firstIn: "2026-09-22T05:00:00.000Z",
  lastOut: "2026-09-22T12:30:00.000Z",
  workedMinutes: 450,
});

test("attendance update refetches the matching dashboard and cleanup unbinds it", () => {
  const socket = new FakeSocket();
  let refetches = 0;
  const unbind = bindAttendanceSocket(
    socket as never,
    () => { refetches++; },
    (update) => update.employeeId === "9",
  );

  socket.fire(ATTENDANCE_UPDATED_EVENT, payload("20") as never);
  socket.fire(ATTENDANCE_UPDATED_EVENT, payload("9") as never);
  assert.equal(refetches, 1);

  unbind();
  socket.fire(ATTENDANCE_UPDATED_EVENT, payload("9") as never);
  assert.equal(refetches, 1);
});

test("initial connection does not duplicate the mount fetch; reconnect refetches", () => {
  const socket = new FakeSocket();
  let refetches = 0;
  bindAttendanceSocket(socket as never, () => { refetches++; });

  socket.fire("connect");
  assert.equal(refetches, 0);
  socket.fire("connect");
  assert.equal(refetches, 1);
});
