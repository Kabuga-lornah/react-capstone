import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";

import { MobileAppShell } from "@/components/mobile-app-shell";
import { useAuth } from "@/context/auth";
import {
  createCommunityComment,
  createCommunityPost,
  listCommunityPosts,
  reactToCommunityComment,
  reactToCommunityPost,
  repostCommunityPost,
  updateCurrentUser,
} from "@/lib/api";

type CommunityAuthor = {
  community_alias?: string;
  profile_photo_url?: string;
};

type CommunityComment = {
  id: number;
  body?: string;
  image_url?: string;
  video_url?: string;
  sticker?: string;
  created_at?: string;
  like_count?: number;
  dislike_count?: number;
  user_reaction?: "like" | "dislike" | null;
  author: CommunityAuthor;
};

type CommunityPost = {
  id: number;
  body?: string;
  image_url?: string;
  created_at?: string;
  like_count?: number;
  dislike_count?: number;
  repost_count?: number;
  comment_count?: number;
  user_reaction?: "like" | "dislike" | null;
  user_has_reposted?: boolean;
  comments: CommunityComment[];
  author: CommunityAuthor;
  repost_of?: {
    author_alias?: string;
    body?: string;
    image_url?: string;
  } | null;
};

const formatTime = (value?: string) => {
  if (!value) {
    return "now";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return `${Math.max(1, Math.floor(diffMs / 60000))}m`;
  }

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return date.toLocaleDateString();
};

const STICKERS = ["🐾", "🐶", "🐱", "🦋", "❤️", "✨"];

const createEmptyPostForm = () => ({
  body: "",
  image_url: "",
  mediaOpen: false,
});

const createEmptyCommentDraft = () => ({
  body: "",
  image_url: "",
  video_url: "",
  sticker: "",
  mediaOpen: false,
});

export default function CommunityScreen() {
  const { userData, setAuthenticatedUser } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);
  const [posting, setPosting] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [reactionKey, setReactionKey] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [aliasForm, setAliasForm] = useState(userData?.community_alias || "");
  const [postForm, setPostForm] = useState(createEmptyPostForm());
  const [commentDrafts, setCommentDrafts] = useState<Record<number, ReturnType<typeof createEmptyCommentDraft>>>({});

  const communityAlias = userData?.community_alias || "";

  const loadPosts = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const data = await listCommunityPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (loadError: any) {
      setError(loadError?.message || "Could not load the community feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    setAliasForm(userData?.community_alias || "");
  }, [userData?.community_alias]);

  const feedSubtitle = useMemo(() => {
    if (!userData) {
      return "Read what the community is sharing, then log in when you want to post.";
    }

    if (!communityAlias) {
      return "Pick a community username first so people know you in the feed.";
    }

    return "Share pet updates, react to helpful posts, and keep conversations warm.";
  }, [communityAlias, userData]);

  const handleAliasSave = async () => {
    try {
      setSavingAlias(true);
      setError("");
      const profile = await updateCurrentUser({ community_alias: aliasForm.trim() });
      setAuthenticatedUser(profile);
    } catch (saveError: any) {
      setError(saveError?.message || "Could not save your community name.");
    } finally {
      setSavingAlias(false);
    }
  };

  const handlePostSubmit = async () => {
    try {
      setPosting(true);
      setError("");
      const createdPost = await createCommunityPost({
        body: postForm.body,
        image_url: postForm.image_url,
        category: "general",
      });
      setPosts((currentPosts) => [createdPost, ...currentPosts]);
      setPostForm(createEmptyPostForm());
    } catch (submitError: any) {
      setError(submitError?.message || "Could not publish your post.");
    } finally {
      setPosting(false);
    }
  };

  const handlePostReaction = async (postId: number, value: "like" | "dislike") => {
    try {
      setReactionKey(`post-${postId}-${value}`);
      const updated = await reactToCommunityPost(postId, value);
      setPosts((currentPosts) => currentPosts.map((post) => (post.id === postId ? updated : post)));
    } catch (reactionError: any) {
      setError(reactionError?.message || "Could not update your reaction.");
    } finally {
      setReactionKey("");
    }
  };

  const handleCommentReaction = async (commentId: number, value: "like" | "dislike") => {
    try {
      setReactionKey(`comment-${commentId}-${value}`);
      const updated = await reactToCommunityComment(commentId, value);
      setPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          comments: post.comments.map((comment) => (comment.id === commentId ? updated : comment)),
        })),
      );
    } catch (reactionError: any) {
      setError(reactionError?.message || "Could not update your reaction.");
    } finally {
      setReactionKey("");
    }
  };

  const handleRepost = async (postId: number) => {
    try {
      setReactionKey(`repost-${postId}`);
      const response = await repostCommunityPost(postId);
      setPosts((currentPosts) => {
        const nextPosts = currentPosts
          .filter((post) => post.id !== response?.removed_repost_id)
          .map((post) => (post.id === postId ? response?.post || post : post));

        if (response?.reposted && response?.repost) {
          return [response.repost, ...nextPosts];
        }

        return nextPosts;
      });
    } catch (repostError: any) {
      setError(repostError?.message || "Could not repost right now.");
    } finally {
      setReactionKey("");
    }
  };

  const handleCommentSubmit = async (postId: number) => {
    const draft = commentDrafts[postId] || createEmptyCommentDraft();

    try {
      setCommentingPostId(postId);
      setError("");
      const createdComment = await createCommunityComment(postId, {
        body: draft.body || "",
        image_url: draft.image_url || "",
        video_url: draft.video_url || "",
        sticker: draft.sticker || "",
      });

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [...post.comments, createdComment],
                comment_count: (post.comment_count || post.comments.length || 0) + 1,
              }
            : post,
        ),
      );

      setCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [postId]: createEmptyCommentDraft(),
      }));
    } catch (submitError: any) {
      setError(submitError?.message || "Could not add your reply.");
    } finally {
      setCommentingPostId(null);
    }
  };

  const updateCommentDraft = (
    postId: number,
    patch: Partial<ReturnType<typeof createEmptyCommentDraft>>,
  ) => {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: {
        ...(currentDrafts[postId] || createEmptyCommentDraft()),
        ...patch,
      },
    }));
  };

  const renderPost = ({ item }: { item: CommunityPost }) => {
    const isExpanded = Boolean(expandedComments[item.id]);
    const authorAlias = item.author?.community_alias || "PetPal";

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{authorAlias.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.postMeta}>
            <Text style={styles.authorHandle}>@{authorAlias}</Text>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        </View>

        {item.repost_of ? (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteLabel}>Original post by @{item.repost_of.author_alias || "PetPal"}</Text>
            {item.repost_of.body ? <Text style={styles.quoteText}>{item.repost_of.body}</Text> : null}
            {item.repost_of.image_url ? (
              <Image contentFit="cover" source={{ uri: item.repost_of.image_url }} style={styles.quoteImage} />
            ) : null}
          </View>
        ) : null}

        {item.body ? <Text style={styles.postBody}>{item.body}</Text> : null}
        {item.image_url ? (
          <Image contentFit="cover" source={{ uri: item.image_url }} style={styles.postImage} />
        ) : null}

        <View style={styles.actionRow}>
          <Pressable onPress={() => setExpandedComments((current) => ({ ...current, [item.id]: !current[item.id] }))} style={styles.actionButton}>
            <MaterialCommunityIcons color="#9A7040" name="comment-outline" size={18} />
            <Text style={styles.actionText}>{item.comment_count || item.comments?.length || 0}</Text>
          </Pressable>

          <Pressable
            disabled={!userData || !communityAlias || reactionKey === `repost-${item.id}`}
            onPress={() => handleRepost(item.id)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              color={item.user_has_reposted ? "#D97706" : "#9A7040"}
              name="repeat-variant"
              size={18}
            />
            <Text style={[styles.actionText, item.user_has_reposted ? styles.actionTextActive : null]}>
              {item.repost_count || 0}
            </Text>
          </Pressable>

          <Pressable
            disabled={!userData || reactionKey === `post-${item.id}-like`}
            onPress={() => handlePostReaction(item.id, "like")}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              color={item.user_reaction === "like" ? "#D97706" : "#9A7040"}
              name={item.user_reaction === "like" ? "heart" : "heart-outline"}
              size={18}
            />
            <Text style={[styles.actionText, item.user_reaction === "like" ? styles.actionTextActive : null]}>
              {item.like_count || 0}
            </Text>
          </Pressable>

          <Pressable
            disabled={!userData || reactionKey === `post-${item.id}-dislike`}
            onPress={() => handlePostReaction(item.id, "dislike")}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              color={item.user_reaction === "dislike" ? "#D97706" : "#9A7040"}
              name={item.user_reaction === "dislike" ? "thumb-down" : "thumb-down-outline"}
              size={18}
            />
            <Text style={[styles.actionText, item.user_reaction === "dislike" ? styles.actionTextActive : null]}>
              {item.dislike_count || 0}
            </Text>
          </Pressable>
        </View>

        {isExpanded ? (
          <View style={styles.commentsBlock}>
            {item.comments.map((comment) => {
              const commentAlias = comment.author?.community_alias || "PetPal";

              return (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentHandle}>@{commentAlias}</Text>
                    <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                  </View>
                  {comment.body ? <Text style={styles.commentBody}>{comment.body}</Text> : null}
                  {comment.sticker ? <Text style={styles.commentSticker}>{comment.sticker}</Text> : null}
                  {comment.image_url ? (
                    <Image contentFit="cover" source={{ uri: comment.image_url }} style={styles.commentImage} />
                  ) : null}
                  <View style={styles.commentActions}>
                    <Pressable
                      disabled={!userData || reactionKey === `comment-${comment.id}-like`}
                      onPress={() => handleCommentReaction(comment.id, "like")}
                      style={styles.commentActionButton}
                    >
                      <MaterialCommunityIcons
                        color={comment.user_reaction === "like" ? "#D97706" : "#9A7040"}
                        name={comment.user_reaction === "like" ? "heart" : "heart-outline"}
                        size={16}
                      />
                      <Text style={styles.commentActionText}>{comment.like_count || 0}</Text>
                    </Pressable>

                    <Pressable
                      disabled={!userData || reactionKey === `comment-${comment.id}-dislike`}
                      onPress={() => handleCommentReaction(comment.id, "dislike")}
                      style={styles.commentActionButton}
                    >
                      <MaterialCommunityIcons
                        color={comment.user_reaction === "dislike" ? "#D97706" : "#9A7040"}
                        name={comment.user_reaction === "dislike" ? "thumb-down" : "thumb-down-outline"}
                        size={16}
                      />
                      <Text style={styles.commentActionText}>{comment.dislike_count || 0}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {userData && communityAlias ? (
              <View style={styles.replyComposer}>
                <TextInput
                  multiline
                  onChangeText={(value) => updateCommentDraft(item.id, { body: value })}
                  placeholder="Write a reply..."
                  placeholderTextColor="#B08A58"
                  style={styles.replyInput}
                  value={commentDrafts[item.id]?.body || ""}
                />

                <View style={styles.replyTools}>
                  <Pressable
                    onPress={() =>
                      updateCommentDraft(item.id, {
                        mediaOpen: !(commentDrafts[item.id]?.mediaOpen || false),
                      })
                    }
                    style={styles.replyToolButton}
                  >
                    <MaterialCommunityIcons color="#B66900" name="image-outline" size={16} />
                    <Text style={styles.replyToolText}>
                      {(commentDrafts[item.id]?.mediaOpen || false) ? "Hide media" : "Add media"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.stickerRow}>
                  {STICKERS.map((sticker) => {
                    const isActive = commentDrafts[item.id]?.sticker === sticker;
                    return (
                      <Pressable
                        key={`${item.id}-${sticker}`}
                        onPress={() =>
                          updateCommentDraft(item.id, {
                            sticker: isActive ? "" : sticker,
                          })
                        }
                        style={[styles.stickerButton, isActive ? styles.stickerButtonActive : null]}
                      >
                        <Text style={styles.stickerText}>{sticker}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {commentDrafts[item.id]?.mediaOpen ? (
                  <View style={styles.replyMediaFields}>
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="url"
                      onChangeText={(value) => updateCommentDraft(item.id, { image_url: value })}
                      placeholder="Paste a photo URL"
                      placeholderTextColor="#B08A58"
                      style={styles.replyMediaInput}
                      value={commentDrafts[item.id]?.image_url || ""}
                    />
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="url"
                      onChangeText={(value) => updateCommentDraft(item.id, { video_url: value })}
                      placeholder="Paste a video URL"
                      placeholderTextColor="#B08A58"
                      style={styles.replyMediaInput}
                      value={commentDrafts[item.id]?.video_url || ""}
                    />
                  </View>
                ) : null}

                <Pressable
                  disabled={
                    commentingPostId === item.id ||
                    !(
                      commentDrafts[item.id]?.body?.trim() ||
                      commentDrafts[item.id]?.image_url?.trim() ||
                      commentDrafts[item.id]?.video_url?.trim() ||
                      commentDrafts[item.id]?.sticker
                    )
                  }
                  onPress={() => handleCommentSubmit(item.id)}
                  style={styles.replySend}
                >
                  <Text style={styles.replySendText}>
                    {commentingPostId === item.id ? "..." : "Reply"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <MobileAppShell title="Community" subtitle={feedSubtitle}>
      {userData && !communityAlias ? (
        <View style={styles.aliasBanner}>
          <Text style={styles.aliasTitle}>Choose a community username</Text>
          <Text style={styles.aliasCopy}>
            This is the name people will see when you post or reply.
          </Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setAliasForm}
            placeholder="your_username"
            placeholderTextColor="#B08A58"
            style={styles.aliasInput}
            value={aliasForm}
          />
          <Pressable disabled={savingAlias || !aliasForm.trim()} onPress={handleAliasSave} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{savingAlias ? "Saving..." : "Join community"}</Text>
          </Pressable>
        </View>
      ) : null}

      {userData && communityAlias ? (
        <View style={styles.composerCard}>
          <View style={styles.composerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{communityAlias.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.postMeta}>
              <Text style={styles.authorHandle}>@{communityAlias}</Text>
              <Text style={styles.composerHint}>Share a pet moment, update, or tip.</Text>
            </View>
          </View>

          <TextInput
            multiline
            onChangeText={(value) => setPostForm((current) => ({ ...current, body: value }))}
            placeholder="What is happening with your pet today?"
            placeholderTextColor="#B08A58"
            style={styles.composerInput}
            value={postForm.body}
          />

          <View style={styles.composerToolRow}>
            <Pressable
              onPress={() =>
                setPostForm((current) => ({
                  ...current,
                  mediaOpen: !current.mediaOpen,
                }))
              }
              style={styles.composerToolButton}
            >
              <MaterialCommunityIcons color="#B66900" name="image-outline" size={16} />
              <Text style={styles.composerToolText}>
                {postForm.mediaOpen ? "Hide photo field" : "Add photo"}
              </Text>
            </Pressable>

            <View style={styles.quickMood}>
              {STICKERS.slice(0, 4).map((sticker) => (
                <Text key={`mood-${sticker}`} style={styles.quickMoodText}>
                  {sticker}
                </Text>
              ))}
            </View>
          </View>

          {postForm.mediaOpen ? (
            <TextInput
              autoCapitalize="none"
              keyboardType="url"
              onChangeText={(value) => setPostForm((current) => ({ ...current, image_url: value }))}
              placeholder="Paste a photo URL"
              placeholderTextColor="#B08A58"
              style={styles.composerUrlInput}
              value={postForm.image_url}
            />
          ) : null}

          <Pressable
            disabled={posting || !(postForm.body.trim() || postForm.image_url.trim())}
            onPress={handlePostSubmit}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{posting ? "Posting..." : "Post to community"}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={posts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            onRefresh={() => loadPosts(true)}
            refreshing={refreshing}
            tintColor="#F18700"
          />
        }
        renderItem={renderPost}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#F18700" size="small" />
              <Text style={styles.stateText}>Loading community feed...</Text>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No posts yet.</Text>
              <Text style={styles.stateSubtext}>Be the first to share something warm and helpful.</Text>
            </View>
          )
        }
      />
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  aliasBanner: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 18,
    gap: 10,
    marginBottom: 14,
  },
  aliasTitle: {
    color: "#2C1700",
    fontSize: 20,
    fontWeight: "900",
  },
  aliasCopy: {
    color: "#7D6542",
    fontSize: 14,
    lineHeight: 20,
  },
  aliasInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "#FFFFFF",
    color: "#1C1207",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  composerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 18,
    gap: 12,
    marginBottom: 14,
  },
  composerHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  composerHint: {
    color: "#8B7049",
    fontSize: 12,
  },
  composerToolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  composerToolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.2)",
    backgroundColor: "#FFF7EA",
    paddingHorizontal: 14,
  },
  composerToolText: {
    color: "#B66900",
    fontSize: 12,
    fontWeight: "800",
  },
  quickMood: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  quickMoodText: {
    fontSize: 14,
    opacity: 0.85,
  },
  composerInput: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "#FFFDF9",
    color: "#1C1207",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: "top",
  },
  composerUrlInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "#FFFFFF",
    color: "#1C1207",
    fontSize: 14,
    paddingHorizontal: 16,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F2BDBD",
    backgroundColor: "#FFF1F1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 28,
    gap: 12,
  },
  postCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 18,
    gap: 12,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFE8BA",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#9C5F00",
    fontSize: 16,
    fontWeight: "900",
  },
  postMeta: {
    flex: 1,
  },
  authorHandle: {
    color: "#2C1700",
    fontSize: 14,
    fontWeight: "900",
  },
  timeText: {
    color: "#9A7040",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  quoteCard: {
    borderRadius: 18,
    backgroundColor: "#FFF7EA",
    padding: 14,
    gap: 8,
  },
  quoteLabel: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "800",
  },
  quoteText: {
    color: "#6F5230",
    fontSize: 13,
    lineHeight: 20,
  },
  quoteImage: {
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#FEE9BF",
  },
  postBody: {
    color: "#2B1807",
    fontSize: 14,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 240,
    borderRadius: 20,
    backgroundColor: "#FEE9BF",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,154,35,0.1)",
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  actionText: {
    color: "#9A7040",
    fontSize: 12,
    fontWeight: "800",
  },
  actionTextActive: {
    color: "#D97706",
  },
  commentsBlock: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,154,35,0.1)",
    paddingTop: 12,
  },
  commentCard: {
    borderRadius: 18,
    backgroundColor: "#FFFDF9",
    padding: 12,
    gap: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  commentHandle: {
    color: "#8A5200",
    fontSize: 12,
    fontWeight: "800",
  },
  commentTime: {
    color: "#A27A48",
    fontSize: 11,
    fontWeight: "700",
  },
  commentBody: {
    color: "#5F4321",
    fontSize: 13,
    lineHeight: 20,
  },
  commentSticker: {
    fontSize: 20,
  },
  commentImage: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    backgroundColor: "#FEE9BF",
  },
  commentActions: {
    flexDirection: "row",
    gap: 14,
  },
  commentActionButton: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  commentActionText: {
    color: "#9A7040",
    fontSize: 11,
    fontWeight: "800",
  },
  replyComposer: {
    gap: 10,
  },
  replyTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  replyToolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "#FFF7EA",
    paddingHorizontal: 12,
  },
  replyToolText: {
    color: "#B66900",
    fontSize: 12,
    fontWeight: "800",
  },
  stickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stickerButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "#FFFDF9",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerButtonActive: {
    backgroundColor: "#FFF1D8",
    borderColor: "rgba(245,154,35,0.3)",
  },
  stickerText: {
    fontSize: 16,
  },
  replyMediaFields: {
    gap: 8,
  },
  replyMediaInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "#FFFFFF",
    color: "#1C1207",
    fontSize: 13,
    paddingHorizontal: 14,
  },
  replyInput: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "#FFFFFF",
    color: "#1C1207",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  replySend: {
    alignSelf: "flex-end",
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: "#FFF1D8",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  replySendText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "800",
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    paddingHorizontal: 18,
    paddingVertical: 30,
    backgroundColor: "rgba(255,255,255,0.55)",
    marginTop: 12,
  },
  stateText: {
    color: "#7A5C35",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },
  stateSubtext: {
    color: "#A27A48",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
  },
});
