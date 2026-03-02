"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "entry" | "approver" | "admin";
};

type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  users: [],
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        const savedId = localStorage.getItem("currentUserId");
        const saved = data.find((u: User) => u.id === savedId);
        setCurrentUserState(saved || data[0] || null);
        setLoading(false);
      });
  }, []);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    localStorage.setItem("currentUserId", user.id);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, users, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
