import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

let peerConnection = null;
let localStream = null;
let dataChannel = null;

export const useCallStore = create((set, get) => ({
  callState: "idle",
  callerInfo: null,
  remoteStream: null,
  localStream: null,
  screenStream: null,

  // NEW: State for our hardware controls
  isMicOn: true,
  isVideoOn: true,

  initWebRTCListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("callUser", async ({ signal, from, name }) => {
      set({ callState: "ringing", callerInfo: { id: from, name, signal } });
    });

    socket.on("callAccepted", (signal) => {
      set({ callState: "active" });
      if (peerConnection)
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    });

    socket.on("iceCandidate", (candidate) => {
      if (peerConnection)
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("callEnded", () => {
      get().endCall(false);
      toast("Call ended");
    });
  },

  setupPeerConnection: (partnerId, isInitiator) => {
    const socket = useAuthStore.getState().socket;

    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // TURN relay fallback: required when STUN can't punch through
        // (symmetric NAT, corporate/school wifi, most cloud hosting).
        // Replace with your own TURN credentials (e.g. Metered, Twilio, coturn).
        {
          urls: import.meta.env.VITE_TURN_URL || "turn:openrelay.metered.ca:80",
          username: import.meta.env.VITE_TURN_USERNAME || "openrelayproject",
          credential: import.meta.env.VITE_TURN_CREDENTIAL || "openrelayproject",
        },
      ],
    });

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

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // NEW: Reset mic/video state when starting a new call
      set({
        localStream,
        callState: "calling",
        callerInfo: targetUser,
        isMicOn: true,
        isVideoOn: true,
      });

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
      toast.error("Could not access camera/microphone");
      set({ callState: "idle" });
    }
  },

  answerCall: async () => {
    const socket = useAuthStore.getState().socket;
    const { callerInfo } = get();

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // NEW: Reset mic/video state when answering
      set({ localStream, callState: "active", isMicOn: true, isVideoOn: true });

      get().setupPeerConnection(callerInfo.id, false);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(callerInfo.signal),
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answerCall", { signal: answer, to: callerInfo.id });
    } catch (error) {
      toast.error("Could not access camera/microphone");
    }
  },

  // NEW: Call Control Functions
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
    try {
      const { screenStream } = get();

      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);

        set({ screenStream: null });
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

        screenTrack.onended = () => {
          const videoTrack = localStream.getVideoTracks()[0];
          const sender = peerConnection
            .getSenders()
            .find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
          set({ screenStream: null });
        };
      }
    } catch (error) {
      toast.error("Screen sharing cancelled or failed");
    }
  },

  endCall: (emitEvent = true) => {
    const socket = useAuthStore.getState().socket;
    const { callerInfo, screenStream } = get();

    if (emitEvent && callerInfo) {
      socket.emit("endCall", { to: callerInfo.id || callerInfo._id });
    }

    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (screenStream) screenStream.getTracks().forEach((track) => track.stop());
    if (peerConnection) peerConnection.close();

    peerConnection = null;
    localStream = null;
    dataChannel = null;

    set({
      callState: "idle",
      remoteStream: null,
      localStream: null,
      screenStream: null,
      callerInfo: null,
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
