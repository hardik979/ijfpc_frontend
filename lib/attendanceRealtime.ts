import { io, type Socket } from "socket.io-client";

export const ATTENDANCE_UPDATED_EVENT = "attendance:updated";

export type AttendanceUpdatedPayload = {
  employeeId: string;
  clerkId: string | null;
  email: string | null;
  dateKey: string;
  punchCount: number;
  firstIn: string | null;
  lastOut: string | null;
  workedMinutes: number | null;
};

type AttendanceSocket = Pick<Socket, "on" | "off">;

export function bindAttendanceSocket(
  socket: AttendanceSocket,
  refetch: () => void,
  shouldRefetch: (payload: AttendanceUpdatedPayload) => boolean = () => true,
) {
  let connectedOnce = false;

  const onConnect = () => {
    if (connectedOnce) refetch();
    connectedOnce = true;
  };
  const onAttendanceUpdated = (payload: AttendanceUpdatedPayload) => {
    if (shouldRefetch(payload)) refetch();
  };

  socket.on("connect", onConnect);
  socket.on(ATTENDANCE_UPDATED_EVENT, onAttendanceUpdated);

  return () => {
    socket.off("connect", onConnect);
    socket.off(ATTENDANCE_UPDATED_EVENT, onAttendanceUpdated);
  };
}

export function createAttendanceSocket(getToken: () => Promise<string | null>) {
  const backendUrl = String(process.env.NEXT_PUBLIC_LMS_URL || "").trim();
  if (!backendUrl) return null;

  return io(backendUrl.replace(/\/$/, ""), {
    autoConnect: false,
    reconnection: true,
    transports: ["websocket", "polling"],
    auth: async (callback) => {
      try {
        callback({ token: await getToken() });
      } catch {
        callback({ token: null });
      }
    },
  });
}
