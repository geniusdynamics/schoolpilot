
import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';
import { User, UserType } from '../types';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Mock a logged-in user for development
    // In a real app, you'd check localStorage or an auth service
    return {
      id: 'USR_MOCK_ADMIN',
      username: 'admin_user',
      email: 'admin@example.com',
      user_type: UserType.STAFF, 
      is_active: true,
      role: 'Administrator', 
      display_name: 'Admin User (Mock)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};