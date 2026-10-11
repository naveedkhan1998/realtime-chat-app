import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { useAppSelector } from '@/app/hooks';
import { selectGlobalOnlineUsers } from '@/features/unifiedChatSlice';
import { useSearchUsersQuery } from '@/services/userApi';
import {
  useCreateChatRoomMutation,
  useGetFriendshipsQuery,
  User,
} from '@/services/chatApi';
import { useDebounce } from '@/utils/hooks';
import { toast } from '@/hooks/use-toast';
import { getAvatarUrl, cn } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Search,
  Loader2,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import { PageFrame, Module } from '@/components/console/PageFrame';
import { Led, SectionLabel, channelNo } from '@/components/console';

type ChatMode = 'direct' | 'group';

export default function NewChatPage() {
  const user = useAppSelector(state => state.auth.user);
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const navigate = useNavigate();

  const { data: searchResults, isLoading: searchLoading } = useSearchUsersQuery(
    { query: debouncedSearchQuery },
    { skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2 }
  );
  const { data: friendships, isLoading: friendshipsLoading } =
    useGetFriendshipsQuery();
  const [createChatRoom, { isLoading: creatingChatRoom }] =
    useCreateChatRoomMutation();
  const [pendingChatUserId, setPendingChatUserId] = useState<number | null>(
    null
  );

  // Get friends list from friendships
  const friends =
    friendships?.flatMap(friendship => {
      return [friendship.user1, friendship.user2].filter(
        friend => friend.id !== user?.id
      );
    }) || [];

  const handleCreateDirectChat = async (
    participantId: number,
    participantName: string
  ) => {
    setPendingChatUserId(participantId);
    try {
      const response = await createChatRoom({
        participant_ids: [participantId],
      }).unwrap();
      toast({
        title: 'CHANNEL PATCHED',
        description: `Connected with ${participantName}.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create chat room:', error);
      toast({
        title: 'ERROR',
        description: 'Failed to patch channel.',
        variant: 'destructive',
      });
    } finally {
      setPendingChatUserId(null);
    }
  };

  const handleCreateGroupChat = async () => {
    if (selectedUsers.length < 1) {
      toast({
        title: 'NO OPERATORS SELECTED',
        description: 'Select at least one participant.',
        variant: 'destructive',
      });
      return;
    }
    if (!groupName.trim()) {
      toast({
        title: 'CHANNEL LABEL REQUIRED',
        description: 'Specify a label for this channel.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await createChatRoom({
        name: groupName.trim(),
        is_group_chat: true,
        participant_ids: selectedUsers.map(u => u.id),
      }).unwrap();
      toast({
        title: 'GROUP CHANNEL OPEN',
        description: `Channel "${groupName}" ready.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create group:', error);
      toast({
        title: 'ERROR',
        description: 'Failed to create channel.',
        variant: 'destructive',
      });
    }
  };

  const toggleUserSelection = (userToToggle: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === userToToggle.id);
      if (isSelected) {
        return prev.filter(u => u.id !== userToToggle.id);
      }
      return [...prev, userToToggle];
    });
  };

  const removeSelectedUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const isOnline = (userId: number) => globalOnlineUsers.includes(userId);
  const isUserSelected = (userId: number) =>
    selectedUsers.some(u => u.id === userId);

  return (
    <>
      <Helmet>
        <title>New Channel | MNK Chat</title>
      </Helmet>

      <PageFrame
        code="02"
        section="Channels"
        title="Patch Channel"
        description="Initialize a direct link with an operator or broadcast a new group frequency."
        actions={
          chatMode === 'group' ? (
            <Button
              onClick={handleCreateGroupChat}
              disabled={creatingChatRoom || selectedUsers.length === 0 || !groupName.trim()}
              className="font-mono text-xs font-bold"
            >
              {creatingChatRoom ? 'PATCHING...' : 'BROADCAST GROUP'}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {/* Channel Mode Selector */}
          <Module label="CONFIGURATION" title="Transmission Mode">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-well shadow-well max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setChatMode('direct');
                  setSelectedUsers([]);
                  setGroupName('');
                }}
                className={cn(
                  'flex-1 py-1.5 rounded-full font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                  chatMode === 'direct'
                    ? 'bg-card text-foreground shadow-key'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>DIRECT [DMS]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChatMode('group');
                  setSelectedUsers([]);
                  setGroupName('');
                }}
                className={cn(
                  'flex-1 py-1.5 rounded-full font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                  chatMode === 'group'
                    ? 'bg-card text-foreground shadow-key'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>GROUP [CHN]</span>
              </button>
            </div>
          </Module>

          {/* Group Channel Details */}
          {chatMode === 'group' && (
            <Module label="PARAMETERS" title="Channel Identity">
              <div className="space-y-3">
                <div>
                  <label className="label-engraved block mb-1.5">CHANNEL NAME</label>
                  <Input
                    placeholder="e.g. engineering, release-squad, audio-test"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="font-mono text-xs h-10"
                  />
                </div>

                {selectedUsers.length > 0 && (
                  <div>
                    <label className="label-engraved block mb-1.5">
                      STAGED OPERATORS ({selectedUsers.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUsers.map(selectedUser => (
                        <span
                          key={selectedUser.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full key font-mono text-xs"
                        >
                          <Avatar className="w-4 h-4 border border-border">
                            <AvatarImage src={getAvatarUrl(selectedUser.avatar)} />
                            <AvatarFallback className="text-[8px] font-bold">
                              {selectedUser.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{selectedUser.name}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedUser(selectedUser.id)}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Module>
          )}

          {/* Operator Search & Directory */}
          <Module
            label="DIRECTORY"
            title="Scan Operators"
            description="Search workspace operators by identifier or callsign."
          >
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute w-4 h-4 left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="SEARCH CALLSIGN OR EMAIL..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="font-mono text-xs pl-10 h-10"
                />
              </div>

              {/* Search Results */}
              {searchLoading && (
                <div className="flex items-center justify-center py-8 gap-2 font-mono text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>SCANNING DIRECTORY...</span>
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="space-y-2">
                  <SectionLabel count={searchResults.length}>SEARCH RESULTS</SectionLabel>
                  <div className="panel divide-y divide-border overflow-hidden">
                    {searchResults.map(result => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 hover:bg-well transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {chatMode === 'group' && (
                            <Checkbox
                              checked={isUserSelected(result.id)}
                              onCheckedChange={() => toggleUserSelection(result)}
                            />
                          )}
                          <div className="relative">
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarImage src={getAvatarUrl(result.avatar)} />
                              <AvatarFallback className="font-mono text-xs font-bold bg-well">
                                {result.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline(result.id) && (
                              <Led tone="live" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-foreground truncate">
                              {result.name}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground truncate">
                              OP·{channelNo(result.id)}
                            </p>
                          </div>
                        </div>

                        {chatMode === 'direct' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateDirectChat(result.id, result.name)}
                            disabled={pendingChatUserId === result.id}
                            className="font-mono text-xs h-8 px-3"
                          >
                            {pendingChatUserId === result.id ? 'CONNECTING...' : 'CONNECT'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Contacts / Friends */}
              {!searchQuery && (
                <div className="space-y-2">
                  <SectionLabel count={friends.length}>KNOWN OPERATORS</SectionLabel>
                  {friendshipsLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 font-mono text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>LOADING CONTACTS...</span>
                    </div>
                  ) : friends.length > 0 ? (
                    <div className="panel divide-y divide-border overflow-hidden">
                      {friends.map(friend => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-3 hover:bg-well transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {chatMode === 'group' && (
                              <Checkbox
                                checked={isUserSelected(friend.id)}
                                onCheckedChange={() => toggleUserSelection(friend)}
                              />
                            )}
                            <div className="relative">
                              <Avatar className="w-8 h-8 border border-border">
                                <AvatarImage src={getAvatarUrl(friend.avatar)} />
                                <AvatarFallback className="font-mono text-xs font-bold bg-well">
                                  {friend.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isOnline(friend.id) && (
                                <Led tone="live" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-bold text-foreground truncate">
                                {friend.name}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                OP·{channelNo(friend.id)}
                              </p>
                            </div>
                          </div>

                          {chatMode === 'direct' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateDirectChat(friend.id, friend.name)}
                              disabled={pendingChatUserId === friend.id}
                              className="font-mono text-xs h-8 px-3"
                            >
                              {pendingChatUserId === friend.id ? 'CONNECTING...' : 'CONNECT'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 font-mono text-xs text-muted-foreground">
                      NO SAVED CONTACTS YET. TYPE ABOVE TO SEARCH DIRECTORY.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Module>
        </div>
      </PageFrame>
    </>
  );
}
