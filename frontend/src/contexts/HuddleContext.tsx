import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { getUnifiedWebSocket } from '@/utils/unifiedWebSocket';
import type {
  HuddleSignalEvent,
  ChatHuddleParticipantsEvent,
} from '@/utils/unifiedWebSocket';
import { useGetIceServersQuery } from '@/services/chatApi';
import {
  setHuddleParticipants,
  selectRoomHuddleParticipants,
} from '@/features/unifiedChatSlice';

interface HuddleContextType {
  isHuddleActive: boolean;
  huddleChatId: number | null;
  startHuddle: (chatId: number) => Promise<void>;
  stopHuddle: () => void;
  remoteStreams: Array<{ userId: number; stream: MediaStream }>;
  connectionDetails: Record<number, any>;
}

const HuddleContext = createContext<HuddleContextType | undefined>(undefined);

export function useHuddle() {
  const context = useContext(HuddleContext);
  if (!context) {
    throw new Error('useHuddle must be used within a HuddleProvider');
  }
  return context;
}

function HiddenHuddleAudio({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline />;
}

export function HuddleProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const [huddleChatId, setHuddleChatId] = useState<number | null>(null);
  const user = useAppSelector(state => state.auth.user);
  const accessToken = useAppSelector(state => state.auth.accessToken);

  // We need to access the participants of the *huddle chat*, not necessarily the active chat.
  const huddleParticipants = useAppSelector(state =>
    huddleChatId ? selectRoomHuddleParticipants(state, huddleChatId) : []
  );

  const { data: iceServers } = useGetIceServersQuery();

  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<
    Array<{ userId: number; stream: MediaStream }>
  >([]);
  const [connectionDetails, setConnectionDetails] = useState<
    Record<number, any>
  >({});
  const huddleJoinTimeRef = useRef<number>(0);

  const refreshRemoteStreams = useCallback(() => {
    setRemoteStreams(
      Array.from(remoteStreamsRef.current.entries()).map(
        ([userId, stream]) => ({ userId, stream })
      )
    );
  }, []);

  // Listen for huddle participants from unified WebSocket
  useEffect(() => {
    const ws = getUnifiedWebSocket();
    const handleParticipants = (event: ChatHuddleParticipantsEvent) => {
      // Only process events for the active huddle room
      if (huddleChatId && event.room_id === huddleChatId) {
        dispatch(
          setHuddleParticipants({
            roomId: huddleChatId,
            participants: event.participants,
          })
        );
      }
    };
    const unsubscribe = ws.on('chat.huddle_participants', handleParticipants);
    return () => {
      unsubscribe();
    };
  }, [huddleChatId, dispatch]);

  const prevStatsRef = useRef<
    Map<number, { bytesSent: number; bytesReceived: number; timestamp: number }>
  >(new Map());

  const checkConnectionStats = useCallback(
    async (pc: RTCPeerConnection, peerId: number) => {
      try {
        const stats = await pc.getStats();
        let activePair: any = null;
        const candidatePairs: any[] = [];
        let audioInbound: any = null;
        let audioOutbound: any = null;
        let transportStats: any = null;

        stats.forEach(report => {
          if (report.type === 'transport') {
            transportStats = report;
            if (report.selectedCandidatePairId) {
              activePair = stats.get(report.selectedCandidatePairId);
            }
          }
          if (report.type === 'candidate-pair') {
            const local = stats.get(report.localCandidateId);
            const remote = stats.get(report.remoteCandidateId);
            candidatePairs.push({
              id: report.id,
              state: report.state,
              selected: report.selected,
              nominated: report.nominated,
              priority: report.priority,
              bytesSent: report.bytesSent,
              bytesReceived: report.bytesReceived,
              currentRoundTripTime: report.currentRoundTripTime,
              availableOutgoingBitrate: report.availableOutgoingBitrate,
              local: local
                ? {
                    type: local.candidateType,
                    protocol: local.protocol,
                    address: `${local.address || local.ip}:${local.port}`,
                    url: local.url,
                    networkType: local.networkType,
                    priority: local.priority,
                  }
                : null,
              remote: remote
                ? {
                    type: remote.candidateType,
                    protocol: remote.protocol,
                    address: `${remote.address || remote.ip}:${remote.port}`,
                    priority: remote.priority,
                  }
                : null,
            });
          }
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            audioInbound = {
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter,
              bytesReceived: report.bytesReceived,
              codec: report.codecId ? stats.get(report.codecId) : null,
              timestamp: report.timestamp,
            };
          }
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            audioOutbound = {
              packetsSent: report.packetsSent,
              bytesSent: report.bytesSent,
              targetBitrate: report.targetBitrate,
              codec: report.codecId ? stats.get(report.codecId) : null,
              timestamp: report.timestamp,
            };
          }
        });

        if (!activePair) {
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.selected) {
              activePair = report;
            }
          });
        }

        // Calculate bitrates
        const prevStats = prevStatsRef.current.get(peerId);
        const now = Date.now();
        let bitrateIn = 0;
        let bitrateOut = 0;

        if (activePair && prevStats) {
          const timeDiff = (now - prevStats.timestamp) / 1000;
          if (timeDiff > 0) {
            bitrateIn =
              ((activePair.bytesReceived - prevStats.bytesReceived) * 8) /
              timeDiff /
              1000; // kbps
            bitrateOut =
              ((activePair.bytesSent - prevStats.bytesSent) * 8) /
              timeDiff /
              1000; // kbps
          }
        }

        if (activePair) {
          prevStatsRef.current.set(peerId, {
            bytesSent: activePair.bytesSent || 0,
            bytesReceived: activePair.bytesReceived || 0,
            timestamp: now,
          });
        }

        if (activePair) {
          const localCandidate = stats.get(activePair.localCandidateId);
          const remoteCandidate = stats.get(activePair.remoteCandidateId);
          let type = 'Unknown';
          let connectionPath = 'unknown';

          const localType = localCandidate?.candidateType;
          const remoteType = remoteCandidate?.candidateType;

          if (localType === 'relay' || remoteType === 'relay') {
            type = 'TURN Relay';
            connectionPath = 'relay';
            if (
              localCandidate?.url?.includes('twilio') ||
              remoteCandidate?.url?.includes('twilio')
            ) {
              type = 'Twilio TURN';
            }
          } else if (localType === 'host' && remoteType === 'host') {
            type = 'Direct (LAN)';
            connectionPath = 'direct';
          } else if (
            localType === 'srflx' ||
            remoteType === 'srflx' ||
            localType === 'prflx' ||
            remoteType === 'prflx'
          ) {
            connectionPath = 'stun';
            if (localCandidate?.url) {
              if (localCandidate.url.includes('google')) type = 'Google STUN';
              else if (localCandidate.url.includes('twilio'))
                type = 'Twilio STUN';
              else type = 'STUN NAT Traversal';
            } else {
              type = 'NAT Traversal (P2P)';
            }
          } else {
            type = `${localType} ↔ ${remoteType}`;
          }

          // Calculate packet loss percentage
          const packetLossPercent =
            audioInbound && audioInbound.packetsReceived > 0
              ? ((audioInbound.packetsLost || 0) /
                  (audioInbound.packetsReceived +
                    (audioInbound.packetsLost || 0))) *
                100
              : 0;

          // Determine connection quality
          const rtt = activePair.currentRoundTripTime
            ? activePair.currentRoundTripTime * 1000
            : null;
          let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
          if (rtt !== null) {
            if (rtt > 300 || packetLossPercent > 5) quality = 'poor';
            else if (rtt > 150 || packetLossPercent > 2) quality = 'fair';
            else if (rtt > 50 || packetLossPercent > 0.5) quality = 'good';
          }

          setConnectionDetails(prev => ({
            ...prev,
            [peerId]: {
              type,
              connectionPath,
              quality,
              activePair: {
                local: localCandidate,
                remote: remoteCandidate,
                rtt,
                bytesSent: activePair.bytesSent,
                bytesReceived: activePair.bytesReceived,
                availableOutgoingBitrate: activePair.availableOutgoingBitrate,
              },
              audio: {
                inbound: audioInbound,
                outbound: audioOutbound,
                packetLossPercent,
              },
              bitrate: {
                in: Math.round(bitrateIn * 10) / 10,
                out: Math.round(bitrateOut * 10) / 10,
              },
              transport: transportStats,
              candidatePairs,
              timestamp: now,
            },
          }));
        }
      } catch (e) {
        console.error('Error checking stats:', e);
      }
    },
    []
  );

  // Poll for stats updates (1 second for smooth real-time display)
  useEffect(() => {
    if (!isHuddleActive) return;
    const interval = setInterval(() => {
      peersRef.current.forEach((pc, peerId) => {
        if (pc.connectionState === 'connected') {
          checkConnectionStats(pc, peerId);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isHuddleActive, checkConnectionStats]);

  const ensurePeerConnection = useCallback(
    (peerId: number, initiator: boolean) => {
      if (peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId)!;
      }
      const pc = new RTCPeerConnection({
        iceServers: iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peersRef.current.set(peerId, pc);

      const ws = getUnifiedWebSocket();

      pc.onicecandidate = event => {
        if (event.candidate) {
          ws.sendHuddleSignal(peerId, {
            type: 'candidate',
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = event => {
        remoteStreamsRef.current.set(peerId, event.streams[0]);
        refreshRemoteStreams();
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          checkConnectionStats(pc, peerId);
        }
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          pc.close();
          peersRef.current.delete(peerId);
          remoteStreamsRef.current.delete(peerId);
          refreshRemoteStreams();
          setConnectionDetails(prev => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach(track => pc.addTrack(track, localStreamRef.current!));
      }

      if (initiator) {
        (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.sendHuddleSignal(peerId, {
            type: 'offer',
            sdp: offer,
          });
        })();
      }

      return pc;
    },
    [iceServers, refreshRemoteStreams, checkConnectionStats]
  );

  const startHuddle = useCallback(
    async (chatId: number) => {
      if (isHuddleActive) return;
      if (!user || !accessToken) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        localStreamRef.current = stream;
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
        }

        // Join huddle via unified WebSocket (no separate connection needed)
        const ws = getUnifiedWebSocket();
        ws.joinHuddle(chatId);

        setIsHuddleActive(true);
        setHuddleChatId(chatId);
        huddleJoinTimeRef.current = Date.now();
      } catch (error) {
        console.error('❌ Failed to start huddle:', error);
        alert('Failed to access microphone.');
      }
    },
    [isHuddleActive, user, accessToken]
  );

  const stopHuddle = useCallback(() => {
    if (isHuddleActive) {
      const ws = getUnifiedWebSocket();
      ws.leaveHuddle();
    }
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    refreshRemoteStreams();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    setIsHuddleActive(false);
    setHuddleChatId(null);
  }, [isHuddleActive, refreshRemoteStreams]);

  const handleHuddleSignal = useCallback(
    async (event: HuddleSignalEvent) => {
      if (!isHuddleActive || !user) return;
      const { from, payload } = event;
      if (!payload || from.id === user.id) return;
      const pc = ensurePeerConnection(from.id, false);
      if (!pc) return;
      if (payload.type === 'offer' && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getUnifiedWebSocket().sendHuddleSignal(from.id, {
          type: 'answer',
          sdp: answer,
        });
      } else if (payload.type === 'answer' && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
      } else if (payload.type === 'candidate' && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Failed to add ICE candidate', err);
        }
      }
    },
    [ensurePeerConnection, isHuddleActive, user]
  );

  // Listen for huddle signals from unified WebSocket
  useEffect(() => {
    const ws = getUnifiedWebSocket();
    const unsubscribe = ws.on('huddle.signal', handleHuddleSignal);
    return () => {
      unsubscribe();
    };
  }, [handleHuddleSignal]);

  useEffect(() => {
    if (!isHuddleActive || !localStreamRef.current || !user) return;

    huddleParticipants.forEach(participant => {
      if (participant.id === user.id) return;
      const initiator = user.id < participant.id;
      ensurePeerConnection(participant.id, initiator);
    });

    peersRef.current.forEach((pc, peerId) => {
      if (!huddleParticipants.some(participant => participant.id === peerId)) {
        pc.close();
        peersRef.current.delete(peerId);
        remoteStreamsRef.current.delete(peerId);
        refreshRemoteStreams();
      }
    });
  }, [
    ensurePeerConnection,
    huddleParticipants,
    isHuddleActive,
    refreshRemoteStreams,
    user,
  ]);

  useEffect(() => {
    if (!isHuddleActive || !user) return;
    const timeSinceJoin = Date.now() - huddleJoinTimeRef.current;
    if (timeSinceJoin < 5000) return;

    if (
      huddleParticipants &&
      huddleParticipants.length > 0 &&
      !huddleParticipants.some(participant => participant.id === user.id)
    ) {
      stopHuddle();
    }
  }, [huddleParticipants, isHuddleActive, stopHuddle, user]);

  return (
    <HuddleContext.Provider
      value={{
        isHuddleActive,
        huddleChatId,
        startHuddle,
        stopHuddle,
        remoteStreams,
        connectionDetails,
      }}
    >
      {children}
      <div
        className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <audio ref={localAudioRef} autoPlay muted playsInline />
        {remoteStreams.map(({ userId, stream }) => (
          <HiddenHuddleAudio key={userId} stream={stream} />
        ))}
      </div>
    </HuddleContext.Provider>
  );
}
