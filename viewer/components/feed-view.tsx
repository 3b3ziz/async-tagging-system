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
      // In a real app, this would fetch from the actual API
      // const response = await fetch("http://localhost:3001/api/feed")
      // const data = await response.json()

      // For demo purposes, we'll use mock data
      const mockTags: Tag[] = [
        { id: "t1", name: "React" },
        { id: "t2", name: "TypeScript" },
        { id: "t3", name: "Next.js" },
        { id: "t4", name: "CSS" },
        { id: "t5", name: "Frontend" },
        { id: "t6", name: "Backend" },
        { id: "t7", name: "JavaScript" },
        { id: "t8", name: "UI/UX" },
      ]

      const mockPosts: Post[] = [
        {
          id: "p1",
          content: "Learning React basics and building my first component",
          tags: [mockTags[0], mockTags[4], mockTags[6]],
        },
        {
          id: "p2",
          content: "Advanced TypeScript patterns for better type safety",
          tags: [mockTags[1], mockTags[4], mockTags[6]],
        },
        {
          id: "p3",
          content: "Building with Next.js: Server components and data fetching",
          tags: [mockTags[0], mockTags[2], mockTags[4]],
        },
        {
          id: "p4",
          content: "CSS Grid layouts for responsive designs",
          tags: [mockTags[3], mockTags[4], mockTags[7]],
        },
        {
          id: "p5",
          content: "React hooks deep dive: useEffect, useMemo, and useCallback",
          tags: [mockTags[0], mockTags[4], mockTags[6]],
        },
        {
          id: "p6",
          content: "Building a REST API with Node.js and Express",
          tags: [mockTags[5], mockTags[6]],
        },
        {
          id: "p7",
          content: "Designing user interfaces with Figma",
          tags: [mockTags[7], mockTags[4]],
        },
      ]

      setTags(mockTags)
      setPosts(mockPosts)
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
