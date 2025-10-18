import { useEffect, useRef } from "react";

const MindMapViewer = ({ data }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0 || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Simple tree layout
    const nodes = data.nodes.map((node, i) => ({
      ...node,
      x: width / 2,
      y: 100 + (node.level || 0) * 120,
      targetX: width / 2 + (i % 3 - 1) * 200,
      targetY: 100 + (node.level || 0) * 120,
    }));

    // Distribute nodes horizontally based on level
    const nodesByLevel = {};
    nodes.forEach((node) => {
      const level = node.level || 0;
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(node);
    });

    Object.keys(nodesByLevel).forEach((level) => {
      const levelNodes = nodesByLevel[level];
      const spacing = width / (levelNodes.length + 1);
      levelNodes.forEach((node, i) => {
        node.x = spacing * (i + 1);
        node.targetX = spacing * (i + 1);
      });
    });

    // Draw links
    if (data.links) {
      data.links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = "#94A3B8";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Draw nodes
    nodes.forEach((node) => {
      const level = node.level || 0;
      const color = level === 0 ? "#4F46E5" : "#818CF8";

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw label
      ctx.font = "14px Inter";
      ctx.fillStyle = "#1F2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const maxWidth = 180;
      const words = node.name.split(" ");
      let line = "";
      let y = node.y + 30;

      words.forEach((word) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== "") {
          ctx.fillText(line, node.x, y);
          line = word + " ";
          y += 18;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, node.x, y);
    });
  }, [data]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <p>No se pudo generar el mapa mental</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border border-gray-200 rounded-lg overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        className="w-full h-full"
      />
    </div>
  );
};

export default MindMapViewer;
