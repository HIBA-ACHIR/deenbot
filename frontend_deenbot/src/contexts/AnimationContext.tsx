import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnimationContextType {
  displayedMessages: string[];
  markMessageDisplayed: (messageId: string) => void;
}

const AnimationContext = createContext<AnimationContextType>({
  displayedMessages: [],
  markMessageDisplayed: () => {},
});

export const AnimationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>([]);

  const markMessageDisplayed = (messageId: string) => {
    setDisplayedMessages(prev => [...prev, messageId]);
  };

  return (
    <AnimationContext.Provider value={{ displayedMessages, markMessageDisplayed }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimationContext = () => useContext(AnimationContext);
