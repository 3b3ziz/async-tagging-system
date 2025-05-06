import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, Tag, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './src/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './src/components/ui/tabs';
import { Alert, AlertDescription } from './src/components/ui/alert';
import { Skeleton } from './src/components/ui/skeleton';
import { cn } from './src/lib/utils';

// Extended GraphNode type to include position properties that will be added by the force graph
interface GraphNode {
  id: string;
  label: string; // For Tags, this is the tag name. For Posts, this is the ID.
  type: string;
  group: string;
  text?: string; // Add optional text field for posts
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const GraphView: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'graph' | 'stats'>('graph');
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/graph');
        const data = await response.json();
        
        // Process links to use actual node objects as source/target instead of IDs
        const processedData = {
          nodes: data.nodes,
          links: data.links.map((link: any) => ({
            ...link,
            source: link.source,
            target: link.target
          }))
        };
        
        setGraphData(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching graph data:', err);
        setError('Failed to load graph data. Make sure the server is running.');
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  useEffect(() => {
    // After the graph is rendered, zoom to fit the graph
    if (graphData && fgRef.current) {
      // Small delay to ensure the graph is properly initialized
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [graphData]);

  const handleNodeClick = (node: GraphNode) => {
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      // Center and zoom on the clicked node
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(2, 1000);
    }
  };

  // Calculate stats if we have graph data
  const stats = graphData ? {
    totalNodes: graphData.nodes.length,
    postNodes: graphData.nodes.filter(node => node.type === 'post').length,
    tagNodes: graphData.nodes.filter(node => node.type === 'tag').length,
    connections: graphData.links.length,
  } : null;

  return (
    <div className="w-full space-y-4 p-4 bg-background" ref={containerRef}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Knowledge Graph Visualization
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Explore the relationships between posts and tags in your knowledge base
              </CardDescription>
            </div>
            <Tabs 
              value={activeView} 
              onValueChange={(value) => setActiveView(value as 'graph' | 'stats')}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="graph" className="flex items-center gap-1">
                  <Network className="h-4 w-4" />
                  <span>Graph</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Stats</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TabsContent value="graph" className="m-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[600px] w-full">
                <Skeleton className="h-[400px] w-full rounded-md" />
                <p className="text-muted-foreground mt-4">Loading graph data...</p>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : !graphData || graphData.nodes.length === 0 ? (
              <Alert className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No graph data available. Try running the tagging cycle first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="relative">
                <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-sm">
                  <div className="text-sm font-medium mb-2">Legend</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm bg-blue-500"></div>
                      <span className="text-xs text-muted-foreground">Posts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm bg-green-500"></div>
                      <span className="text-xs text-muted-foreground">Tags</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-[1px] w-6 bg-gray-300"></div>
                      <span className="text-xs text-muted-foreground">HAS_TAG Relationship</span>
                    </div>
                  </div>
                </div>
                <div className="h-[600px] w-full">
                  <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    nodeLabel={(node: GraphNode) => 
                      node.type === 'post' 
                        ? `Post ${node.label}: ${node.text || '(No text available)'}`
                        : `Tag: ${node.label}`
                    }
                    nodeColor={(node: GraphNode) => 
                      node.type === 'post' 
                        ? '#3b82f6' // Blue for posts
                        : '#10b981' // Green for tags  
                    }
                    nodeRelSize={6}
                    linkLabel={(link: GraphLink) => link.label}
                    linkColor={() => '#94a3b8'} // Muted color for links
                    linkWidth={1.5}
                    linkDirectionalArrowLength={3}
                    linkDirectionalArrowRelPos={1}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={0.003}
                    backgroundColor="#ffffff"
                    onNodeClick={handleNodeClick}
                    nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                      const baseLabel = node.type === 'post' ? `Post ${node.label}` : node.label;
                      const fontSize = 12/globalScale;
                      ctx.font = `${fontSize}px sans-serif`;
                      const nodeColor = node.type === 'post' 
                        ? '#3b82f6' // Blue for posts
                        : '#10b981'; // Green for tags
                      const textColor = '#1e293b'; // Foreground color for text

                      // Draw the node shape (rectangle for posts, circle for tags)
                      ctx.fillStyle = nodeColor;
                      if (node.type === 'post') {
                        ctx.fillRect((node.x || 0) - 6, (node.y || 0) - 6, 12, 12);
                      } else {
                        ctx.beginPath();
                        ctx.arc(node.x || 0, node.y || 0, 6, 0, 2 * Math.PI);
                        ctx.fill();
                      }

                      // Draw the label (Post ID or Tag name) centered on the node
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = textColor;
                      ctx.fillText(baseLabel, node.x || 0, (node.y || 0) + 15 / globalScale);

                      // If it's a post and has text, draw truncated text below the node
                      if (node.type === 'post' && node.text) {
                        const postText = node.text;
                        const maxTextWidth = 100 / globalScale;
                        let truncatedText = postText;

                        // Truncate text if it's too long
                        if (ctx.measureText(postText).width > maxTextWidth) {
                          let width = 0;
                          let i = 0;
                          while (width < maxTextWidth && i < postText.length) {
                            width += ctx.measureText(postText[i]).width;
                            i++;
                          }
                          truncatedText = postText.substring(0, i) + '...';
                        }

                        ctx.font = `${fontSize * 0.8}px sans-serif`;
                        ctx.fillStyle = '#94a3b8'; // Muted foreground color for post text
                        ctx.fillText(truncatedText, node.x || 0, (node.y || 0) + 30 / globalScale);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stats" className="m-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[600px] w-full">
                <Skeleton className="h-[400px] w-full rounded-md" />
                <p className="text-muted-foreground mt-4">Loading graph data...</p>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : !stats ? (
              <Alert className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No graph data available. Try running the tagging cycle first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                <StatCard 
                  title="Total Nodes" 
                  value={stats.totalNodes} 
                  description="Total number of nodes in the graph"
                  icon={<Network className="h-5 w-5" />}
                  className="bg-blue-50"
                />
                <StatCard 
                  title="Posts" 
                  value={stats.postNodes} 
                  description="Number of post nodes"
                  icon={<FileText className="h-5 w-5" />}
                  className="bg-blue-50"
                />
                <StatCard 
                  title="Tags" 
                  value={stats.tagNodes} 
                  description="Number of tag nodes"
                  icon={<Tag className="h-5 w-5" />}
                  className="bg-green-50"
                />
                <StatCard 
                  title="Connections" 
                  value={stats.connections} 
                  description="Number of relationships"
                  icon={<Network className="h-5 w-5" />}
                  className="bg-gray-100"
                />
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Card>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon,
  className 
}) => {
  return (
    <Card>
      <CardContent className={cn("p-6", className)}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="p-2 rounded-full bg-white/80 border shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GraphView; 