import React, { createContext, useContext, useCallback, useRef } from "react";
import { MediaAttachment } from "@/types/case";

type MediaCallback = (attachments: MediaAttachment[]) => void;
type GenericCallback = (...args: any[]) => void;

interface MediaCallbackContextType {
  registerCallback: (callback: MediaCallback) => string;
  executeCallback: (callbackId: string, attachments: MediaAttachment[]) => void;
  clearCallback: (callbackId: string) => void;
  registerGenericCallback: (callback: GenericCallback) => string;
  executeGenericCallback: (callbackId: string, ...args: any[]) => void;
}

const MediaCallbackContext = createContext<MediaCallbackContextType | null>(
  null,
);

export function MediaCallbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const callbacksRef = useRef<Map<string, MediaCallback>>(new Map());
  const genericCallbacksRef = useRef<Map<string, GenericCallback>>(new Map());
  const idCounterRef = useRef(0);

  const registerCallback = useCallback((callback: MediaCallback): string => {
    const id = `media_callback_${++idCounterRef.current}`;
    callbacksRef.current.set(id, callback);
    return id;
  }, []);

  const executeCallback = useCallback(
    (callbackId: string, attachments: MediaAttachment[]) => {
      const callback = callbacksRef.current.get(callbackId);
      if (callback) {
        callback(attachments);
        callbacksRef.current.delete(callbackId);
      }
    },
    [],
  );

  const clearCallback = useCallback((callbackId: string) => {
    callbacksRef.current.delete(callbackId);
    genericCallbacksRef.current.delete(callbackId);
  }, []);

  const registerGenericCallback = useCallback(
    (callback: GenericCallback): string => {
      const id = `generic_callback_${++idCounterRef.current}`;
      genericCallbacksRef.current.set(id, callback);
      return id;
    },
    [],
  );

  const executeGenericCallback = useCallback(
    (callbackId: string, ...args: any[]) => {
      const callback = genericCallbacksRef.current.get(callbackId);
      if (callback) {
        try {
          callback(...args);
        } catch (error) {
          console.error("Media callback error:", error);
        }
        genericCallbacksRef.current.delete(callbackId);
      } else {
        console.warn("Media callback not found for id:", callbackId);
      }
    },
    [],
  );

  return (
    <MediaCallbackContext.Provider
      value={{
        registerCallback,
        executeCallback,
        clearCallback,
        registerGenericCallback,
        executeGenericCallback,
      }}
    >
      {children}
    </MediaCallbackContext.Provider>
  );
}

export function useMediaCallback() {
  const context = useContext(MediaCallbackContext);
  if (!context) {
    throw new Error(
      "useMediaCallback must be used within a MediaCallbackProvider",
    );
  }
  return context;
}
