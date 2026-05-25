import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import api from '../lib/api';

interface GoodsNameWithPreviewProps {
  itemId: string;
  itemCode?: string;
  itemName: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  categoryName?: string;
  unit?: string;
  price?: number;
  stockQty?: number;
  disabledPreview?: boolean;
}

export const GoodsNameWithPreview: React.FC<GoodsNameWithPreviewProps> = ({
  itemId,
  itemCode,
  itemName,
  imageUrl,
  thumbnailUrl,
  categoryName,
  unit,
  stockQty,
  disabledPreview = false,
}) => {
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = async (e: React.MouseEvent) => {
    if (disabledPreview) return;
    
    // Set position relative to the hovered item
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });

    hoverTimer.current = setTimeout(async () => {
      setHovered(true);
      if (!previewData && itemId) {
        setLoading(true);
        try {
          const res = await api.get(`/items/${itemId}/preview`);
          setPreviewData(res.data);
        } catch (err) {
          console.error('Failed to load item preview:', err);
        } finally {
          setLoading(false);
        }
      }
    }, 250); // Delay 250ms to prevent accidental triggers
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }
    setHovered(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiBaseUrl = api.defaults.baseURL || 'http://localhost:3001/api';
    const host = apiBaseUrl.replace(/\/api$/, '');
    return `${host}${url}`;
  };

  const displayImg = previewData?.thumbnailUrl || previewData?.imageUrl || thumbnailUrl || imageUrl;
  const displayCode = previewData?.itemCode || itemCode;
  const displayCategory = previewData?.categoryName || categoryName;
  const displayUnit = previewData?.unit || unit;
  const displayStock = previewData ? previewData.stockQty : stockQty;

  return (
    <div 
      className="inline-flex items-center gap-1.5 relative cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Mini image icon next to name */}
      <span className="text-slate-400 group-hover:text-blue-500 transition duration-150 shrink-0">
        <ImageIcon className="w-3.5 h-3.5" />
      </span>
      
      <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition duration-150 leading-snug">
        {itemName}
      </span>

      {/* Popover Preview */}
      {hovered && !disabledPreview && (
        <div 
          className="fixed z-[9999] bg-white rounded-2xl p-3 shadow-2xl border border-slate-100 w-80 text-left pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px'
          }}
        >
          {/* Aspect 4:3 Image Container */}
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-50 border flex items-center justify-center relative">
            {loading ? (
              <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
            ) : displayImg ? (
              <img
                src={getImageUrl(displayImg)}
                alt={itemName}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Chưa có ảnh sản phẩm</div>
            )}
          </div>

          <div className="mt-3">
            <div className="font-bold text-slate-800 text-xs leading-normal uppercase">{itemName}</div>
            <div className="mt-1.5 grid grid-cols-2 gap-y-1 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              <div>Mã: <span className="text-slate-600 font-bold">{displayCode || "-"}</span></div>
              <div>ĐVT: <span className="text-slate-600 font-bold">{displayUnit || "-"}</span></div>
              <div className="col-span-2">Phân loại: <span className="text-slate-600 font-bold">{displayCategory || "-"}</span></div>
              {typeof displayStock !== 'undefined' && (
                <div className="col-span-2 mt-2 text-blue-600 font-bold text-[10px] bg-blue-50 py-0.5 px-2 rounded-md border border-blue-100 inline-block w-fit">
                  Tồn kho: {displayStock} {displayUnit || ""}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
