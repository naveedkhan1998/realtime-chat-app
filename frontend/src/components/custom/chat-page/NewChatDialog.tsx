import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  UserPlus,
  Search,
  Users,
  MessageCircle,
} from 'lucide-react';
import {
  Friendship,
  useCreateChatRoomMutation,
  useGetFriendshipsQuery,
  User,
} from '@/services/chatApi';
import { useAppSelector } from '@/app/hooks';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const NewChatDialog: React.FC = () => {
  const { data: friendships, isLoading } = useGetFriendshipsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createChatRoom, { isLoading: creatingChat }] =
    useCreateChatRoomMutation();
  const navigate = useNavigate();

  const currentUser = useAppSelector(state => state.auth.user);

  const filteredFriends = friendships
    ?.flatMap((friendship: Friendship) =>
      [friendship.user1, friendship.user2].filter(
        user => user.id !== currentUser?.id
      )
    )
    .filter((user): user is User => Boolean(user))
    .reduce<User[]>((acc, user) => {
      if (!user) return acc;
      if (!acc.some(existing => existing.id === user.id)) {
        acc.push(user);
      }
      return acc;
    }, [])
    .filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleFriendSelect = (friendId: number) => {
    if (isGroup) {
      setSelectedFriendIds(prev =>
        prev.includes(friendId)
          ? prev.filter(id => id !== friendId)
          : [...prev, friendId]
      );
    } else {
      setSelectedFriendIds([friendId]);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: isGroup ? groupName.trim() : undefined,
        is_group_chat: isGroup,
        participant_ids: selectedFriendIds,
      };
      const chatRoom = await createChatRoom(payload).unwrap();
      // Reset state after successful creation
      setSearchQuery('');
      setIsGroup(false);
      setGroupName('');
      setSelectedFriendIds([]);
      setIsDialogOpen(false);
      navigate(`/chat/${chatRoom.id}`);
      toast({
        title: isGroup ? 'Group ready' : 'Chat ready',
        description: isGroup
          ? `${chatRoom.name ?? 'Group chat'} is live.`
          : 'Reopening your direct chat.',
      });
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast({
        title: 'Unable to create chat',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const handleTabChange = (value: string) => {
    setIsGroup(value === 'group');
    setSelectedFriendIds([]);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full mb-4 bg-primary text-primary-foreground hover:bg-primary/90">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue="direct"
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">
              <MessageCircle className="w-4 h-4 mr-2" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="w-4 h-4 mr-2" />
              Group
            </TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="space-y-4">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-muted-foreground transform -translate-y-1/2 left-3 top-1/2" />
              <Input
                placeholder="Search friends"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search friends for direct chat"
              />
            </div>
            <FriendList
              friends={filteredFriends || []}
              selectedFriendIds={selectedFriendIds}
              onFriendSelect={handleFriendSelect}
              isLoading={isLoading}
            />
          </TabsContent>
          <TabsContent value="group" className="space-y-4">
            <Input
              placeholder="Enter group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              aria-label="Enter group name"
            />
            <div className="relative">
              <Search className="absolute w-4 h-4 text-muted-foreground transform -translate-y-1/2 left-3 top-1/2" />
              <Input
                placeholder="Search friends"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search friends for group chat"
              />
            </div>
            <FriendList
              friends={filteredFriends || []}
              selectedFriendIds={selectedFriendIds}
              onFriendSelect={handleFriendSelect}
              isLoading={isLoading}
              isGroup
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => navigate('/friends')}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Friends
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              creatingChat ||
              (isGroup
                ? !groupName.trim() || selectedFriendIds.length === 0
                : selectedFriendIds.length !== 1)
            }
            aria-label={isGroup ? 'Start group chat' : 'Start direct chat'}
          >
            {creatingChat ? 'Creating...' : 'Start Chat'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FriendListProps {
  friends: User[];
  selectedFriendIds: number[];
  onFriendSelect: (friendId: number) => void;
  isLoading: boolean;
  isGroup?: boolean;
}

const FriendList: React.FC<FriendListProps> = ({
  friends,
  selectedFriendIds,
  onFriendSelect,
  isLoading,
  isGroup = false,
}) => {
  return (
    <ScrollArea className="h-[300px] rounded-md border p-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div
            className="w-8 h-8 border-b-2 border-primary rounded-full animate-spin"
            aria-label="Loading friends"
          ></div>
        </div>
      ) : (
        <AnimatePresence>
          {friends?.map(friend => (
            <motion.div
              key={friend?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center p-2 rounded-md cursor-pointer transition-all ${
                friend && selectedFriendIds.includes(friend.id)
                  ? 'bg-accent'
                  : 'hover:bg-muted'
              }`}
              onClick={() => friend && onFriendSelect(friend.id)}
              role="button"
              aria-pressed={selectedFriendIds.includes(friend?.id)}
              aria-label={`Select ${friend?.name} for ${isGroup ? 'group' : 'direct'} chat`}
            >
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={friend?.avatar} alt={friend?.name} />
                <AvatarFallback>{friend?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="flex-grow">{friend?.name}</span>
              {isGroup && (
                <div
                  className={`w-5 h-5 rounded-full border-2 ${selectedFriendIds.includes(friend?.id) ? 'bg-primary border-primary' : 'border-muted'}`}
                  aria-hidden="true"
                >
                  {selectedFriendIds.includes(friend?.id) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-full h-full text-primary-foreground"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </ScrollArea>
  );
};

export default NewChatDialog;
