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
import type { NodeObject, LinkObject } from 'react-force-graph-2d';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <Skeleton className="h-[700px] w-full rounded-md" />,
})

// Graph data interfaces
interface GraphNode extends NodeObject {
  id: string
  type: string
  title: string
  properties: Record<string, any>
  color: string
  size: number
}

interface GraphLink extends LinkObject {
  id: string
  source: string | GraphNode
  target: string | GraphNode
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
      const response = await fetch('/api/graph')
      if (!response.ok) {
        throw new Error(`Failed to fetch graph data: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Transform API data to match our component's data structure
      const transformedNodes: GraphNode[] = data.nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        title: node.label,
        properties: {
          text: node.text,
          ...node.properties
        },
        color: node.type === 'post' ? '#ff7e5f' : '#1e88e5',
        size: node.type === 'post' ? 8 : 6
      }))

      const transformedLinks: GraphLink[] = data.links.map((link: any) => ({
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        type: link.type,
        color: link.type === 'HAS_TAG' ? '#2563eb' : '#10b981',
        properties: link.properties || {}
      }))

      setGraphData({ nodes: transformedNodes, links: transformedLinks })
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

  const handleNodeClick = useCallback((node: NodeObject, event: MouseEvent) => {
    setSelectedNode(node as GraphNode)
    setSelectedLink(null)
  }, [])

  const handleLinkClick = useCallback((link: LinkObject, event: MouseEvent) => {
    setSelectedLink(link as GraphLink)
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

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const graphNode = node as GraphNode
    const fontSize = 12 / globalScale
    const isPost = graphNode.type === "Post"

    ctx.beginPath()
    if (isPost) {
      // Rectangle for Post nodes
      const width = graphNode.size * 1.5
      const height = graphNode.size * 0.8
      ctx.fillStyle = graphNode.color
      ctx.fillRect(node.x! - width / 2, node.y! - height / 2, width, height)
    } else {
      // Circle for Tag nodes
      ctx.fillStyle = graphNode.color
      ctx.arc(node.x!, node.y!, graphNode.size, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Node label
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "white"
    ctx.font = `${fontSize}px Sans-Serif`
    ctx.fillText(graphNode.id, node.x!, node.y!)

    // Node title if zoomed in
    if (globalScale > 1.2) {
      ctx.font = `${fontSize * 0.8}px Sans-Serif`
      ctx.fillText(graphNode.title, node.x!, node.y! + fontSize * 1.2)
    }
  }, [])

  const linkCanvasObject = useCallback((link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!showLabels) return

    const graphLink = link as GraphLink
    const start = link.source as NodeObject
    const end = link.target as NodeObject

    if (!start.x || !end.x) return

    const textPos = {
      x: start.x + (end.x - start.x) / 2,
      y: start.y! + (end.y! - start.y!) / 2,
    }

    // Label background
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    const textWidth = ctx.measureText(graphLink.type).width
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
    ctx.fillStyle = graphLink.color
    ctx.fillText(graphLink.type, textPos.x, textPos.y)
  }, [showLabels])

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
              nodeLabel={(node: NodeObject) => `${(node as GraphNode).type}: ${(node as GraphNode).title}`}
              nodeColor={(node: NodeObject) => (node as GraphNode).color}
              nodeVal={(node: NodeObject) => (node as GraphNode).size}
              linkColor={(link: LinkObject) => (link as GraphLink).color}
              linkWidth={1.5}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={0.9}
              linkLabel={(link: LinkObject) => (showLabels ? (link as GraphLink).type : "")}
              linkCurvature={0.25}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              nodeCanvasObject={nodeCanvasObject}
              linkCanvasObjectMode={() => (showLabels ? "after" : undefined)}
              linkCanvasObject={linkCanvasObject}
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
