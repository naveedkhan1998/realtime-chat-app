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
import { getAvatarUrl } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Search,
  Loader2,
  MessageSquarePlus,
  ArrowLeft,
  Users2,
  LucideProps,
  UserPlus,
  X,
} from 'lucide-react';

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
        title: 'Chat created',
        description: `You can now chat with ${participantName}.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create chat room:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingChatUserId(null);
    }
  };

  const handleCreateGroupChat = async () => {
    if (selectedUsers.length < 1) {
      toast({
        title: 'Select participants',
        description: 'Please select at least one participant for the group.',
        variant: 'destructive',
      });
      return;
    }
    if (!groupName.trim()) {
      toast({
        title: 'Group name required',
        description: 'Please enter a name for the group.',
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
        title: 'Group created',
        description: `Group "${groupName}" has been created.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group. Please try again.',
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
    <div className="flex flex-col h-full overflow-hidden">
      <Helmet>
        <title>New Chat | MNK Chat</title>
        <meta name="description" content="Start a new conversation" />
      </Helmet>

      {/* Header - Consistent with other pages */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b sm:gap-4 sm:px-6 sm:py-4 bg-background/80 backdrop-blur-xl border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl shrink-0 sm:w-10 sm:h-10"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate sm:text-xl text-foreground">
            {chatMode === 'direct' ? 'New Chat' : 'New Group'}
          </h1>
          <p className="text-xs truncate sm:text-sm text-muted-foreground">
            {chatMode === 'direct'
              ? 'Start a conversation'
              : 'Create a group chat'}
          </p>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="px-4 py-3 border-b sm:px-6 border-border/50 bg-background/50">
        <Tabs
          value={chatMode}
          onValueChange={v => {
            setChatMode(v as ChatMode);
            setSelectedUsers([]);
            setGroupName('');
          }}
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2 mx-auto">
            <TabsTrigger value="direct" className="gap-2">
              <MessageSquarePlus className="w-4 h-4" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group" className="gap-2">
              <Users2 className="w-4 h-4" />
              Group
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Group Name Input (only for group mode) */}
      {chatMode === 'group' && (
        <div className="px-4 py-3 border-b sm:px-6 border-border/50 bg-background/50">
          <div className="max-w-xl mx-auto">
            <Input
              placeholder="Enter group name..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="h-12 text-base border rounded-xl bg-muted/50 border-border/50 focus:bg-background"
            />
          </div>
        </div>
      )}

      {/* Selected Users (only for group mode) */}
      {chatMode === 'group' && selectedUsers.length > 0 && (
        <div className="px-4 py-3 border-b sm:px-6 border-border/50 bg-background/50">
          <div className="max-w-xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(selectedUser => (
                <Badge
                  key={selectedUser.id}
                  variant="secondary"
                  className="flex items-center gap-1 py-1 pl-1 pr-2"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage
                      src={getAvatarUrl(selectedUser.avatar)}
                      alt={selectedUser.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {selectedUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{selectedUser.name}</span>
                  <button
                    onClick={() => removeSelectedUser(selectedUser.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Button (only for group mode) */}
      {chatMode === 'group' && (
        <div className="px-4 py-3 border-b sm:px-6 border-border/50 bg-background/50">
          <div className="max-w-xl mx-auto">
            <Button
              onClick={handleCreateGroupChat}
              disabled={
                creatingChatRoom ||
                selectedUsers.length < 1 ||
                !groupName.trim()
              }
              className="w-full h-11 rounded-xl"
            >
              {creatingChatRoom ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Create Group ({selectedUsers.length} member
              {selectedUsers.length !== 1 ? 's' : ''})
            </Button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="px-4 py-4 border-b sm:px-6 border-border/50 bg-background/50">
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-12 pl-12 text-base border rounded-xl bg-muted/50 border-border/50 focus:bg-background"
              autoFocus
            />
            {searchLoading && (
              <Loader2 className="absolute w-5 h-5 -translate-y-1/2 right-4 top-1/2 animate-spin text-primary" />
            )}
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Search Results Section */}
        {(searchLoading ||
          (searchResults && searchResults.length > 0) ||
          (debouncedSearchQuery && debouncedSearchQuery.length >= 2)) && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 sm:px-6">
              <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Search Results
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 sm:px-6">
                {searchLoading ? (
                  <LoadingState />
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults
                      .filter(candidate => candidate.id !== user?.id)
                      .map(candidate => (
                        <UserCard
                          key={candidate.id}
                          user={candidate}
                          isOnline={isOnline(candidate.id)}
                          onStartChat={() =>
                            handleCreateDirectChat(candidate.id, candidate.name)
                          }
                          onToggleSelect={() => toggleUserSelection(candidate)}
                          isSelected={isUserSelected(candidate.id)}
                          isGroupMode={chatMode === 'group'}
                          isLoading={
                            creatingChatRoom &&
                            pendingChatUserId === candidate.id
                          }
                          disabled={creatingChatRoom}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Search}
                    title="No users found"
                    description={`No results for "${searchQuery}". Try a different search.`}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Friends Section - Always visible when not searching */}
        {!debouncedSearchQuery || debouncedSearchQuery.length < 2 ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 sm:px-6">
              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                <Users2 className="w-3.5 h-3.5" />
                Your Friends
                {friends.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary border-0"
                  >
                    {friends.length}
                  </Badge>
                )}
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-4 pb-6 sm:px-6">
                {friendshipsLoading ? (
                  <LoadingState />
                ) : friends.length > 0 ? (
                  <div className="space-y-2">
                    {friends.map(friend => (
                      <UserCard
                        key={friend.id}
                        user={friend}
                        isOnline={isOnline(friend.id)}
                        onStartChat={() =>
                          handleCreateDirectChat(friend.id, friend.name)
                        }
                        onToggleSelect={() => toggleUserSelection(friend)}
                        isSelected={isUserSelected(friend.id)}
                        isGroupMode={chatMode === 'group'}
                        isLoading={
                          creatingChatRoom && pendingChatUserId === friend.id
                        }
                        disabled={creatingChatRoom}
                        isFriend
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users2}
                    title="No friends yet"
                    description="Add friends to quickly start conversations with them."
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}

        {/* Default state when no search */}
        {!debouncedSearchQuery && friends.length === 0 && !friendshipsLoading && (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// User Card Component
function UserCard({
  user,
  isOnline,
  onStartChat,
  onToggleSelect,
  isSelected,
  isGroupMode,
  isLoading,
  disabled,
  isFriend,
}: {
  user: User;
  isOnline: boolean;
  onStartChat: () => void;
  onToggleSelect: () => void;
  isSelected: boolean;
  isGroupMode: boolean;
  isLoading: boolean;
  disabled: boolean;
  isFriend?: boolean;
}) {
  const handleClick = () => {
    if (isGroupMode) {
      onToggleSelect();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 transition-colors border rounded-xl bg-card border-border/50 hover:bg-accent/50 sm:p-4 ${
        isGroupMode ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={handleClick}
    >
      {isGroupMode && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect()}
          onClick={e => e.stopPropagation()}
          className="shrink-0"
        />
      )}
      <div className="relative">
        <Avatar className="w-10 h-10 border sm:w-12 sm:h-12 border-border/50">
          <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
          <AvatarFallback className="text-sm font-semibold sm:text-base bg-primary/10 text-primary">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full sm:w-3.5 sm:h-3.5 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate sm:text-base text-foreground">
          {user.name}
        </h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isOnline ? (
            <span className="font-medium text-green-500">Online</span>
          ) : (
            <span>Offline</span>
          )}
          {isFriend && (
            <>
              <span className="text-border">•</span>
              <span>Friend</span>
            </>
          )}
        </p>
      </div>
      {!isGroupMode && (
        <Button
          size="sm"
          onClick={onStartChat}
          disabled={disabled}
          className="rounded-lg h-9 shrink-0 sm:h-10"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <MessageSquarePlus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Chat</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex items-center justify-center mb-4 border w-14 h-14 rounded-2xl bg-muted/50 border-border/50">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
