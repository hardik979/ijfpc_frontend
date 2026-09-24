"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import {
  bindAttendanceSocket,
  createAttendanceSocket,
  type AttendanceUpdatedPayload,
} from "@/lib/attendanceRealtime";

export function useAttendanceRealtime(
  refetch: () => void,
  options: {
    enabled?: boolean;
    shouldRefetch?: (payload: AttendanceUpdatedPayload) => boolean;
  } = {},
) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const refetchRef = useRef(refetch);
  const predicateRef = useRef(options.shouldRefetch);

  useEffect(() => {
    refetchRef.current = refetch;
    predicateRef.current = options.shouldRefetch;
  }, [options.shouldRefetch, refetch]);

  useEffect(() => {
    if (options.enabled === false || !isLoaded || !isSignedIn) return;

    const socket = createAttendanceSocket(() => getToken());
    if (!socket) return;

    const unbind = bindAttendanceSocket(
      socket,
      () => refetchRef.current(),
      (payload) => predicateRef.current?.(payload) ?? true,
    );
    socket.connect();

    return () => {
      unbind();
      socket.disconnect();
    };
  }, [getToken, isLoaded, isSignedIn, options.enabled]);
}
