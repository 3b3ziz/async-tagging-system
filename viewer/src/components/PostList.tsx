import React, { useEffect, useState } from 'react';

interface Post {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  metadata: {
    language: string;
    source: string;
  };
}

interface Tag {
  postId: string;
  tags: string[];
}

const PostList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postTags, setPostTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch posts
        const postsResponse = await fetch('http://localhost:3001/api/posts');
        const postsData = await postsResponse.json();
        setPosts(postsData);

        // Fetch tags for each post
        const tagsData: Record<string, string[]> = {};
        for (const post of postsData) {
          const tagsResponse = await fetch(`http://localhost:3001/api/posts/${post.id}/tags`);
          const tagInfo = await tagsResponse.json();
          tagsData[post.id] = tagInfo.tags;
        }
        setPostTags(tagsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Make sure the server is running.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="post-list">
      <h1>Posts with Tags</h1>
      {posts.map((post) => (
        <div key={post.id} className="post-card">
          <div className="post-header">
            <span className="post-id">Post #{post.id}</span>
            <span className="post-user">by {post.userId}</span>
          </div>
          <p className="post-text">{post.text}</p>
          <div className="post-tags">
            {postTags[post.id] && postTags[post.id].length > 0 ? (
              <>
                <h3>Tags:</h3>
                <div className="tags-container">
                  {postTags[post.id].map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="no-tags">No tags found</p>
            )}
          </div>
          <div className="post-metadata">
            <span>Source: {post.metadata.source}</span>
            <span>Language: {post.metadata.language}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList; 