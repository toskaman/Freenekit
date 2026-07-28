import React, { useEffect, useRef } from 'react';

export default function BandwidthChart({ historyData = [], maxMbit = 1000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    if (!historyData || historyData.length === 0) return;

    const paddingLeft = 10;
    const paddingRight = 55;
    const paddingTop = 16;
    const paddingBottom = 22;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Auto-scale dynamic max based on recent peaks for maximum reactivity
    const peakObserved = Math.max(
      ...historyData.map(d => Math.max(d.down || 0, d.up || 0)),
      1
    );

    let maxScale = 10;
    if (peakObserved > 8)    maxScale = Math.ceil(peakObserved * 1.3 / 5) * 5;
    if (peakObserved > 50)   maxScale = Math.ceil(peakObserved * 1.3 / 25) * 25;
    if (peakObserved > 200)  maxScale = Math.ceil(peakObserved * 1.3 / 100) * 100;
    if (peakObserved > 1000) maxScale = Math.ceil(peakObserved * 1.3 / 500) * 500;

    // Y Grid lines
    const ySteps = [0, Math.round(maxScale * 0.33), Math.round(maxScale * 0.66), maxScale];
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';

    ySteps.forEach((val, i) => {
      const y = paddingTop + chartHeight - (val / maxScale) * chartHeight;
      ctx.beginPath();
      ctx.setLineDash(i === ySteps.length - 1 ? [4, 4] : []);
      ctx.strokeStyle = i === ySteps.length - 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = i === ySteps.length - 1 ? '#3b82f6' : '#94a3b8';
      const label = val >= 1000 ? `${(val / 1000).toFixed(1)} Gb/s` : `${val} Mb/s`;
      ctx.fillText(label, paddingLeft + chartWidth + 6, y + 3);
    });

    const dataLen = historyData.length;
    const stepX = chartWidth / Math.max(1, dataLen - 1);

    const getX = (i) => paddingLeft + i * stepX;
    const getY = (val) => paddingTop + chartHeight - (Math.min(val || 0, maxScale) / maxScale) * chartHeight;

    // Draw Download Area (Blue Gradient)
    const downGradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartHeight);
    downGradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
    downGradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    ctx.beginPath();
    historyData.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.down);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(i - 1);
        const prevY = getY(historyData[i - 1].down);
        const cpX1 = prevX + (x - prevX) / 2;
        ctx.bezierCurveTo(cpX1, prevY, cpX1, y, x, y);
      }
    });
    ctx.lineTo(getX(dataLen - 1), paddingTop + chartHeight);
    ctx.lineTo(paddingLeft, paddingTop + chartHeight);
    ctx.closePath();
    ctx.fillStyle = downGradient;
    ctx.fill();

    // Draw Download Line (Blue)
    ctx.beginPath();
    historyData.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.down);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(i - 1);
        const prevY = getY(historyData[i - 1].down);
        const cpX1 = prevX + (x - prevX) / 2;
        ctx.bezierCurveTo(cpX1, prevY, cpX1, y, x, y);
      }
    });
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Upload Line (Green)
    ctx.beginPath();
    historyData.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.up);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(i - 1);
        const prevY = getY(historyData[i - 1].up);
        const cpX1 = prevX + (x - prevX) / 2;
        ctx.bezierCurveTo(cpX1, prevY, cpX1, y, x, y);
      }
    });
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Current value dots on last point
    if (dataLen > 0) {
      const last = historyData[dataLen - 1];
      const lx = getX(dataLen - 1);

      // Down dot
      const lyDown = getY(last.down);
      ctx.beginPath();
      ctx.arc(lx, lyDown, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Up dot
      const lyUp = getY(last.up);
      ctx.beginPath();
      ctx.arc(lx, lyUp, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Time Axis
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(dataLen / 5));
    historyData.forEach((pt, idx) => {
      if (idx % labelStep === 0 || idx === dataLen - 1) {
        ctx.fillText(pt.time, getX(idx), height - 4);
      }
    });
  }, [historyData, maxMbit]);

  const lastPt = historyData.length > 0 ? historyData[historyData.length - 1] : { down: 0, up: 0 };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Trafic réseau en temps réel</span>
          <span style={{ fontSize: 11, background: 'rgba(37,99,235,0.08)', color: '#2563eb', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
            Échelle réactive auto
          </span>
        </div>
        <div className="chart-legend" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="legend-color blue" style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Descendant : <strong>{(lastPt.down || 0).toFixed(1)} Mb/s</strong></span>
          </div>
          <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="legend-color green" style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Montant : <strong>{(lastPt.up || 0).toFixed(1)} Mb/s</strong></span>
          </div>
        </div>
      </div>
      <div className="canvas-wrapper" style={{ flex: 1, minHeight: 140, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
