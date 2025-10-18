import { useEffect, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";

const MindMapViewer = ({ data }) => {
  const graphRef = useRef();

  useEffect(() => {
    if (graphRef.current) {
      // Fit view
      graphRef.current.zoomToFit(400);
    }
  }, [data]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <p>No se pudo generar el mapa mental</p>
      </div>
    );
  }

  // Transform data for react-force-graph
  const graphData = {
    nodes: data.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      level: node.level || 0,
    })),
    links: data.links || [],
  };

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="level"
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 14 / globalScale;
          ctx.font = `${fontSize}px Inter`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.4);

          // Draw node background
          ctx.fillStyle = node.level === 0 ? "#4F46E5" : "#818CF8";
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
          ctx.fill();

          // Draw label background
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y + 12,
            bckgDimensions[0],
            bckgDimensions[1]
          );

          // Draw label text
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#1F2937";
          ctx.fillText(label, node.x, node.y + 12 + bckgDimensions[1] / 2);
        }}
        linkColor={() => "#94A3B8"}
        linkWidth={2}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        cooldownTicks={100}
        onEngineStop={() => graphRef.current && graphRef.current.zoomToFit(400)}
      />
    </div>
  );
};

export default MindMapViewer;
