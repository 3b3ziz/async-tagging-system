declare module 'react-force-graph' {
  import React from 'react';
  
  interface ForceGraphProps {
    graphData: {
      nodes: any[];
      links: any[];
    };
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeRelSize?: number;
    linkLabel?: string | ((link: any) => string);
    linkDirectionalArrowLength?: number;
    linkDirectionalArrowRelPos?: number;
    linkDirectionalParticles?: number;
    linkDirectionalParticleSpeed?: number | ((link: any) => number);
    onNodeClick?: (node: any, event: MouseEvent) => void;
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    width?: number;
    height?: number;
    backgroundColor?: string;
    linkWidth?: number | ((link: any) => number);
    linkColor?: string | ((link: any) => string);
    nodeVal?: number | ((node: any) => number);
    warmupTicks?: number;
    cooldownTicks?: number;
    cooldownTime?: number;
    zoomToFit?: (ms: number, padding: number) => void;
    centerAt?: (x: number, y: number, ms: number) => void;
    zoom?: (zoomLevel: number, ms: number) => void;
  }
  
  export class ForceGraph2D extends React.Component<ForceGraphProps> {
    zoomToFit: (ms: number, padding: number) => void;
    centerAt: (x: number, y: number, ms: number) => void;
    zoom: (zoomLevel: number, ms: number) => void;
  }
  
  export class ForceGraph3D extends React.Component<ForceGraphProps> {
    zoomToFit: (ms: number, padding: number) => void;
    centerAt: (x: number, y: number, z: number, ms: number) => void;
    zoom: (zoomLevel: number, ms: number) => void;
  }
} 