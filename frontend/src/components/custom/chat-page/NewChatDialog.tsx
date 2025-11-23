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
  useCreateChatRoomMutation,
  User,
} from '@/services/chatApi';
import { useSearchUsersQuery } from '@/services/userApi';
import { useAppSelector } from '@/app/hooks';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

const NewChatDialog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading } = useSearchUsersQuery(
    { query: searchQuery },
    { skip: !searchQuery }
  );
  
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createChatRoom, { isLoading: creatingChat }] =
    useCreateChatRoomMutation();
  const navigate = useNavigate();

  const currentUser = useAppSelector(state => state.auth.user);

  const filteredUsers = searchResults?.filter(user => user.id !== currentUser?.id) || [];

  const handleUserSelect = (userId: number) => {
    if (isGroup) {
      setSelectedUserIds(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else {
      setSelectedUserIds([userId]);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: isGroup ? groupName.trim() : undefined,
        is_group_chat: isGroup,
        participant_ids: selectedUserIds,
      };
      const chatRoom = await createChatRoom(payload).unwrap();
      // Reset state after successful creation
      setSearchQuery('');
      setIsGroup(false);
      setGroupName('');
      setSelectedUserIds([]);
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
    setSelectedUserIds([]);
    setSearchQuery('');
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
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search users for direct chat"
              />
            </div>
            <UserList
              users={filteredUsers}
              selectedUserIds={selectedUserIds}
              onUserSelect={handleUserSelect}
              isLoading={isLoading}
              searchQuery={searchQuery}
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
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search users for group chat"
              />
            </div>
            <UserList
              users={filteredUsers}
              selectedUserIds={selectedUserIds}
              onUserSelect={handleUserSelect}
              isLoading={isLoading}
              isGroup
              searchQuery={searchQuery}
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSubmit}
            disabled={
              creatingChat ||
              (isGroup
                ? !groupName.trim() || selectedUserIds.length === 0
                : selectedUserIds.length !== 1)
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

interface UserListProps {
  users: User[];
  selectedUserIds: number[];
  onUserSelect: (userId: number) => void;
  isLoading: boolean;
  isGroup?: boolean;
  searchQuery: string;
}

const UserList: React.FC<UserListProps> = ({
  users,
  selectedUserIds,
  onUserSelect,
  isLoading,
  isGroup = false,
  searchQuery,
}) => {
  return (
    <ScrollArea className="h-[300px] rounded-md border p-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div
            className="w-8 h-8 border-b-2 border-primary rounded-full animate-spin"
            aria-label="Loading users"
          ></div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          {searchQuery ? (
            <p>No users found</p>
          ) : (
            <p>Type to search for users</p>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {users.map(user => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center p-2 rounded-md cursor-pointer transition-all ${
                selectedUserIds.includes(user.id)
                  ? 'bg-accent'
                  : 'hover:bg-muted'
              }`}
              onClick={() => onUserSelect(user.id)}
              role="button"
              aria-pressed={selectedUserIds.includes(user.id)}
              aria-label={`Select ${user.name} for ${isGroup ? 'group' : 'direct'} chat`}
            >
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="flex-grow">{user.name}</span>
              {isGroup && (
                <div
                  className={`w-5 h-5 rounded-full border-2 ${selectedUserIds.includes(user.id) ? 'bg-primary border-primary' : 'border-muted'}`}
                  aria-hidden="true"
                >
                  {selectedUserIds.includes(user.id) && (
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
