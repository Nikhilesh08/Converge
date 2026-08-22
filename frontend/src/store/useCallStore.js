import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

let peerConnection = null;
let localStream = null;
let dataChannel = null;
let pendingIceCandidates = [];
let globalCallTimeoutId = null;

export const useCallStore = create((set, get) => ({
  callState: "idle",
  callerInfo: null,
  remoteStream: null,
  localStream: null,
  screenStream: null,
  isMicOn: true,
  isVideoOn: true,
  callStartTime: null,
  isCallAccepted: false,
  isRemoteSharingScreen: false,

  initWebRTCListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }

    socket.off("callUser");
    socket.off("callRinging");
    socket.off("callAccepted");
    socket.off("iceCandidate");
    socket.off("callEnded");
    socket.off("userSharingScreen");

    socket.on("callUser", async ({ signal, from, name, profilePic }) => {
      set({
        callState: "ringing",
        callerInfo: {
          id: from,
          _id: from,
          name,
          fullName: name,
          profilePic,
          signal,
        },
      });

      if (
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(`Incoming video call from ${name}`, {
          icon: profilePic || "/avatar.png",
          body: "Click to answer",
          requireInteraction: true,
        });
      }
    });

    socket.on("callRinging", () => {
      if (get().callState === "calling") {
        set({ callState: "ringing" });
      }
    });

    socket.on("callAccepted", async (signal) => {
      if (globalCallTimeoutId) clearTimeout(globalCallTimeoutId);

      set({
        callState: "active",
        isCallAccepted: true,
        callStartTime: Date.now(),
      });

      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(signal),
        );

        pendingIceCandidates.forEach((candidate) => {
          if (peerConnection.signalingState !== "closed") {
            peerConnection
              .addIceCandidate(new RTCIceCandidate(candidate))
              .catch((e) => console.error("Ignored stale ICE candidate", e));
          }
        });
        pendingIceCandidates = [];
      }
    });

    socket.on("iceCandidate", async (candidate) => {
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ice candidate", error);
        }
      } else {
        pendingIceCandidates.push(candidate);
      }
    });

    socket.on("userSharingScreen", ({ sharing }) => {
      set({ isRemoteSharingScreen: sharing });
    });

    socket.on("callEnded", () => {
      if (globalCallTimeoutId) clearTimeout(globalCallTimeoutId);
      get().endCall(false);
    });
  },

  setupPeerConnection: (partnerId, isInitiator) => {
    const socket = useAuthStore.getState().socket;

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];

    if (import.meta.env.VITE_TURN_URL) {
      iceServers.push({
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_PASSWORD,
      });
    }

    peerConnection = new RTCPeerConnection({ iceServers });

    if (localStream) {
      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
    }

    peerConnection.ontrack = (event) => {
      set({ remoteStream: event.streams[0] });
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          to: partnerId,
          candidate: event.candidate,
        });
      }
    };

    if (isInitiator) {
      dataChannel = peerConnection.createDataChannel("fileTransfer");
      get().setupDataChannel(dataChannel);
    } else {
      peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        get().setupDataChannel(dataChannel);
      };
    }
  },

  setupDataChannel: (channel) => {
    channel.onmessage = (event) => {
      const blob = new Blob([event.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Converge_Transfer_File";
      a.click();
      toast.success("Received a P2P file!");
    };
  },

  startCall: async (targetUser) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    const onlineUsers = useAuthStore.getState().onlineUsers;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const isTargetOnline = onlineUsers.includes(targetUser._id);

      set({
        localStream,
        callState: isTargetOnline ? "ringing" : "calling",
        callerInfo: targetUser,
        isMicOn: true,
        isVideoOn: true,
        isCallAccepted: false,
        callStartTime: null,
        isRemoteSharingScreen: false,
      });

      if (globalCallTimeoutId) clearTimeout(globalCallTimeoutId);
      globalCallTimeoutId = setTimeout(() => {
        const currentState = get().callState;
        if (currentState === "calling" || currentState === "ringing") {
          get().endCall(true, "cancelled");
          toast.error("No answer");
        }
      }, 30000);

      pendingIceCandidates = [];
      get().setupPeerConnection(targetUser._id, true);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("callUser", {
        userToCall: targetUser._id,
        signalData: offer,
        from: authUser._id,
        name: authUser.fullName,
      });
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera/microphone");
      set({ callState: "idle" });
    }
  },

  answerCall: async () => {
    const socket = useAuthStore.getState().socket;
    const { callerInfo } = get();

    if (globalCallTimeoutId) clearTimeout(globalCallTimeoutId);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      set({
        localStream,
        callState: "active",
        isMicOn: true,
        isVideoOn: true,
        isCallAccepted: true,
        callStartTime: Date.now(),
        isRemoteSharingScreen: false,
      });

      get().setupPeerConnection(callerInfo.id || callerInfo._id, false);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(callerInfo.signal),
      );

      pendingIceCandidates.forEach((candidate) => {
        if (peerConnection && peerConnection.signalingState !== "closed") {
          peerConnection
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch((e) => console.error("Ignored stale ICE candidate", e));
        }
      });
      pendingIceCandidates = [];

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answerCall", {
        signal: answer,
        to: callerInfo.id || callerInfo._id,
      });
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera/microphone");
    }
  },

  toggleMic: () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        set({ isMicOn: audioTrack.enabled });
      }
    }
  },

  toggleVideo: () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        set({ isVideoOn: videoTrack.enabled });
      }
    }
  },

  toggleScreenShare: async () => {
    const socket = useAuthStore.getState().socket;
    const { callerInfo, screenStream } = get();
    const partnerId = callerInfo?.id || callerInfo?._id;

    try {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);

        set({ screenStream: null });
        if (socket && partnerId)
          socket.emit("shareScreen", { to: partnerId, sharing: false });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = stream.getVideoTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);

        set({ screenStream: stream });
        if (socket && partnerId)
          socket.emit("shareScreen", { to: partnerId, sharing: true });

        screenTrack.onended = () => {
          const videoTrack = localStream.getVideoTracks()[0];
          const sender = peerConnection
            .getSenders()
            .find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
          set({ screenStream: null });
          if (socket && partnerId)
            socket.emit("shareScreen", { to: partnerId, sharing: false });
        };
      }
    } catch (error) {
      toast.error("Screen sharing cancelled or failed");
    }
  },

  endCall: (emitEvent = true, forcedStatus = null) => {
    const socket = useAuthStore.getState().socket;
    const {
      callerInfo,
      screenStream,
      callStartTime,
      isCallAccepted,
      callState,
    } = get();

    if (globalCallTimeoutId) clearTimeout(globalCallTimeoutId);

    let callDuration = 0;
    let callLogStatus = forcedStatus || "missed";

    if (!forcedStatus) {
      if (isCallAccepted && callStartTime) {
        callDuration = Math.floor((Date.now() - callStartTime) / 1000);
        callLogStatus = "completed";
      } else if (callState === "calling" || callState === "ringing") {
        callLogStatus = "cancelled";
      }
    }

    if (emitEvent && callerInfo) {
      const partnerId = callerInfo.id || callerInfo._id;
      socket.emit("endCall", { to: partnerId });
      socket.emit("createCallLog", {
        to: partnerId,
        status: callLogStatus,
        duration: callDuration,
      });
    }

    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (screenStream) screenStream.getTracks().forEach((track) => track.stop());
    if (peerConnection) {
      peerConnection.close();
    }

    peerConnection = null;
    localStream = null;
    dataChannel = null;
    pendingIceCandidates = [];

    set({
      callState: "idle",
      remoteStream: null,
      localStream: null,
      screenStream: null,
      callerInfo: null,
      callStartTime: null,
      isCallAccepted: false,
      isRemoteSharingScreen: false,
    });
  },

  sendP2PFile: (file) => {
    if (!dataChannel || dataChannel.readyState !== "open") {
      toast.error("You must be in an active video call to send direct files");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      dataChannel.send(e.target.result);
      toast.success("File sent directly to peer!");
    };
    reader.readAsArrayBuffer(file);
  },
}));
