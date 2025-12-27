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
  HuddleSfuUpgradeEvent,
  HuddleSfuSessionEvent,
  HuddleSfuPublishAnswerEvent,
  HuddleSfuSubscribeOfferEvent,
  HuddleSfuTrackAddedEvent,
  HuddleSfuRenegotiateCompleteEvent,
} from '@/utils/unifiedWebSocket';
import { useGetIceServersQuery } from '@/services/chatApi';
import {
  setHuddleParticipants,
  selectRoomHuddleParticipants,
} from '@/features/unifiedChatSlice';

interface SfuStats {
  publish?: {
    connectionState: string;
    type: string;
    quality: string;
    bitrate: { out: number };
    audio?: {
      packetsSent?: number;
      bytesSent?: number;
    };
    rtt?: number;
  };
  subscribe?: {
    connectionState: string;
    type: string;
    quality: string;
    bitrate: { in: number };
    audio?: {
      packetsReceived?: number;
      bytesReceived?: number;
      jitter?: number;
      packetLossPercent?: number;
    };
    rtt?: number;
  };
  timestamp?: number;
}

interface HuddleContextType {
  isHuddleActive: boolean;
  huddleChatId: number | null;
  startHuddle: (chatId: number) => Promise<void>;
  stopHuddle: () => void;
  remoteStreams: Array<{ userId: number; stream: MediaStream }>;
  connectionDetails: Record<number, any>;
  isUsingSfu: boolean;
  sfuStats: SfuStats | null;
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

  // SFU state
  const [isUsingSfu, setIsUsingSfu] = useState(false);
  const sfuSessionIdRef = useRef<string | null>(null);
  const sfuPublishPcRef = useRef<RTCPeerConnection | null>(null);
  const sfuSubscribePcRef = useRef<RTCPeerConnection | null>(null);
  const [sfuStats, setSfuStats] = useState<SfuStats | null>(null);
  const sfuPrevStatsRef = useRef<{
    publish?: { bytesSent: number; timestamp: number };
    subscribe?: { bytesReceived: number; timestamp: number };
  }>({});
  // SFU negotiation lock - prevents concurrent subscribe requests
  const sfuSubscribeNegotiatingRef = useRef<boolean>(false);
  const sfuSubscribePendingRef = useRef<boolean>(false);

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

  // Check SFU connection stats
  const checkSfuStats = useCallback(async () => {
    try {
      const now = Date.now();
      const newStats: SfuStats = { timestamp: now };

      // Check publish connection stats
      if (sfuPublishPcRef.current && sfuPublishPcRef.current.connectionState === 'connected') {
        const stats = await sfuPublishPcRef.current.getStats();
        let activePair: any = null;
        let audioOutbound: any = null;

        stats.forEach(report => {
          if (report.type === 'transport' && report.selectedCandidatePairId) {
            activePair = stats.get(report.selectedCandidatePairId);
          }
          if (report.type === 'candidate-pair' && report.selected && !activePair) {
            activePair = report;
          }
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            audioOutbound = {
              packetsSent: report.packetsSent,
              bytesSent: report.bytesSent,
            };
          }
        });

        let bitrateOut = 0;
        if (audioOutbound && sfuPrevStatsRef.current.publish) {
          const timeDiff = (now - sfuPrevStatsRef.current.publish.timestamp) / 1000;
          if (timeDiff > 0) {
            bitrateOut = ((audioOutbound.bytesSent - sfuPrevStatsRef.current.publish.bytesSent) * 8) / timeDiff / 1000;
          }
        }
        if (audioOutbound) {
          sfuPrevStatsRef.current.publish = { bytesSent: audioOutbound.bytesSent, timestamp: now };
        }

        const rtt = activePair?.currentRoundTripTime ? activePair.currentRoundTripTime * 1000 : undefined;
        let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
        if (rtt !== undefined) {
          if (rtt > 300) quality = 'poor';
          else if (rtt > 150) quality = 'fair';
          else if (rtt > 50) quality = 'good';
        }

        newStats.publish = {
          connectionState: sfuPublishPcRef.current.connectionState,
          type: 'Cloudflare SFU (Publish)',
          quality,
          bitrate: { out: Math.round(bitrateOut * 10) / 10 },
          audio: audioOutbound,
          rtt,
        };
      }

      // Check subscribe connection stats
      if (sfuSubscribePcRef.current && sfuSubscribePcRef.current.connectionState === 'connected') {
        const stats = await sfuSubscribePcRef.current.getStats();
        let activePair: any = null;
        let audioInbound: any = null;

        stats.forEach(report => {
          if (report.type === 'transport' && report.selectedCandidatePairId) {
            activePair = stats.get(report.selectedCandidatePairId);
          }
          if (report.type === 'candidate-pair' && report.selected && !activePair) {
            activePair = report;
          }
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            audioInbound = {
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              bytesReceived: report.bytesReceived,
              jitter: report.jitter,
            };
          }
        });

        let bitrateIn = 0;
        if (audioInbound && sfuPrevStatsRef.current.subscribe) {
          const timeDiff = (now - sfuPrevStatsRef.current.subscribe.timestamp) / 1000;
          if (timeDiff > 0) {
            bitrateIn = ((audioInbound.bytesReceived - sfuPrevStatsRef.current.subscribe.bytesReceived) * 8) / timeDiff / 1000;
          }
        }
        if (audioInbound) {
          sfuPrevStatsRef.current.subscribe = { bytesReceived: audioInbound.bytesReceived, timestamp: now };
        }

        const packetLossPercent = audioInbound && audioInbound.packetsReceived > 0
          ? ((audioInbound.packetsLost || 0) / (audioInbound.packetsReceived + (audioInbound.packetsLost || 0))) * 100
          : 0;

        const rtt = activePair?.currentRoundTripTime ? activePair.currentRoundTripTime * 1000 : undefined;
        let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
        if (rtt !== undefined) {
          if (rtt > 300 || packetLossPercent > 5) quality = 'poor';
          else if (rtt > 150 || packetLossPercent > 2) quality = 'fair';
          else if (rtt > 50 || packetLossPercent > 0.5) quality = 'good';
        }

        newStats.subscribe = {
          connectionState: sfuSubscribePcRef.current.connectionState,
          type: 'Cloudflare SFU (Subscribe)',
          quality,
          bitrate: { in: Math.round(bitrateIn * 10) / 10 },
          audio: { ...audioInbound, packetLossPercent },
          rtt,
        };
      }

      if (newStats.publish || newStats.subscribe) {
        setSfuStats(newStats);
      }
    } catch (e) {
      console.error('Error checking SFU stats:', e);
    }
  }, []);

  // Poll for stats updates (1 second for smooth real-time display)
  useEffect(() => {
    if (!isHuddleActive) return;
    const interval = setInterval(() => {
      if (isUsingSfu) {
        // Check SFU connection stats
        checkSfuStats();
      } else {
        // Check P2P connection stats
        peersRef.current.forEach((pc, peerId) => {
          if (pc.connectionState === 'connected') {
            checkConnectionStats(pc, peerId);
          }
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isHuddleActive, isUsingSfu, checkConnectionStats, checkSfuStats]);

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
    // Clean up P2P connections
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    
    // Clean up SFU connections
    if (sfuPublishPcRef.current) {
      sfuPublishPcRef.current.close();
      sfuPublishPcRef.current = null;
    }
    if (sfuSubscribePcRef.current) {
      sfuSubscribePcRef.current.close();
      sfuSubscribePcRef.current = null;
    }
    sfuSessionIdRef.current = null;
    setIsUsingSfu(false);
    setSfuStats(null);
    sfuPrevStatsRef.current = {};
    
    remoteStreamsRef.current.clear();
    refreshRemoteStreams();
    setConnectionDetails({});
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

  // ==================== SFU Upgrade Handling ====================

  const switchToSfu = useCallback(
    async () => {
      if (isUsingSfu) return; // Already on SFU
      
      console.log('🔄 Upgrading to SFU mode');
      
      // Close all P2P connections
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      remoteStreamsRef.current.clear();
      refreshRemoteStreams();
      setConnectionDetails({});
      
      setIsUsingSfu(true);
      
      // Create SFU publish connection for local audio
      // Server will create the session automatically
      if (localStreamRef.current) {
        await publishToSfu();
      }
      
      // Subscribe to remote tracks after a short delay to let others publish
      setTimeout(() => {
        subscribeToSfu();
      }, 1000);
    },
    [isUsingSfu, refreshRemoteStreams]
  );

  const publishToSfu = useCallback(
    async () => {
      if (!localStreamRef.current) return;
      
      console.log('📤 Publishing audio to SFU');
      const ws = getUnifiedWebSocket();
      const pc = new RTCPeerConnection({
        iceServers: iceServers || [{ urls: 'stun:stun.cloudflare.com:3478' }],
      });
      sfuPublishPcRef.current = pc;
      
      // ICE gathering logging
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('📍 SFU Publish ICE candidate:', event.candidate.type);
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('📡 SFU Publish ICE state:', pc.iceConnectionState);
      };
      
      pc.onconnectionstatechange = () => {
        console.log('🔗 SFU Publish connection state:', pc.connectionState);
      };
      
      // Add local audio track
      localStreamRef.current.getAudioTracks().forEach(track => {
        console.log('🎤 Adding local audio track to SFU:', track.label);
        pc.addTrack(track, localStreamRef.current!);
      });
      
      // Create offer and send to server (server manages session)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Note: No session_id needed - server creates/manages it
      ws.sendSfuPublish('audio', offer.sdp || '');
    },
    [iceServers]
  );

  const subscribeToSfu = useCallback(
    async () => {
      // Check if we're already negotiating
      if (sfuSubscribeNegotiatingRef.current) {
        console.log('📥 SFU subscription already in progress, queuing request');
        sfuSubscribePendingRef.current = true;
        return;
      }
      
      console.log('📥 Requesting subscription to SFU remote tracks');
      sfuSubscribeNegotiatingRef.current = true;
      sfuSubscribePendingRef.current = false;
      
      const ws = getUnifiedWebSocket();
      
      // Create the subscriber PeerConnection
      // We'll set it up when we receive the offer from SFU
      const pc = new RTCPeerConnection({
        iceServers: iceServers || [{ urls: 'stun:stun.cloudflare.com:3478' }],
      });
      sfuSubscribePcRef.current = pc;
      
      // ICE gathering logging
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('📍 SFU Subscribe ICE candidate:', event.candidate.type);
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('📡 SFU Subscribe ICE state:', pc.iceConnectionState);
      };
      
      pc.onconnectionstatechange = () => {
        console.log('🔗 SFU Subscribe connection state:', pc.connectionState);
      };
      
      // Handle incoming tracks from SFU
      pc.ontrack = event => {
        console.log('📥 Received track from SFU:', event.track.kind, event.track.label);
        const stream = event.streams[0];
        if (stream) {
          console.log('📥 Got stream from SFU:', stream.id);
          // Store by stream ID for SFU mode
          remoteStreamsRef.current.set(stream.id.hashCode?.() || Date.now(), stream);
          refreshRemoteStreams();
        }
      };
      
      // Request subscription - NO SDP offer needed
      // Server will return an SDP offer from the SFU
      ws.sendSfuSubscribe();
    },
    [iceServers, refreshRemoteStreams]
  );

  // Handle SFU subscription offer (SFU generates the offer, we create an answer)
  const handleSfuSubscribeOffer = useCallback(
    async (event: HuddleSfuSubscribeOfferEvent) => {
      if (!sfuSubscribePcRef.current) {
        console.error('No SFU subscribe PeerConnection ready');
        sfuSubscribeNegotiatingRef.current = false;
        return;
      }
      
      try {
        console.log('📬 Received SFU subscribe offer, tracks:', event.tracks?.length);
        
        // Set the remote description with the SFU's offer
        await sfuSubscribePcRef.current.setRemoteDescription(event.sdp_offer);
        
        // Create an answer
        const answer = await sfuSubscribePcRef.current.createAnswer();
        await sfuSubscribePcRef.current.setLocalDescription(answer);
        
        console.log('📤 Sending SFU renegotiate answer');
        
        // Send the answer back to complete renegotiation
        const ws = getUnifiedWebSocket();
        ws.sendSfuRenegotiate(answer.sdp || '');
        
        console.log('✅ SFU subscription negotiation complete');
      } catch (err) {
        console.error('Failed to handle SFU subscribe offer:', err);
        sfuSubscribeNegotiatingRef.current = false;
      }
    },
    []
  );

  // Handle SFU renegotiation complete - unlock and process pending requests
  const handleSfuRenegotiateComplete = useCallback(
    (_event: HuddleSfuRenegotiateCompleteEvent) => {
      console.log('✅ SFU renegotiation confirmed by server');
      sfuSubscribeNegotiatingRef.current = false;
      
      // If there were pending subscription requests, process them now
      if (sfuSubscribePendingRef.current) {
        console.log('📥 Processing pending SFU subscription request');
        sfuSubscribePendingRef.current = false;
        // Small delay to let WebRTC settle
        setTimeout(() => {
          subscribeToSfu();
        }, 100);
      }
    },
    [subscribeToSfu]
  );

  const handleSfuPublishAnswer = useCallback(
    async (event: HuddleSfuPublishAnswerEvent) => {
      if (!sfuPublishPcRef.current) return;
      
      try {
        console.log('📬 Received SFU publish answer, session:', event.session_id);
        await sfuPublishPcRef.current.setRemoteDescription(event.sdp_answer);
        console.log('✅ SFU publish connection established');
        
        // Store our session ID for reference
        if (event.session_id) {
          sfuSessionIdRef.current = event.session_id;
        }
      } catch (err) {
        console.error('Failed to set SFU publish answer:', err);
      }
    },
    []
  );

  const handleSfuUpgrade = useCallback(
    (event: HuddleSfuUpgradeEvent | HuddleSfuSessionEvent) => {
      console.log('📡 Received SFU upgrade event:', event);
      if (!isHuddleActive) {
        console.log('📡 Ignoring SFU upgrade - huddle not active');
        return;
      }
      if (huddleChatId !== event.room_id) {
        console.log('📡 Ignoring SFU upgrade - room mismatch', { huddleChatId, eventRoomId: event.room_id });
        return;
      }
      
      console.log('📡 Initiating SFU upgrade');
      switchToSfu();
    },
    [isHuddleActive, huddleChatId, switchToSfu]
  );

  const handleSfuTrackAdded = useCallback(
    (event: HuddleSfuTrackAddedEvent) => {
      if (!isHuddleActive || !isUsingSfu) return;
      if (huddleChatId !== event.room_id) return;
      
      console.log(`🎵 New track from ${event.user_name}: ${event.track_name}`);
      // Re-subscribe to get the new track
      subscribeToSfu();
    },
    [isHuddleActive, isUsingSfu, huddleChatId, subscribeToSfu]
  );

  // Listen for SFU events
  useEffect(() => {
    const ws = getUnifiedWebSocket();
    const unsubUpgrade = ws.on('huddle.sfu_upgrade', handleSfuUpgrade);
    const unsubSession = ws.on('huddle.sfu_session', handleSfuUpgrade);
    const unsubPublish = ws.on('huddle.sfu_publish_answer', handleSfuPublishAnswer);
    const unsubSubscribeOffer = ws.on('huddle.sfu_subscribe_offer', handleSfuSubscribeOffer);
    const unsubRenegotiateComplete = ws.on('huddle.sfu_renegotiate_complete', handleSfuRenegotiateComplete);
    const unsubTrack = ws.on('huddle.sfu_track_added', handleSfuTrackAdded);
    
    // Handle SFU errors - release negotiation lock
    const unsubError = ws.on('error', (event) => {
      if (event.code === 'SFU_SUBSCRIBE_FAILED' || event.code === 'SFU_RENEGOTIATE_FAILED') {
        console.warn('SFU operation failed:', event.message);
        sfuSubscribeNegotiatingRef.current = false;
      }
    });
    
    return () => {
      unsubUpgrade();
      unsubSession();
      unsubPublish();
      unsubSubscribeOffer();
      unsubRenegotiateComplete();
      unsubTrack();
      unsubError();
    };
  }, [handleSfuUpgrade, handleSfuPublishAnswer, handleSfuSubscribeOffer, handleSfuRenegotiateComplete, handleSfuTrackAdded]);

  useEffect(() => {
    // Skip P2P connection management when using SFU
    if (isUsingSfu) return;
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
    isUsingSfu,
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
        isUsingSfu,
        sfuStats,
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
