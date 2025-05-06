"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Search, X } from "lucide-react"

interface Post {
  id: string
  content: string
  tags: Tag[]
}

interface Tag {
  id: string
  name: string
}

// Add an interface for the API responses
interface TagsApiResponse {
  postId?: string
  tags?: string[]
  [key: string]: any // Allow for other properties
}

// Interface for tag fetch results
interface TagFetchResult {
  postId: string
  tags: string[]
}

export default function FeedView() {
  const [posts, setPosts] = useState<Post[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [useAndLogic, setUseAndLogic] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch posts from API
      const postsResponse = await fetch('/api/posts')
      if (!postsResponse.ok) {
        throw new Error(`Failed to fetch posts: ${postsResponse.statusText}`)
      }
      
      const postsData = await postsResponse.json()
      
      // Prepare posts with content but without tags initially
      const initialPosts = postsData.map((post: any) => ({
        id: post.id,
        content: post.text || 'No content available',
        tags: [] // Will be populated later
      }))
      
      // Create a map to store all unique tags
      const uniqueTags = new Map<string, Tag>()
      
      // Fetch tags for each post
      for (const post of initialPosts) {
        try {
          const tagsResponse = await fetch(`/api/posts/${post.id}/tags`)
          if (tagsResponse.ok) {
            const data = await tagsResponse.json()
            const tagsList = data.tags || []
            
            // Create tag objects
            post.tags = tagsList.map((tagName: string) => {
              const tagObj = { id: tagName, name: tagName }
              uniqueTags.set(tagName, tagObj)
              return tagObj
            })
          }
        } catch (err) {
          console.error(`Error fetching tags for post ${post.id}:`, err)
          // Keep empty tags array for this post
        }
      }
      
      // Update state
      setTags(Array.from(uniqueTags.values()))
      setPosts(initialPosts)
    } catch (err) {
      setError("Failed to load feed data. Please try again later.")
      console.error("Error fetching feed data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSearchQuery("")
  }

  const filteredTags = tags.filter((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredPosts = posts.filter((post) => {
    if (selectedTags.length === 0) return true

    const postTagIds = post.tags.map((tag) => tag.id)

    if (useAndLogic) {
      // AND logic: post must have ALL selected tags
      return selectedTags.every((tagId) => postTagIds.includes(tagId))
    } else {
      // OR logic: post must have ANY of the selected tags
      return selectedTags.some((tagId) => postTagIds.includes(tagId))
    }
  })

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tags..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="filter-logic" checked={useAndLogic} onCheckedChange={setUseAndLogic} />
              <Label htmlFor="filter-logic">{useAndLogic ? "AND logic" : "OR logic"}</Label>
            </div>

            {selectedTags.length > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {loading ? (
            <>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </>
          ) : (
            filteredTags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Posts</h2>
        <span className="text-sm text-muted-foreground">
          {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"} found
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-40 rounded-md" />
            <Skeleton className="h-40 rounded-md" />
            <Skeleton className="h-40 rounded-md" />
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No posts match your current filters.</div>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{post.content}</CardTitle>
                <CardDescription>{post.id}</CardDescription>
              </CardHeader>
              <CardFooter>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
