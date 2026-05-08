import React, { useEffect, useState } from "react";
import {
  createCommunityComment,
  createCommunityPost,
  listCommunityPosts,
  reactToCommunityComment,
  reactToCommunityPost,
  repostCommunityPost,
  updateCurrentUser,
} from "../../services/api";
import { useAuth } from "./AuthContext";
import "./Community.css";

const STICKERS = ["\uD83D\uDC3E", "\uD83D\uDC36", "\uD83D\uDC31", "\uD83E\uDD8B", "\u2764\uFE0F", "\u2728"];

const formatTime = (value) => {
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

const createEmptyCommentDraft = () => ({
  body: "",
  image_url: "",
  video_url: "",
  sticker: "",
  mediaOpen: false,
});

const createEmptyPostForm = () => ({
  body: "",
  image_url: "",
  mediaOpen: false,
});

const HeartIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ThumbDownIcon = ({ filled }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

const RepostIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const CommentIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const Community = () => {
  const { user, userData, setAuthenticatedUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState(null);
  const [reactionKey, setReactionKey] = useState("");
  const [aliasForm, setAliasForm] = useState(userData?.community_alias || "");
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [postForm, setPostForm] = useState(createEmptyPostForm());
  const [commentDrafts, setCommentDrafts] = useState({});

  const communityAlias = userData?.community_alias || "";

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await listCommunityPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Could not load the community feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    setAliasForm(userData?.community_alias || "");
  }, [userData?.community_alias]);

  const handleAliasSave = async (event) => {
    event.preventDefault();

    try {
      setSavingAlias(true);
      setError("");
      const profile = await updateCurrentUser({ community_alias: aliasForm });
      setAuthenticatedUser(profile);
    } catch (saveError) {
      setError(saveError.message || "Could not save your community name.");
    } finally {
      setSavingAlias(false);
    }
  };

  const handlePostSubmit = async (event) => {
    event.preventDefault();

    try {
      setPostSubmitting(true);
      setError("");
      const createdPost = await createCommunityPost({
        body: postForm.body,
        image_url: postForm.image_url,
        category: "general",
      });
      setPosts((currentPosts) => [createdPost, ...currentPosts]);
      setPostForm(createEmptyPostForm());
      setComposerOpen(false);
    } catch (submitError) {
      setError(submitError.message || "Could not publish your post.");
    } finally {
      setPostSubmitting(false);
    }
  };

  const handlePostReaction = async (postId, value) => {
    try {
      setReactionKey(`post-${postId}-${value}`);
      const updated = await reactToCommunityPost(postId, value);
      setPosts((currentPosts) => currentPosts.map((post) => (post.id === postId ? updated : post)));
    } catch (reactionError) {
      setError(reactionError.message || "Could not update your reaction.");
    } finally {
      setReactionKey("");
    }
  };

  const handleCommentReaction = async (commentId, value) => {
    try {
      setReactionKey(`comment-${commentId}-${value}`);
      const updated = await reactToCommunityComment(commentId, value);
      setPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          comments: post.comments.map((comment) => (comment.id === commentId ? updated : comment)),
        }))
      );
    } catch (reactionError) {
      setError(reactionError.message || "Could not update your reaction.");
    } finally {
      setReactionKey("");
    }
  };

  const handleRepost = async (postId) => {
    try {
      setReactionKey(`repost-${postId}`);
      const response = await repostCommunityPost(postId);
      setPosts((currentPosts) => {
        const nextPosts = currentPosts
          .filter((post) => post.id !== response.removed_repost_id)
          .map((post) => (post.id === postId ? response.post || post : post));

        if (response.reposted && response.repost) {
          return [response.repost, ...nextPosts];
        }

        return nextPosts;
      });
    } catch (repostError) {
      setError(repostError.message || "Could not repost right now.");
    } finally {
      setReactionKey("");
    }
  };

  const handleCommentSubmit = async (event, postId) => {
    event.preventDefault();
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
                comment_count: (post.comment_count || 0) + 1,
              }
            : post
        )
      );

      setCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [postId]: createEmptyCommentDraft(),
      }));
    } catch (submitError) {
      setError(submitError.message || "Could not add your reply.");
    } finally {
      setCommentingPostId(null);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((currentExpanded) => ({
      ...currentExpanded,
      [postId]: !currentExpanded[postId],
    }));
  };

  const updateCommentDraft = (postId, patch) => {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [postId]: {
        ...(currentDrafts[postId] || createEmptyCommentDraft()),
        ...patch,
      },
    }));
  };

  return (
    <div className="community-feed-shell">
      <header className="community-header">
        <h1 className="community-header__title">Community</h1>
        {user && communityAlias ? (
          <button type="button" className="community-fab" onClick={() => setComposerOpen(true)}>
            +
          </button>
        ) : null}
      </header>

      {user && communityAlias ? (
        <section className="community-quick-share">
          <div className="community-tweet__avatar">
            {communityAlias.charAt(0).toUpperCase()}
          </div>
          <button type="button" className="community-quick-share__prompt" onClick={() => setComposerOpen(true)}>
            Share a pet update or a helpful tip
          </button>
        </section>
      ) : null}

      {composerOpen && user && communityAlias ? (
        <div className="community-composer-overlay" onClick={() => setComposerOpen(false)}>
          <section className="community-composer-card" onClick={(event) => event.stopPropagation()}>
            <div className="community-composer-card__header">
              <div className="community-composer-card__top">
                <div className="community-tweet__avatar">
                  {communityAlias.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="community-composer-alias">@{communityAlias}</span>
                  <p className="community-composer-card__hint">Share a story, a tip, or a quick pet moment.</p>
                </div>
              </div>
              <button type="button" className="community-composer-close" onClick={() => setComposerOpen(false)}>
                Close
              </button>
            </div>

            <form onSubmit={handlePostSubmit}>
              <textarea
                className="community-composer-textarea"
                value={postForm.body}
                onChange={(event) => setPostForm((currentForm) => ({ ...currentForm, body: event.target.value }))}
                placeholder="What is happening with your pet today?"
                autoFocus
              />

              <div className="community-composer-tools">
                <button
                  type="button"
                  className="community-reply-tool"
                  onClick={() =>
                    setPostForm((currentForm) => ({
                      ...currentForm,
                      mediaOpen: !currentForm.mediaOpen,
                    }))
                  }
                >
                  Add photo
                </button>
              </div>

              {postForm.mediaOpen ? (
                <input
                  className="community-composer-url"
                  type="url"
                  value={postForm.image_url}
                  onChange={(event) => setPostForm((currentForm) => ({ ...currentForm, image_url: event.target.value }))}
                  placeholder="Paste a photo URL"
                />
              ) : null}

              <div className="community-composer-card__actions">
                <button type="button" className="community-btn-ghost" onClick={() => setComposerOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="community-btn-primary"
                  disabled={postSubmitting || !(postForm.body.trim() || postForm.image_url.trim())}
                >
                  {postSubmitting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {user && !communityAlias ? (
        <section className="community-alias-banner">
          <p>Pick a username first so people know you in the feed.</p>
          <form className="community-alias-form" onSubmit={handleAliasSave}>
            <input type="text" value={aliasForm} onChange={(event) => setAliasForm(event.target.value)} placeholder="Your username" />
            <button type="submit" className="community-btn-primary" disabled={savingAlias}>
              {savingAlias ? "Saving..." : "Join"}
            </button>
          </form>
        </section>
      ) : null}

      {error ? <div className="community-inline-error">{error}</div> : null}

      <section className="community-feed-list">
        {loading ? (
          <div className="community-feed-empty">
            <div className="community-spinner" />
            <span>Loading feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="community-feed-empty">
            <span className="community-feed-empty__icon">{`\uD83D\uDC3E`}</span>
            <span>No posts yet. Be the first to share.</span>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className={`community-tweet${post.repost_of ? " community-tweet--repost" : ""}`}
            >
              {post.repost_of ? (
                <div className="community-tweet__repost-banner">
                  <RepostIcon />
                  <span>@{post.author.community_alias} reposted this</span>
                </div>
              ) : null}

              <div className="community-tweet__header">
                <div className="community-tweet__avatar">
                  {(post.author.community_alias || "P").charAt(0).toUpperCase()}
                </div>
                <div className="community-tweet__meta">
                  <strong>@{post.author.community_alias}</strong>
                  <span className="community-tweet__time">{formatTime(post.created_at)}</span>
                </div>
              </div>

              {post.repost_of ? (
                <div className="community-tweet__quoted">
                  <span className="community-tweet__quoted-label">Original post</span>
                  <span className="community-tweet__quoted-author">@{post.repost_of.author_alias}</span>
                  <p>{post.repost_of.body || "Shared a photo update."}</p>
                  {post.repost_of.image_url ? (
                    <img
                      src={post.repost_of.image_url}
                      alt="Original post"
                      className="community-tweet__quoted-image"
                    />
                  ) : null}
                </div>
              ) : null}

              {post.body ? <p className="community-tweet__body">{post.body}</p> : null}
              {post.image_url ? <img src={post.image_url} alt="Post" className="community-tweet__image" /> : null}

              <div className="community-tweet__actions">
                <button
                  type="button"
                  className={`community-action-btn${expandedComments[post.id] ? " is-active" : ""}`}
                  disabled={!user}
                  onClick={() => toggleComments(post.id)}
                >
                  <CommentIcon />
                  <span>{post.comment_count || post.comments?.length || 0}</span>
                </button>

                <button
                  type="button"
                  className={`community-action-btn community-action-btn--repost${post.user_has_reposted ? " is-active" : ""}`}
                  disabled={!user || reactionKey === `repost-${post.id}`}
                  onClick={() => handleRepost(post.id)}
                >
                  <RepostIcon />
                  <span>{post.repost_count || 0}</span>
                </button>

                <button
                  type="button"
                  className={`community-action-btn community-action-btn--like${post.user_reaction === "like" ? " is-active" : ""}`}
                  disabled={!user || reactionKey === `post-${post.id}-like`}
                  onClick={() => handlePostReaction(post.id, "like")}
                >
                  <HeartIcon filled={post.user_reaction === "like"} />
                  <span>{post.like_count || 0}</span>
                </button>

                <button
                  type="button"
                  className={`community-action-btn community-action-btn--dislike${post.user_reaction === "dislike" ? " is-active" : ""}`}
                  disabled={!user || reactionKey === `post-${post.id}-dislike`}
                  onClick={() => handlePostReaction(post.id, "dislike")}
                >
                  <ThumbDownIcon filled={post.user_reaction === "dislike"} />
                  <span>{post.dislike_count || 0}</span>
                </button>
              </div>

              {expandedComments[post.id] ? (
                <div className="community-tweet__comments">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="community-reply">
                      <div className="community-reply__header">
                        <div className="community-reply__avatar">
                          {(comment.author.community_alias || "P").charAt(0).toUpperCase()}
                        </div>
                        <div className="community-reply__meta">
                          <strong>@{comment.author.community_alias}</strong>
                          <span>{formatTime(comment.created_at)}</span>
                        </div>
                      </div>

                      {comment.body ? <p className="community-reply__body">{comment.body}</p> : null}
                      {comment.sticker ? <div className="community-reply__sticker">{comment.sticker}</div> : null}
                      {comment.image_url ? <img src={comment.image_url} alt="Comment attachment" className="community-reply__media" /> : null}
                      {comment.video_url ? (
                        <video controls className="community-reply__media">
                          <source src={comment.video_url} />
                        </video>
                      ) : null}

                      <div className="community-reply__actions">
                        <button
                          type="button"
                          className={`community-action-btn community-action-btn--like${comment.user_reaction === "like" ? " is-active" : ""}`}
                          disabled={!user || reactionKey === `comment-${comment.id}-like`}
                          onClick={() => handleCommentReaction(comment.id, "like")}
                        >
                          <HeartIcon filled={comment.user_reaction === "like"} />
                          <span>{comment.like_count || 0}</span>
                        </button>

                        <button
                          type="button"
                          className={`community-action-btn community-action-btn--dislike${comment.user_reaction === "dislike" ? " is-active" : ""}`}
                          disabled={!user || reactionKey === `comment-${comment.id}-dislike`}
                          onClick={() => handleCommentReaction(comment.id, "dislike")}
                        >
                          <ThumbDownIcon filled={comment.user_reaction === "dislike"} />
                          <span>{comment.dislike_count || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {user && communityAlias ? (
                    <form className="community-reply-form" onSubmit={(event) => handleCommentSubmit(event, post.id)}>
                      <div className="community-reply__avatar community-reply__avatar--small">
                        {communityAlias.charAt(0).toUpperCase()}
                      </div>

                      <div className="community-reply-form__content">
                        <input
                          type="text"
                          value={commentDrafts[post.id]?.body || ""}
                          onChange={(event) => updateCommentDraft(post.id, { body: event.target.value })}
                          placeholder="Write a reply..."
                        />

                        <div className="community-reply-tools">
                          <button
                            type="button"
                            className="community-reply-tool"
                            onClick={() =>
                              updateCommentDraft(post.id, {
                                mediaOpen: !(commentDrafts[post.id]?.mediaOpen || false),
                              })
                            }
                          >
                            Media
                          </button>

                          {STICKERS.map((sticker) => (
                            <button
                              key={sticker}
                              type="button"
                              className={`community-reply-sticker${commentDrafts[post.id]?.sticker === sticker ? " is-active" : ""}`}
                              onClick={() =>
                                updateCommentDraft(post.id, {
                                  sticker: commentDrafts[post.id]?.sticker === sticker ? "" : sticker,
                                })
                              }
                            >
                              {sticker}
                            </button>
                          ))}
                        </div>

                        {commentDrafts[post.id]?.mediaOpen ? (
                          <div className="community-reply-media-fields">
                            <input
                              type="url"
                              value={commentDrafts[post.id]?.image_url || ""}
                              onChange={(event) => updateCommentDraft(post.id, { image_url: event.target.value })}
                              placeholder="Paste a photo URL"
                            />
                            <input
                              type="url"
                              value={commentDrafts[post.id]?.video_url || ""}
                              onChange={(event) => updateCommentDraft(post.id, { video_url: event.target.value })}
                              placeholder="Paste a video URL"
                            />
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="submit"
                        className="community-reply-send"
                        disabled={
                          commentingPostId === post.id ||
                          !(
                            commentDrafts[post.id]?.body?.trim() ||
                            commentDrafts[post.id]?.image_url?.trim() ||
                            commentDrafts[post.id]?.video_url?.trim() ||
                            commentDrafts[post.id]?.sticker
                          )
                        }
                      >
                        {commentingPostId === post.id ? "..." : <SendIcon />}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default Community;
