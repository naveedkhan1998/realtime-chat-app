"""
Cloudflare Calls SFU (Selective Forwarding Unit) service.

This module handles communication with Cloudflare Calls API for managing
SFU sessions in group huddles with 3+ participants.

Architecture:
- Each user gets their own Cloudflare Calls session
- Users publish tracks to their own session
- Users subscribe to tracks from other users' sessions
- Redis stores the mapping of user_id -> session_id per room

Cloudflare Calls API Reference:
https://developers.cloudflare.com/calls/
"""

import logging
import os
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from django_redis import get_redis_connection
import json

logger = logging.getLogger(__name__)


@dataclass
class SFUSession:
    """Represents an active SFU session."""
    session_id: str
    room_id: int
    user_id: int


@dataclass
class TrackInfo:
    """Information about a media track in the SFU."""
    track_id: str
    track_name: str
    session_id: str
    user_id: int


class CloudflareSFUService:
    """
    Service for managing Cloudflare Calls SFU sessions.
    
    Each user gets their own session. Users publish to their session
    and subscribe to tracks from other users' sessions.
    
    Handles:
    - Creating new SFU sessions (per user)
    - Adding/removing tracks
    - Session cleanup
    - Redis persistence of session state
    """
    
    BASE_URL = "https://rtc.live.cloudflare.com/v1/apps"
    # Per-room session registry: stores which session each user has
    REDIS_SFU_ROOM_SESSIONS_KEY = "chat:huddle:{room_id}:sfu_sessions"
    # Per-room track registry: stores all published tracks
    REDIS_SFU_TRACKS_KEY = "chat:huddle:{room_id}:sfu_tracks"
    # Per-room flag to indicate SFU mode is active
    REDIS_SFU_ACTIVE_KEY = "chat:huddle:{room_id}:sfu_active"
    SFU_TTL = 3600  # 1 hour TTL for SFU sessions
    
    def __init__(self):
        self.app_id = os.environ.get("CLOUDFLARE_CALLS_APP_ID")
        self.app_secret = os.environ.get("CLOUDFLARE_CALLS_APP_SECRET")
        self._redis = None
    
    @property
    def redis(self):
        if self._redis is None:
            self._redis = get_redis_connection("default")
        return self._redis
    
    @property
    def is_configured(self) -> bool:
        """Check if Cloudflare Calls is properly configured."""
        return bool(self.app_id and self.app_secret)
    
    def _get_headers(self, include_content_type: bool = True) -> Dict[str, str]:
        """Get headers for Cloudflare API requests."""
        headers = {
            "Authorization": f"Bearer {self.app_secret}",
        }
        if include_content_type:
            headers["Content-Type"] = "application/json"
        return headers
    
    def _api_url(self, path: str) -> str:
        """Build full API URL."""
        return f"{self.BASE_URL}/{self.app_id}/{path}"
    
    def is_sfu_active(self, room_id: int) -> bool:
        """Check if SFU mode is active for a room."""
        key = self.REDIS_SFU_ACTIVE_KEY.format(room_id=room_id)
        return bool(self.redis.exists(key))
    
    def set_sfu_active(self, room_id: int) -> None:
        """Mark SFU mode as active for a room."""
        key = self.REDIS_SFU_ACTIVE_KEY.format(room_id=room_id)
        self.redis.setex(key, self.SFU_TTL, "1")
    
    def get_user_session(self, room_id: int, user_id: int) -> Optional[str]:
        """
        Get existing session ID for a user in a room.
        
        Args:
            room_id: The chat room ID
            user_id: The user ID
            
        Returns:
            Session ID if exists, None otherwise
        """
        key = self.REDIS_SFU_ROOM_SESSIONS_KEY.format(room_id=room_id)
        session_id = self.redis.hget(key, str(user_id))
        if session_id:
            return session_id.decode()
        return None
    
    def get_all_sessions(self, room_id: int) -> Dict[int, str]:
        """
        Get all user sessions for a room.
        
        Returns:
            Dict mapping user_id -> session_id
        """
        key = self.REDIS_SFU_ROOM_SESSIONS_KEY.format(room_id=room_id)
        sessions = self.redis.hgetall(key)
        return {int(k.decode()): v.decode() for k, v in sessions.items()}
    
    def create_session_for_user(self, room_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Create a new SFU session for a user in a room.
        
        Each user gets their own session to publish tracks to.
        
        Args:
            room_id: The chat room ID
            user_id: The user ID
            
        Returns:
            Session data including session_id,
            or None if creation failed
        """
        if not self.is_configured:
            logger.warning("Cloudflare Calls SFU not configured. APP_ID set: %s, APP_SECRET set: %s", bool(self.app_id), bool(self.app_secret))
            return None
        
        # Check for existing session for this user
        existing_session_id = self.get_user_session(room_id, user_id)
        if existing_session_id:
            logger.debug("Using existing session %s for user %d in room %d", existing_session_id, user_id, room_id)
            return {"session_id": existing_session_id, "existing": True}
        
        try:
            url = self._api_url("sessions/new")
            logger.info("Creating new session for user %d in room %d", user_id, room_id)
            
            response = requests.post(
                url,
                headers=self._get_headers(include_content_type=False),
                timeout=10,
            )
            
            logger.debug("Create session response status: %d", response.status_code)
            
            if not response.ok:
                logger.error("Create session error: %s", response.text)
                return None
            
            data = response.json()
            session_id = data.get("sessionId")
            
            if session_id:
                logger.info("Created session %s for user %d in room %d", session_id, user_id, room_id)
                
                # Store user's session in Redis hash
                sessions_key = self.REDIS_SFU_ROOM_SESSIONS_KEY.format(room_id=room_id)
                self.redis.hset(sessions_key, str(user_id), session_id)
                self.redis.expire(sessions_key, self.SFU_TTL)
                
                # Mark SFU as active for this room
                self.set_sfu_active(room_id)
                
                return {
                    "session_id": session_id,
                    "existing": False,
                }
            
            logger.error("No sessionId in response: %s", data)
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error("Request error creating session: %s", e)
            return None
        except Exception as e:
            logger.exception("Unexpected error creating session: %s", e)
            return None
    
    def add_track(
        self,
        room_id: int,
        session_id: str,
        track_name: str,
        user_id: int,
        sdp_offer: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Add a new track to the SFU session (WHIP - publish).
        
        Uses autoDiscover mode which lets Cloudflare Calls automatically
        detect tracks from the SDP offer.
        
        Args:
            room_id: The chat room ID
            session_id: The SFU session ID
            track_name: Name/label for the track (e.g., "audio", "video")
            user_id: The user publishing the track
            sdp_offer: SDP offer from the client
            
        Returns:
            Response including SDP answer and track ID, or None if failed
        """
        if not self.is_configured:
            return None
        
        try:
            url = self._api_url(f"sessions/{session_id}/tracks/new")
            
            # Use autoDiscover mode - SFU will detect tracks from SDP
            # This is more flexible and handles various SDP formats
            request_body = {
                "autoDiscover": True,
                "sessionDescription": {
                    "type": "offer",
                    "sdp": sdp_offer,
                },
            }
            
            logger.info("Adding track for user %d, track: %s, session: %s", user_id, track_name, session_id)
            logger.debug("SDP offer length: %d chars, request body keys: %s", len(sdp_offer), list(request_body.keys()))
            
            response = requests.post(
                url,
                headers=self._get_headers(),
                json=request_body,
                timeout=10,
            )
            
            logger.debug("Add track response status: %d", response.status_code)
            if not response.ok:
                logger.error("Add track error: %s", response.text)
                return None
            
            data = response.json()
            logger.info("Track added successfully, response keys: %s", list(data.keys()))
            
            # Get track mids from response
            response_tracks = data.get("tracks", [])
            if response_tracks:
                for i, track in enumerate(response_tracks):
                    track_mid = track.get("mid")
                    track_name_resp = track.get("trackName", f"{user_id}_{track_name}_{i}")
                    logger.debug("Track %d: mid=%s, name=%s", i, track_mid, track_name_resp)
                    
                    # Store track info in Redis
                    tracks_key = self.REDIS_SFU_TRACKS_KEY.format(room_id=room_id)
                    track_info = json.dumps({
                        "user_id": user_id,
                        "track_name": track_name_resp,
                        "track_id": track_mid,
                        "session_id": session_id,
                    })
                    self.redis.hset(tracks_key, f"{user_id}_{track_name}_{i}", track_info)
                    self.redis.expire(tracks_key, self.SFU_TTL)
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.exception("Error adding track to SFU: %s", e)
            return None
        except Exception as e:
            logger.exception("Unexpected error adding track: %s", e)
            return None
    
    def subscribe_to_tracks(
        self,
        subscriber_session_id: str,
        room_id: int,
        user_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Subscribe to remote tracks from other users' sessions.
        
        This method does NOT require an SDP offer from the client.
        Instead, Cloudflare Calls will generate an SDP offer that
        the client must answer via the renegotiate endpoint.
        
        Flow:
        1. We request remote tracks (no sessionDescription)
        2. Cloudflare returns an SDP OFFER
        3. Client sets remote description with the offer
        4. Client creates an ANSWER
        5. Client sends answer back, we call renegotiate endpoint
        
        Args:
            subscriber_session_id: The subscriber's own session ID
            room_id: The chat room ID
            user_id: The subscribing user's ID (to exclude their own tracks)
            
        Returns:
            Response including SDP offer from SFU, or None if failed
        """
        if not self.is_configured:
            return None
        
        try:
            # Get all tracks from other users
            tracks_key = self.REDIS_SFU_TRACKS_KEY.format(room_id=room_id)
            all_tracks = self.redis.hgetall(tracks_key)
            
            remote_tracks = []
            for track_key, track_data in all_tracks.items():
                track_info = json.loads(track_data.decode())
                # Only subscribe to other users' tracks
                if track_info["user_id"] != user_id:
                    publisher_session_id = track_info.get("session_id")
                    track_name = track_info.get("track_name")
                    
                    if publisher_session_id and track_name:
                        remote_tracks.append({
                            "location": "remote",
                            "sessionId": publisher_session_id,  # Publisher's session ID!
                            "trackName": track_name,
                        })
                        logger.debug("Subscribing to track '%s' from session %s", track_name, publisher_session_id)
            
            if not remote_tracks:
                logger.debug("No remote tracks available for user %d to subscribe to", user_id)
                return None
            
            logger.info("User %d subscribing to %d remote tracks", user_id, len(remote_tracks))
            
            # Request tracks WITHOUT sessionDescription - SFU will generate an offer
            response = requests.post(
                self._api_url(f"sessions/{subscriber_session_id}/tracks/new"),
                headers=self._get_headers(),
                json={
                    "tracks": remote_tracks,
                },
                timeout=10,
            )
            
            logger.debug("Subscribe response status: %d", response.status_code)
            if not response.ok:
                logger.error("Subscribe error: %s", response.text)
                return None
            
            data = response.json()
            
            # The response should contain an SDP OFFER from the SFU
            if data.get("sessionDescription"):
                logger.info("Received SFU-generated offer, type: %s, requiresRenegotiation: %s",
                           data['sessionDescription'].get('type'),
                           data.get('requiresImmediateRenegotiation'))
            
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error("Error subscribing to tracks: %s", e)
            return None
        except Exception as e:
            logger.exception("Unexpected error subscribing to tracks: %s", e)
            return None
    
    def renegotiate_session(
        self,
        session_id: str,
        sdp_answer: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Complete the renegotiation by sending the client's SDP answer.
        
        After the client receives an SFU-generated offer and creates an answer,
        this method sends the answer to complete the WebRTC negotiation.
        
        Args:
            session_id: The session ID to renegotiate
            sdp_answer: The SDP answer from the client
            
        Returns:
            Response from the renegotiate endpoint, or None if failed
        """
        if not self.is_configured:
            return None
        
        try:
            logger.info("Renegotiating session %s... with answer", session_id[:16])
            
            response = requests.put(
                self._api_url(f"sessions/{session_id}/renegotiate"),
                headers=self._get_headers(),
                json={
                    "sessionDescription": {
                        "type": "answer",
                        "sdp": sdp_answer,
                    },
                },
                timeout=10,
            )
            
            logger.debug("Renegotiate response status: %d", response.status_code)
            if not response.ok:
                logger.error("Renegotiate error: %s", response.text)
                return None
            
            data = response.json()
            logger.info("Renegotiation successful")
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error("Error renegotiating session: %s", e)
            return None
        except Exception as e:
            logger.exception("Unexpected error renegotiating: %s", e)
            return None
    
    def remove_user_session(self, room_id: int, user_id: int) -> bool:
        """
        Remove a user's session and tracks when they leave the huddle.
        
        Args:
            room_id: The chat room ID
            user_id: The user whose session to remove
            
        Returns:
            True if successful, False otherwise
        """
        try:
            session_id = self.get_user_session(room_id, user_id)
            
            # Remove user's session from registry
            sessions_key = self.REDIS_SFU_ROOM_SESSIONS_KEY.format(room_id=room_id)
            self.redis.hdel(sessions_key, str(user_id))
            
            # Remove user's tracks
            tracks_key = self.REDIS_SFU_TRACKS_KEY.format(room_id=room_id)
            all_tracks = self.redis.hgetall(tracks_key)
            
            for track_key, track_data in all_tracks.items():
                track_info = json.loads(track_data.decode())
                if track_info["user_id"] == user_id:
                    self.redis.hdel(tracks_key, track_key)
            
            logger.info("Removed session and tracks for user %d in room %d", user_id, room_id)
            return True
            
        except Exception as e:
            logger.error("Error removing user session: %s", e)
            return False
    
    def cleanup_room(self, room_id: int) -> bool:
        """
        Clean up all SFU state for a room when the huddle ends.
        
        This should be called when the last participant leaves the huddle.
        
        Args:
            room_id: The chat room ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Cleaning up all SFU state for room %d", room_id)
            
            # Clean up all Redis keys for this room
            self._cleanup_redis(room_id)
            
            return True
            
        except Exception as e:
            logger.error("Error cleaning up room: %s", e)
            return False
    
    def _cleanup_redis(self, room_id: int) -> None:
        """Clean up all Redis keys for a room's SFU state."""
        sessions_key = self.REDIS_SFU_ROOM_SESSIONS_KEY.format(room_id=room_id)
        tracks_key = self.REDIS_SFU_TRACKS_KEY.format(room_id=room_id)
        active_key = self.REDIS_SFU_ACTIVE_KEY.format(room_id=room_id)
        
        pipeline = self.redis.pipeline(True)
        pipeline.delete(sessions_key)
        pipeline.delete(tracks_key)
        pipeline.delete(active_key)
        pipeline.execute()
        
        logger.debug("Deleted Redis keys for room %d", room_id)
    
    def get_room_info(self, room_id: int) -> Optional[Dict[str, Any]]:
        """
        Get full SFU info for a room including all sessions and tracks.
        
        Args:
            room_id: The chat room ID
            
        Returns:
            Room info dict or None if SFU not active
        """
        if not self.is_sfu_active(room_id):
            return None
        
        sessions = self.get_all_sessions(room_id)
        
        tracks_key = self.REDIS_SFU_TRACKS_KEY.format(room_id=room_id)
        all_tracks = self.redis.hgetall(tracks_key)
        
        tracks = []
        for track_key, track_data in all_tracks.items():
            tracks.append(json.loads(track_data.decode()))
        
        return {
            "room_id": room_id,
            "sessions": sessions,
            "tracks": tracks,
        }


# Singleton instance
sfu_service = CloudflareSFUService()
