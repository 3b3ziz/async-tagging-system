import React, { useEffect, useState, useRef } from 'react';
// Use the dedicated 2D-only package
import ForceGraph2D from 'react-force-graph-2d';
import './GraphView.css';

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
  const fgRef = useRef<any>(null);

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

  if (loading) return <div className="loading">Loading graph data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!graphData || graphData.nodes.length === 0) 
    return <div className="no-data">No graph data available. Try running the tagging cycle first.</div>;

  return (
    <div className="graph-container">
      <h1>Tag Relationship Graph</h1>
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-color post-color"></span>
          <span>Posts</span>
        </div>
        <div className="legend-item">
          <span className="legend-color tag-color"></span>
          <span>Tags</span>
        </div>
        <div className="legend-item">
          <span className="legend-line"></span>
          <span>HAS_TAG Relationship</span>
        </div>
      </div>
      <div className="graph-view">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel={(node: GraphNode) => node.type === 'post' ? `Post ${node.label}: ${node.text || '(No text available)'}` : `Tag: ${node.label}`}
          nodeColor={(node: GraphNode) => node.type === 'post' ? '#e74c3c' : '#d5cba8'}
          nodeRelSize={8}
          linkLabel={(link: GraphLink) => link.label}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.003}
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const baseLabel = node.type === 'post' ? `Post ${node.label}` : node.label;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const nodeColor = node.type === 'post' ? '#e74c3c' : '#d5cba8';
            const textColor = '#000'; // Text color for labels

            // Draw the node shape (rectangle for posts, slightly different color for tags)
            ctx.fillStyle = nodeColor;
            ctx.fillRect((node.x || 0) - 7, (node.y || 0) - 7, 14, 14); // Fixed size square

            // Draw the label (Post ID or Tag name) centered on the node
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor;
            ctx.fillText(baseLabel, node.x || 0, node.y || 0);

            // If it's a post and has text, draw truncated text below the node
            if (node.type === 'post' && node.text) {
              const postText = node.text;
              const maxTextWidth = 100 / globalScale; // Max width for the text below node
              let truncatedText = postText;

              // Truncate text if it's too long
              if (ctx.measureText(postText).width > maxTextWidth) {
                // Basic truncation logic, could be improved
                let width = 0;
                let i = 0;
                while (width < maxTextWidth && i < postText.length) {
                  width += ctx.measureText(postText[i]).width;
                  i++;
                }
                truncatedText = postText.substring(0, i) + '...';
              }

              ctx.font = `${fontSize * 0.8}px Sans-Serif`; // Slightly smaller font for the text
              ctx.fillStyle = '#555'; // Different color for post text
              ctx.fillText(truncatedText, node.x || 0, (node.y || 0) + 15 / globalScale); // Position below the node
            }
          }}
        />
      </div>
    </div>
  );
};

export default GraphView; 