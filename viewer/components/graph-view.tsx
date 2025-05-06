"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <Skeleton className="h-[700px] w-full rounded-md" />,
})

// Graph data interfaces
interface GraphNode {
  id: string
  type: string
  title: string
  properties: Record<string, any>
  color: string
  size: number
  x?: number
  y?: number
}

interface GraphLink {
  id: string
  source: string
  target: string
  type: string
  color: string
  properties: Record<string, any>
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export default function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [filters, setFilters] = useState({
    nodeTypes: new Set<string>(),
    linkTypes: new Set<string>(),
  })

  const graphRef = useRef<any>(null)

  // Get unique node and link types for filtering
  const nodeTypes = Array.from(new Set(graphData.nodes.map((node) => node.type)))
  const linkTypes = Array.from(new Set(graphData.links.map((link) => link.type)))

  const fetchGraphData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Mock data for demonstration
      const nodes: GraphNode[] = [
        // Posts
        {
          id: "p1",
          type: "Post",
          title: "Learning React Basics",
          properties: {
            content: "React is a JavaScript library for building user interfaces.",
            author: "John Doe",
            created: "2023-05-15",
          },
          color: "#ff7e5f",
          size: 8,
        },
        {
          id: "p2",
          type: "Post",
          title: "Advanced TypeScript Patterns",
          properties: {
            content: "TypeScript adds static typing to JavaScript.",
            author: "Jane Smith",
            created: "2023-06-22",
          },
          color: "#ff7e5f",
          size: 8,
        },
        {
          id: "p3",
          type: "Post",
          title: "Building with Next.js",
          properties: {
            content: "Next.js is a React framework for production.",
            author: "John Doe",
            created: "2023-07-10",
          },
          color: "#ff7e5f",
          size: 8,
        },
        // Tags
        {
          id: "t1",
          type: "Tag",
          title: "React",
          properties: {
            category: "Framework",
            popularity: 95,
          },
          color: "#1e88e5",
          size: 6,
        },
        {
          id: "t2",
          type: "Tag",
          title: "TypeScript",
          properties: {
            category: "Language",
            popularity: 88,
          },
          color: "#1e88e5",
          size: 6,
        },
        {
          id: "t3",
          type: "Tag",
          title: "Next.js",
          properties: {
            category: "Framework",
            popularity: 82,
          },
          color: "#1e88e5",
          size: 6,
        },
        {
          id: "t4",
          type: "Tag",
          title: "JavaScript",
          properties: {
            category: "Language",
            popularity: 92,
          },
          color: "#1e88e5",
          size: 6,
        },
      ]

      const links: GraphLink[] = [
        // Post to Tag relationships
        {
          id: "r1",
          source: "p1",
          target: "t1",
          type: "HAS_TAG",
          color: "#2563eb",
          properties: { relevance: 0.95 },
        },
        {
          id: "r2",
          source: "p1",
          target: "t4",
          type: "HAS_TAG",
          color: "#2563eb",
          properties: { relevance: 0.9 },
        },
        {
          id: "r3",
          source: "p2",
          target: "t2",
          type: "HAS_TAG",
          color: "#2563eb",
          properties: { relevance: 0.98 },
        },
        {
          id: "r4",
          source: "p2",
          target: "t4",
          type: "HAS_TAG",
          color: "#2563eb",
          properties: { relevance: 0.88 },
        },
        {
          id: "r5",
          source: "p3",
          target: "t1",
          type: "HAS_TAG",
          color: "#2563eb",
          properties: { relevance: 0.92 },
        },
        {
          id: "r6",
          source: "p3",
          target: "t3",
          type: "HAS_TAG",
          color: "#2563eb",
          properties: { relevance: 0.96 },
        },
        // Tag to Tag relationships
        {
          id: "r7",
          source: "t1",
          target: "t3",
          type: "RELATED_TO",
          color: "#10b981",
          properties: { strength: 0.9 },
        },
        {
          id: "r8",
          source: "t1",
          target: "t4",
          type: "RELATED_TO",
          color: "#10b981",
          properties: { strength: 0.85 },
        },
        {
          id: "r9",
          source: "t2",
          target: "t4",
          type: "RELATED_TO",
          color: "#10b981",
          properties: { strength: 0.92 },
        },
      ]

      setGraphData({ nodes, links })
    } catch (err) {
      setError("Failed to load graph data. Please try again later.")
      console.error("Error fetching graph data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    setSelectedLink(null)
  }, [])

  const handleLinkClick = useCallback((link: GraphLink) => {
    setSelectedLink(link)
    setSelectedNode(null)
  }, [])

  const closeDetailsPanel = useCallback(() => {
    setSelectedNode(null)
    setSelectedLink(null)
  }, [])

  const toggleFilter = useCallback((type: "nodeTypes" | "linkTypes", value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      if (newFilters[type].has(value)) {
        newFilters[type].delete(value)
      } else {
        newFilters[type].add(value)
      }
      return newFilters
    })
  }, [])

  // Apply filters to nodes and links
  const filteredData = {
    nodes:
      filters.nodeTypes.size > 0 ? graphData.nodes.filter((node) => filters.nodeTypes.has(node.type)) : graphData.nodes,
    links:
      filters.linkTypes.size > 0 ? graphData.links.filter((link) => filters.linkTypes.has(link.type)) : graphData.links,
  }

  // If node filters are active, only show links between visible nodes
  if (filters.nodeTypes.size > 0) {
    const visibleNodeIds = new Set(filteredData.nodes.map((n) => n.id))
    filteredData.links = filteredData.links.filter(
      (link) => visibleNodeIds.has(link.source as string) && visibleNodeIds.has(link.target as string),
    )
  }

  const resetFilters = useCallback(() => {
    setFilters({
      nodeTypes: new Set<string>(),
      linkTypes: new Set<string>(),
    })
  }, [])

  const centerGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400)
    }
  }, [])

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="show-labels" checked={showLabels} onCheckedChange={setShowLabels} />
            <Label htmlFor="show-labels">Show labels</Label>
          </div>

          <Button variant="outline" size="sm" onClick={centerGraph}>
            Center Graph
          </Button>

          {(filters.nodeTypes.size > 0 || filters.linkTypes.size > 0) && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {nodeTypes.map((type) => (
            <Badge
              key={`node-${type}`}
              variant={filters.nodeTypes.has(type) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFilter("nodeTypes", type)}
            >
              {type}
            </Badge>
          ))}
          {linkTypes.map((type) => (
            <Badge
              key={`link-${type}`}
              variant={filters.linkTypes.has(type) ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => toggleFilter("linkTypes", type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      <div className="w-full h-[700px] rounded-md border border-border bg-[#f8fafc] relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="h-[600px] w-[600px] rounded-md" />
          </div>
        ) : (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={filteredData}
              nodeLabel={(node: GraphNode) => `${node.type}: ${node.title}`}
              nodeColor={(node: GraphNode) => node.color}
              nodeVal={(node: GraphNode) => node.size}
              linkColor={(link: GraphLink) => link.color}
              linkWidth={1.5}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={0.9}
              linkLabel={(link: GraphLink) => (showLabels ? link.type : "")}
              linkCurvature={0.25}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              nodeCanvasObject={(node: GraphNode, ctx, globalScale) => {
                const fontSize = 12 / globalScale
                const isPost = node.type === "Post"

                ctx.beginPath()
                if (isPost) {
                  // Rectangle for Post nodes
                  const width = node.size * 1.5
                  const height = node.size * 0.8
                  ctx.fillStyle = node.color
                  ctx.fillRect(node.x! - width / 2, node.y! - height / 2, width, height)
                } else {
                  // Circle for Tag nodes
                  ctx.fillStyle = node.color
                  ctx.arc(node.x!, node.y!, node.size, 0, 2 * Math.PI)
                  ctx.fill()
                }

                // Node label
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillStyle = "white"
                ctx.font = `${fontSize}px Sans-Serif`
                ctx.fillText(node.id, node.x!, node.y!)

                // Node title if zoomed in
                if (globalScale > 1.2) {
                  ctx.font = `${fontSize * 0.8}px Sans-Serif`
                  ctx.fillText(node.title, node.x!, node.y! + fontSize * 1.2)
                }
              }}
              linkCanvasObjectMode={() => (showLabels ? "after" : undefined)}
              linkCanvasObject={(link: GraphLink, ctx, globalScale) => {
                if (!showLabels) return

                const start = link.source as GraphNode
                const end = link.target as GraphNode

                if (!start.x || !end.x) return

                const textPos = {
                  x: start.x + (end.x - start.x) / 2,
                  y: start.y! + (end.y! - start.y!) / 2,
                }

                // Label background
                const fontSize = 12 / globalScale
                ctx.font = `${fontSize}px Sans-Serif`
                const textWidth = ctx.measureText(link.type).width
                const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.8) as [number, number]

                ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
                ctx.fillRect(
                  textPos.x - bckgDimensions[0] / 2,
                  textPos.y - bckgDimensions[1] / 2,
                  bckgDimensions[0],
                  bckgDimensions[1],
                )

                // Label text
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillStyle = link.color
                ctx.fillText(link.type, textPos.x, textPos.y)
              }}
              cooldownTicks={100}
              width={800}
              height={700}
            />

            {(selectedNode || selectedLink) && (
              <div className="absolute right-0 top-0 w-80 h-full bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-10">
                <div className="sticky top-0 bg-white z-20 border-b border-gray-200">
                  <div className="flex justify-between items-center p-4">
                    <h3 className="text-lg font-semibold">
                      {selectedNode
                        ? `${selectedNode.type}: ${selectedNode.title}`
                        : `Relationship: ${selectedLink?.type}`}
                    </h3>
                    <button onClick={closeDetailsPanel} className="p-1 rounded-full hover:bg-gray-100">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {selectedNode && (
                    <>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">ID</h4>
                        <div className="text-sm font-mono bg-gray-50 p-2 rounded border border-gray-200">
                          {selectedNode.id}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">Properties</h4>
                        {Object.entries(selectedNode.properties).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3 gap-2">
                            <div className="text-sm font-medium text-gray-500">{key}</div>
                            <div className="text-sm col-span-2 break-words">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedLink && (
                    <>
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">From → To</h4>
                        <div className="text-sm bg-gray-50 p-2 rounded border border-gray-200">
                          {typeof selectedLink.source === "string" ? selectedLink.source : selectedLink.source.id} →{" "}
                          {typeof selectedLink.target === "string" ? selectedLink.target : selectedLink.target.id}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-500">Properties</h4>
                        {Object.entries(selectedLink.properties).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-3 gap-2">
                            <div className="text-sm font-medium text-gray-500">{key}</div>
                            <div className="text-sm col-span-2 break-words">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
