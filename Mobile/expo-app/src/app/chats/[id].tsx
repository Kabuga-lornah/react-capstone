import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getAccessToken,
  getConversationDetail,
  sendConversationMessage,
} from "@/lib/api";

type MessageRecord = {
  id: number;
  body: string;
  is_mine: boolean;
  created_at?: string;
};

type ConversationRecord = {
  id: number;
  pet?: {
    id?: number;
    name?: string;
    images?: Array<{ image_url?: string; image?: string; is_main?: boolean }>;
  } | null;
  other_participant?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    email?: string;
  } | null;
  unread_count?: number;
  messages?: MessageRecord[];
};

const getConversationImage = (conversation: ConversationRecord | null) => {
  const images = Array.isArray(conversation?.pet?.images) ? conversation?.pet?.images : [];
  const main = images.find((image) => image.is_main);
  const fallback = images[0];

  return (
    main?.image_url ||
    fallback?.image_url ||
    main?.image ||
    fallback?.image ||
    "https://placehold.co/400x400/FEE9BF/8E5A14?text=Chat"
  );
};

const getParticipantName = (conversation: ConversationRecord | null) => {
  const participant = conversation?.other_participant;
  if (!participant) {
    return "Conversation";
  }

  const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim();
  return fullName || participant.username || participant.email || "Conversation";
};

const formatMessageTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [conversation, setConversation] = useState<ConversationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const hasSession = Boolean(getAccessToken());

  const messages = useMemo(
    () => (Array.isArray(conversation?.messages) ? conversation?.messages : []),
    [conversation],
  );

  const fetchConversation = async () => {
    if (!id) {
      setErrorMessage("Conversation not found.");
      setLoading(false);
      return;
    }

    if (!getAccessToken()) {
      setConversation(null);
      setErrorMessage("");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getConversationDetail(id);
      setConversation(response);
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not load this conversation.");
      setConversation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
  }, [id]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!id || !body || sending) {
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");
      const updatedConversation = await sendConversationMessage(id, { body });
      setConversation(updatedConversation);
      setDraft("");
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not send your message.");
    } finally {
      setSending(false);
    }
  };

  if (!hasSession) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Your session expired on this device.</Text>
          <Text style={styles.stateBody}>
            Log in again and your chat history will be available here.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <ActivityIndicator color="#F18700" size="small" />
          <Text style={styles.stateTitle}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !conversation) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{errorMessage || "Conversation not found."}</Text>
          <Pressable onPress={() => fetchConversation()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <View style={styles.headerMain}>
            <Image contentFit="cover" source={{ uri: getConversationImage(conversation) }} style={styles.headerImage} />
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {getParticipantName(conversation)}
              </Text>
              <Text numberOfLines={1} style={styles.headerSubtitle}>
                About {conversation.pet?.name || "this pet"}
              </Text>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.messagesContent} style={styles.messagesWrap}>
          {messages.length > 0 ? (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.is_mine ? styles.myMessageBubble : styles.theirMessageBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.is_mine ? styles.myMessageText : styles.theirMessageText,
                  ]}
                >
                  {message.body}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.is_mine ? styles.myMessageTime : styles.theirMessageTime,
                  ]}
                >
                  {formatMessageTime(message.created_at)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.stateTitle}>No messages yet.</Text>
              <Text style={styles.stateBody}>
                Send the first message to start the conversation about {conversation.pet?.name || "this pet"}.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder="Write a message..."
            placeholderTextColor="#B08A58"
            style={styles.input}
            value={draft}
          />
          <Pressable
            disabled={sending || !draft.trim()}
            onPress={handleSend}
            style={[
              styles.sendButton,
              sending || !draft.trim() ? styles.sendButtonDisabled : null,
            ]}
          >
            <Text style={styles.sendButtonText}>{sending ? "Sending..." : "Send"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,154,35,0.12)",
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  backButtonText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "800",
  },
  headerMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FEE9BF",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: "#261307",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#8B6A42",
    fontSize: 13,
    fontWeight: "700",
  },
  inlineError: {
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F6C87A",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineErrorText: {
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  messagesWrap: {
    flex: 1,
  },
  messagesContent: {
    padding: 18,
    gap: 10,
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  myMessageBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#F18700",
    borderBottomRightRadius: 8,
  },
  theirMessageBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    borderBottomLeftRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  theirMessageText: {
    color: "#3A2208",
  },
  messageTime: {
    fontSize: 11,
    fontWeight: "700",
    alignSelf: "flex-end",
  },
  myMessageTime: {
    color: "rgba(255,255,255,0.8)",
  },
  theirMessageTime: {
    color: "#A27A48",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,154,35,0.12)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(210,160,60,0.35)",
    backgroundColor: "#FFFFFF",
    color: "#2A1500",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: "top",
  },
  sendButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F18700",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.65,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  stateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    color: "#7A5C35",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateBody: {
    color: "#A27A48",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F18700",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 10,
  },
});
